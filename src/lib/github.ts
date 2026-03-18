import { Octokit } from "@octokit/rest";
import type { CIStatus, CheckRun, TimelineEvent } from "../types";
import {
  REPO_OWNER,
  REPO_NAME,
  CONCURRENT_REVIEW_FETCHES,
  CLOSED_PR_PAGES,
} from "../constants";
import { mapWithConcurrency } from "./concurrency";

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export interface RawPR {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  labels: Array<{ name?: string; color?: string }>;
  requested_reviewers?: Array<{ login: string; avatar_url: string }>;
  assignees?: Array<{ login: string; avatar_url: string }>;
  head: { sha: string };
}

export interface RawReview {
  user: { login: string; avatar_url: string } | null;
  state: string;
  submitted_at?: string;
}

export interface PRDetails {
  number: number;
  additions: number;
  deletions: number;
}

export interface AuthorMergeStats {
  mergeRate: number;
  medianMergeHours: number;
  sampleSize: number;
}

export async function fetchOpenPRs(octokit: Octokit): Promise<RawPR[]> {
  const prs: RawPR[] = [];
  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.list,
    {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      state: "open",
      per_page: 100,
    },
  )) {
    prs.push(...(response.data as RawPR[]));
  }
  return prs;
}

async function fetchReviewsForPR(
  octokit: Octokit,
  prNumber: number,
): Promise<RawReview[]> {
  const reviews: RawReview[] = [];
  for await (const response of octokit.paginate.iterator(
    octokit.rest.pulls.listReviews,
    {
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: prNumber,
      per_page: 100,
    },
  )) {
    reviews.push(...(response.data as RawReview[]));
  }
  return reviews;
}

/** Fetch reviews for multiple PRs with bounded concurrency. */
export async function fetchAllReviews(
  octokit: Octokit,
  prNumbers: number[],
): Promise<Map<number, RawReview[]>> {
  const results = await mapWithConcurrency(
    prNumbers,
    CONCURRENT_REVIEW_FETCHES,
    (num) => fetchReviewsForPR(octokit, num),
  );
  return new Map(prNumbers.map((num, i) => [num, results[i]]));
}

/** Fetch the committer date of the head commit for each PR. */
export async function fetchHeadCommitDates(
  octokit: Octokit,
  prs: Array<{ number: number; headSha: string }>,
): Promise<Map<number, string>> {
  const results = await mapWithConcurrency(
    prs,
    CONCURRENT_REVIEW_FETCHES,
    async (pr) => {
      try {
        const { data } = await octokit.rest.git.getCommit({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          commit_sha: pr.headSha,
        });
        return { number: pr.number, date: data.committer.date };
      } catch {
        return { number: pr.number, date: undefined };
      }
    },
  );
  const map = new Map<number, string>();
  for (const r of results) {
    if (r.date) map.set(r.number, r.date);
  }
  return map;
}

export interface IssueComment {
  user: { login: string } | null;
  created_at: string;
}

/** Fetch issue comments for multiple PRs with bounded concurrency. */
export async function fetchAllIssueComments(
  octokit: Octokit,
  prNumbers: number[],
): Promise<Map<number, IssueComment[]>> {
  const results = await mapWithConcurrency(
    prNumbers,
    CONCURRENT_REVIEW_FETCHES,
    async (num) => {
      const comments: IssueComment[] = [];
      for await (const response of octokit.paginate.iterator(
        octokit.rest.issues.listComments,
        {
          owner: REPO_OWNER,
          repo: REPO_NAME,
          issue_number: num,
          per_page: 100,
        },
      )) {
        comments.push(
          ...response.data.map((c) => ({
            user: c.user ? { login: c.user.login } : null,
            created_at: c.created_at,
          })),
        );
      }
      return comments;
    },
  );
  return new Map(prNumbers.map((num, i) => [num, results[i]]));
}

