import type { ClassifiedPR, MergeScoreBreakdown } from "../types";
import type { AuthorMergeStats, PRDetails } from "./github";

const COLUMN_SCORES: Record<string, number> = {
  approved: 100,
  "in-review": 50,
  "ai-approved": 40,
  ready: 30,
  wip: 10,
};

export function calculateMergeScore(
  pr: ClassifiedPR,
  authorStats: AuthorMergeStats | undefined,
  prDetails: PRDetails | undefined,
  isOrgMember: boolean,
): MergeScoreBreakdown {
  // Author merge rate (35%) — Bayesian: blend toward 50% prior for small samples.
  const PRIOR = 0.5;
  const PRIOR_WEIGHT = 5;
  let authorRate: number;
  if (authorStats) {
    const adjusted =
      (authorStats.mergeRate * authorStats.sampleSize + PRIOR * PRIOR_WEIGHT) /
      (authorStats.sampleSize + PRIOR_WEIGHT);
    authorRate = adjusted * 100;
  } else {
    authorRate = 50;
  }
  const authorScore = authorRate * 0.35;

  // PR size (35%)
  let sizeScore: number;
  if (prDetails) {
    const totalLines = prDetails.additions + prDetails.deletions;
    sizeScore = 100 / (1 + Math.pow(totalLines / 200, 1.5));
  } else {
    sizeScore = 50;
  }
  const sizeComponent = sizeScore * 0.35;

  // Review progress (30%)
  let reviewScore = COLUMN_SCORES[pr.column] ?? 30;

  if (pr.column === "in-review") {
    const hasApproval = pr.reviewers.some((r) => r.state === "approved");
    if (hasApproval) reviewScore = 70;
  }

  if (pr.humanReviewCount > 0) reviewScore = Math.min(100, reviewScore + 10);

  const hasChangesRequested = pr.reviewers.some(
    (r) => r.state === "changes_requested",
  );
  if (hasChangesRequested) reviewScore = Math.max(0, reviewScore - 15);

  const reviewComponent = reviewScore * 0.3;

  const orgBonus = isOrgMember ? 15 : 0;

  const rawTotal = Math.min(100, authorScore + sizeComponent + reviewComponent + orgBonus);

  const normalized = rawTotal / 100;
  const spread = normalized < 0.5
    ? 0.5 * Math.pow(2 * normalized, 1.6)
    : 1 - 0.5 * Math.pow(2 * (1 - normalized), 1.6);

  const score = Math.round(Math.min(100, Math.max(0, spread * 100)));

  return {
    score,
    authorRate: Math.round(authorRate),
    sizeScore: Math.round(sizeScore),
    reviewScore: Math.round(reviewScore),
    orgBonus,
    rawTotal: Math.round(rawTotal),
  };
}
