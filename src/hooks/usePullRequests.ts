import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParamBool } from "./useSearchParams";
import type { ClassifiedPR, ColumnId } from "../types";
import {
  createOctokit,
  fetchOpenPRs,
  fetchAllReviews,
  fetchRequiredChecks,
  fetchAllCheckStatuses,
  fetchHeadCommitDates,
  fetchRecentClosedPRs,
  fetchPRDetails,
  fetchOrgMembers,
  fetchAllIssueComments,
} from "../lib/github";
import type { PRDetails } from "../lib/github";
import { classifyPR } from "../lib/classify";
import { REFRESH_INTERVAL_MS } from "../constants";
import {
  getCachedAuthorStats,
  setCachedAuthorStats,
  getCachedPRDetails,
  setCachedPRDetails,
  getCachedOrgMembers,
  setCachedOrgMembers,
} from "../lib/mergeCache";
import { calculateMergeScore } from "../lib/mergeScore";

const COLUMN_ORDER: ColumnId[] = ["wip", "ready", "ai-approved", "in-review", "approved"];

export function usePullRequests(token: string | null) {
  const [prs, setPrs] = useState<ClassifiedPR[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortByScore, setSortByScore] = useSearchParamBool("sort");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || refreshingRef.current) return;
    refreshingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const octokit = createOctokit(token);
      const rawPRs = await fetchOpenPRs(octokit);
      const prHeads = rawPRs.map((p) => ({ number: p.number, headSha: p.head.sha }));
      const prNumbers = rawPRs.map((p) => p.number);
      const [reviewMap, requiredChecks, headCommitDates, commentMap] = await Promise.all([
        fetchAllReviews(octokit, prNumbers),
        fetchRequiredChecks(octokit),
        fetchHeadCommitDates(octokit, prHeads),
        fetchAllIssueComments(octokit, prNumbers),
      ]);
      const ciMap = await fetchAllCheckStatuses(
        octokit,
        prHeads,
        requiredChecks,
      );
      const classified = rawPRs.map((pr) => {
        const ci = ciMap.get(pr.number);
        return classifyPR(pr, reviewMap.get(pr.number) ?? [], ci?.status ?? "success", ci?.checks ?? [], headCommitDates.get(pr.number), commentMap.get(pr.number) ?? []);
      });

      // Fetch author merge stats + org members (both cached 30 min)
      const cachedStats = getCachedAuthorStats();
      const cachedMembers = getCachedOrgMembers();

      const [authorStats, orgMembers] = await Promise.all([
        cachedStats ?? fetchRecentClosedPRs(octokit),
        cachedMembers ?? fetchOrgMembers(octokit),
      ]);
      if (!cachedStats) setCachedAuthorStats(authorStats);
      if (!cachedMembers) setCachedOrgMembers(orgMembers);

      // Fetch PR details (cached indefinitely per PR)
      const cachedDetails = getCachedPRDetails();
      const openNumbers = rawPRs.map((p) => p.number);
      const uncachedNumbers = openNumbers.filter((n) => !cachedDetails.has(n));

      let allDetails: Map<number, PRDetails>;
      if (uncachedNumbers.length > 0) {
        const freshDetails = await fetchPRDetails(octokit, uncachedNumbers);
        allDetails = new Map([...cachedDetails, ...freshDetails]);
      } else {
        allDetails = cachedDetails;
      }
      setCachedPRDetails(allDetails, openNumbers);

      // Attach merge scores
      const scored = classified.map((pr) => {
        const breakdown = calculateMergeScore(
          pr,
          authorStats.get(pr.author.login),
          allDetails.get(pr.number),
          orgMembers.has(pr.author.login),
        );
        const details = allDetails.get(pr.number);
        return {
          ...pr,
          additions: details?.additions,
          deletions: details?.deletions,
          mergeScore: breakdown.score,
          mergeScoreBreakdown: breakdown,
        };
      });

      setPrs(scored);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch PRs");
    } finally {
      refreshingRef.current = false;
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refresh();
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [token, refresh]);

  const columns = useMemo(
    () => COLUMN_ORDER.map((id) => ({
      id,
      prs: prs
        .filter((pr) => pr.column === id)
        .sort((a, b) =>
          sortByScore
            ? (b.mergeScore ?? 0) - (a.mergeScore ?? 0)
            : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    })),
    [prs, sortByScore],
  );

  const authors = useMemo(() => [...new Set(prs.map((pr) => pr.author.login))].sort(), [prs]);
  const allLabels = useMemo(
    () => [...new Set(prs.flatMap((pr) => pr.labels.map((l) => l.name)))].sort(),
    [prs],
  );
  const assignees = useMemo(
    () => [...new Set(prs.flatMap((pr) => pr.reviewers.map((r) => r.login)))].sort(),
    [prs],
  );

  return { columns, authors, allLabels, assignees, loading, error, lastUpdated, refresh, sortByScore, setSortByScore };
}