export async function fetchRecentClosedPRs(
  octokit: Octokit,
): Promise<Map<string, AuthorMergeStats>> {
  const pages = await Promise.all(
    Array.from({ length: CLOSED_PR_PAGES }, (_, i) =>
      octokit.rest.pulls.list({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        state: "closed",
        sort: "updated",
        direction: "desc",
        per_page: 100,
        page: i + 1,
      }),
    ),
  );
  const closedPRs = pages.flatMap(({ data }) =>
    data.map((pr) => ({
      number: pr.number,
      user: pr.user ? { login: pr.user.login } : null,
      merged_at: pr.merged_at,
      created_at: pr.created_at,
    })),
  );

  // For non-merged closed PRs, fetch who closed them so we can exclude
  // author-closed PRs (superseded, rebased, abandoned by author).
  const unmergedPRs = closedPRs.filter((pr) => pr.merged_at === null && pr.user);
  const authorClosedSet = new Set<number>();

  const closerResults = await mapWithConcurrency(
    unmergedPRs,
    CONCURRENT_REVIEW_FETCHES,
    async (pr) => {
      try {
        const { data: events } = await octokit.rest.issues.listEvents({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          issue_number: pr.number,
        });
        const closeEvent = [...events].reverse().find((e) => e.event === "closed");
        return closeEvent?.actor?.login === pr.user!.login;
      } catch {
        return true; // If we can't determine, exclude to be safe
      }
    },
  );
  for (let i = 0; i < unmergedPRs.length; i++) {
    if (closerResults[i]) authorClosedSet.add(unmergedPRs[i].number);
  }

  // Filter out author-closed PRs, keep merged + maintainer-closed
  const relevantPRs = closedPRs.filter(
    (pr) => !authorClosedSet.has(pr.number),
  );

  const byAuthor = new Map<
    string,
    { merged: number; total: number; mergeHours: number[] }
  >();

  for (const pr of relevantPRs) {
    const login = pr.user?.login;
    if (!login) continue;
    if (!byAuthor.has(login)) {
      byAuthor.set(login, { merged: 0, total: 0, mergeHours: [] });
    }
    const stats = byAuthor.get(login)!;
    stats.total++;
    if (pr.merged_at) {
      stats.merged++;
      const hours =
        (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) /
        (1000 * 60 * 60);
      stats.mergeHours.push(hours);
    }
  }

  const result = new Map<string, AuthorMergeStats>();
  for (const [login, stats] of byAuthor) {
    const sorted = [...stats.mergeHours].sort((a, b) => a - b);
    const median =
      sorted.length > 0
        ? sorted[Math.floor(sorted.length / 2)]
        : 0;
    result.set(login, {
      mergeRate: stats.total > 0 ? stats.merged / stats.total : 0,
      medianMergeHours: median,
      sampleSize: stats.total,
    });
  }
  return result;
}

export async function fetchPRDetails(
  octokit: Octokit,
  prNumbers: number[],
): Promise<Map<number, PRDetails>> {
  const results = await mapWithConcurrency(
    prNumbers,
    CONCURRENT_REVIEW_FETCHES,
    async (num) => {
      const { data } = await octokit.rest.pulls.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: num,
      });
      return { number: num, additions: data.additions, deletions: data.deletions };
    },
  );
  return new Map(results.map((d) => [d.number, d]));
}

/** Fetch org member logins. Returns empty set if inaccessible (e.g. insufficient permissions). */
export async function fetchOrgMembers(octokit: Octokit): Promise<Set<string>> {
  try {
    const members: string[] = [];
    for await (const response of octokit.paginate.iterator(
      octokit.rest.orgs.listMembers,
      { org: REPO_OWNER, per_page: 100 },
    )) {
      members.push(...response.data.map((m) => m.login));
    }
    return new Set(members);
  } catch {
    return new Set();
  }
}

/** Fetch account creation dates for a list of unique author logins. */
export async function fetchAuthorCreatedDates(
  octokit: Octokit,
  logins: string[],
): Promise<Map<string, string>> {
  const results = await mapWithConcurrency(
    logins,
    CONCURRENT_REVIEW_FETCHES,
    async (login) => {
      try {
        const { data } = await octokit.rest.users.getByUsername({ username: login });
        return { login, createdAt: data.created_at };
      } catch {
        return { login, createdAt: undefined };
      }
    },
  );
  const map = new Map<string, string>();
  for (const r of results) {
    if (r.createdAt) map.set(r.login, r.createdAt);
  }
  return map;
}

/** Fetch required check context names from branch protection. Returns null if inaccessible. */
export async function fetchRequiredChecks(
  octokit: Octokit,
): Promise<Set<string> | null> {
  try {
    const { data } = await octokit.rest.repos.getBranchProtection({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      branch: "master",
    });
    const contexts =
      data.required_status_checks?.contexts ?? [];
    return new Set(contexts);
  } catch {
    return null;
  }
}

