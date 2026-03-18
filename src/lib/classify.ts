import type { CIStatus, CheckRun, ClassifiedPR, ColumnId, CodeRabbitStatus, PRLabel, Reviewer, ReviewerState } from "../types";
import type { RawPR, RawReview } from "./github";
import { LABEL_APPROVED, LABEL_READY, LABEL_WIP } from "../constants";

const HIDDEN_LABELS = new Set([LABEL_APPROVED, LABEL_READY, LABEL_WIP, "AI generated"]);

function isHumanReview(r: RawReview): boolean {
  return !!r.user && !r.user.login.toLowerCase().includes("coderabbitai");
}

function getLabels(pr: RawPR): PRLabel[] {
  return pr.labels
    .filter((l): l is { name: string; color: string } => !!l.name && !!l.color && !HIDDEN_LABELS.has(l.name))
    .map((l) => ({ name: l.name, color: l.color }));
}

function hasLabel(pr: RawPR, label: string): boolean {
  return pr.labels.some((l) => l.name === label);
}

function getCodeRabbitStatus(reviews: RawReview[]): CodeRabbitStatus {
  const botReviews = reviews.filter((r) =>
    r.user?.login.toLowerCase().includes("coderabbitai"),
  );
  if (botReviews.length === 0) return "none";
  const latest = botReviews[botReviews.length - 1];
  if (latest.state === "APPROVED") return "approved";
  return "changes_requested";
}

function classifyColumn(
  pr: RawPR,
  reviews: RawReview[],
): ColumnId {
  const humanReviews = reviews.filter(isHumanReview);

  // 1. Approved
  if (hasLabel(pr, LABEL_APPROVED)) return "approved";
  if (humanReviews.some((r) => r.state === "APPROVED")) return "approved";

  // 2. Changes requested → in-review
  if (humanReviews.some((r) => r.state === "CHANGES_REQUESTED")) return "in-review";

  // 3. Ready / AI Approved / In Review (requires 🔍 ready for review label)
  if (hasLabel(pr, LABEL_READY) && !pr.draft) {
    const hasAssignees = (pr.assignees?.length ?? 0) > 0;
    if (hasAssignees) return "in-review";

    const codeRabbit = getCodeRabbitStatus(reviews);
    if (codeRabbit === "approved") return "ai-approved";

    return "ready";
  }

  // 4. Everything else is WIP
  return "wip";
}

function buildReviewers(pr: RawPR, reviews: RawReview[]): Reviewer[] {
  const humanReviews = reviews.filter(isHumanReview);

  // Last decisive review state per user.
  // COMMENTED does not override a prior APPROVED or CHANGES_REQUESTED,
  // since follow-up comments don't change the reviewer's decision.
  const reviewStateByLogin = new Map<string, ReviewerState>();
  const reviewDateByLogin = new Map<string, string>();
  for (const r of humanReviews) {
    const state: ReviewerState =
      r.state === "APPROVED" ? "approved" :
      r.state === "CHANGES_REQUESTED" ? "changes_requested" :
      "commented";
    const existing = reviewStateByLogin.get(r.user!.login);
    if (state === "commented" && (existing === "approved" || existing === "changes_requested")) {
      continue;
    }
    reviewStateByLogin.set(r.user!.login, state);
    if (r.submitted_at) {
      reviewDateByLogin.set(r.user!.login, r.submitted_at);
    }
  }

  // Show assignees, colored by their review state (pending if no review)
  return (pr.assignees ?? []).map((a) => ({
    login: a.login,
    avatarUrl: a.avatar_url,
    state: reviewStateByLogin.get(a.login) ?? "pending",
    lastReviewedAt: reviewDateByLogin.get(a.login),
  }));
}

export function classifyPR(pr: RawPR, reviews: RawReview[], ciStatus: CIStatus = "success", ciChecks: CheckRun[] = [], headCommitDate?: string): ClassifiedPR {
  const humanReviews = reviews.filter(isHumanReview);

  return {
    number: pr.number,
    title: pr.title,
    url: pr.html_url,
    draft: pr.draft,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    author: {
      login: pr.user?.login ?? "ghost",
      avatarUrl: pr.user?.avatar_url ?? "",
    },
    labels: getLabels(pr),
    reviewers: buildReviewers(pr, reviews),
    humanReviewCount: humanReviews.length,
    isAI: pr.labels.some((l) => l.name?.toLowerCase() === "ai generated") || pr.title.startsWith("[AI]"),
    codeRabbitStatus: getCodeRabbitStatus(reviews),
    ciStatus,
    ciChecks,
    headCommitDate,
    column: classifyColumn(pr, reviews),
  };
}