/** Fetch CI check statuses for multiple PRs with bounded concurrency. */
export async function fetchAllCheckStatuses(
  octokit: Octokit,
  prs: Array<{ number: number; headSha: string }>,
  requiredChecks: Set<string> | null,
): Promise<Map<number, { status: CIStatus; checks: CheckRun[] }>> {
  const results = await mapWithConcurrency(
    prs,
    CONCURRENT_REVIEW_FETCHES,
    async (pr) => {
      try {
        const { data } = await octokit.rest.checks.listForRef({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          ref: pr.headSha,
        });

        let runs = data.check_runs;
        if (requiredChecks !== null && requiredChecks.size > 0) {
          runs = runs.filter((r) => requiredChecks.has(r.name));
        }

        const checks: CheckRun[] = runs.map((r) => ({
          name: r.name,
          status: r.status as CheckRun["status"],
          conclusion: r.conclusion ?? null,
          detailsUrl: r.html_url ?? r.details_url ?? null,
        }));

        let status: CIStatus = "success";
        for (const run of runs) {
          if (
            run.conclusion === "failure" ||
            run.conclusion === "timed_out" ||
            run.conclusion === "cancelled"
          ) {
            status = "failure";
            break;
          }
          if (run.status !== "completed") {
            status = "pending";
          }
        }
        return { number: pr.number, status, checks };
      } catch {
        return { number: pr.number, status: "success" as CIStatus, checks: [] as CheckRun[] };
      }
    },
  );
  return new Map(results.map((r) => [r.number, { status: r.status, checks: r.checks }]));
}

const TIMELINE_EVENT_TYPES: Record<string, TimelineEvent["type"]> = {
  commented: "commented",
  reviewed: "reviewed",
  committed: "committed",
  head_ref_force_pushed: "committed",
  labeled: "labeled",
  assigned: "assigned",
  closed: "closed",
  reopened: "reopened",
};

/** Fetch last 5 timeline events for a PR. */
export async function fetchTimelineEvents(
  octokit: Octokit,
  prNumber: number,
): Promise<TimelineEvent[]> {
  // First request to discover pagination info
  const firstResponse = await octokit.rest.issues.listEventsForTimeline({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: prNumber,
    per_page: 100,
  });

  // Parse last page from Link header — fetch that page to get newest events
  let data = firstResponse.data;
  const linkHeader = firstResponse.headers.link ?? "";
  const lastPageMatch = linkHeader.match(/[&?]page=(\d+)>;\s*rel="last"/);
  if (lastPageMatch) {
    const lastPage = parseInt(lastPageMatch[1], 10);
    const lastResponse = await octokit.rest.issues.listEventsForTimeline({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: prNumber,
      per_page: 100,
      page: lastPage,
    });
    data = lastResponse.data;
  }

  const events: TimelineEvent[] = [];
  for (const event of data) {
    const e = event as Record<string, unknown>;
    const eventType = e.event as string | undefined;
    const mapped = eventType ? TIMELINE_EVENT_TYPES[eventType] : undefined;
    if (!mapped) continue;

    const actor = (e.actor as { login?: string; avatar_url?: string }) ??
      (e.user as { login?: string; avatar_url?: string }) ??
      (e.author as { login?: string; avatar_url?: string }) ??
      (e.committer as { login?: string; avatar_url?: string }) ?? {};

    let detail = "";
    if (mapped === "commented") {
      const body = (e.body as string) ?? "";
      detail = body.length > 80 ? body.slice(0, 80) + "..." : body;
    } else if (mapped === "reviewed") {
      const state = (e.state as string) ?? "";
      detail = state.toLowerCase().replace("_", " ");
    } else if (mapped === "committed") {
      const message = (e.message as string) ?? (eventType === "head_ref_force_pushed" ? "force pushed" : "");
      detail = message.length > 80 ? message.slice(0, 80) + "..." : message;
    } else if (mapped === "labeled") {
      const label = e.label as { name?: string } | undefined;
      detail = label?.name ?? "";
    } else if (mapped === "assigned") {
      const assignee = e.assignee as { login?: string } | undefined;
      detail = assignee?.login ?? "";
    }

    events.push({
      type: mapped,
      actor: actor.login ?? "ghost",
      actorAvatarUrl: actor.avatar_url,
      createdAt: (e.created_at as string)
        ?? (e.submitted_at as string)
        ?? (e.committer as { date?: string } | undefined)?.date
        ?? new Date().toISOString(),
      detail,
    });
  }

  events.reverse();

  // Collapse consecutive commits into a single entry so they don't flood out
  // comments and reviews
  const collapsed: TimelineEvent[] = [];
  for (const ev of events) {
    const prev = collapsed[collapsed.length - 1];
    if (
      ev.type === "committed" &&
      prev?.type === "committed" &&
      prev.actor === ev.actor
    ) {
      const match = prev.detail.match(/^(\d+) commits?$/);
      const count = match ? parseInt(match[1], 10) + 1 : 2;
      prev.detail = `${count} commits`;
      // Keep the most recent timestamp
      if (new Date(ev.createdAt) > new Date(prev.createdAt)) {
        prev.createdAt = ev.createdAt;
      }
      continue;
    }
    collapsed.push({ ...ev });
  }

  return collapsed.slice(0, 10);
}
