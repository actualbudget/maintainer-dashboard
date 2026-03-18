import { useMemo } from "react";
import type { ClassifiedPR, ReviewerState } from "../types";
import PRCard from "./PRCard";

type QueueTier = "needs-re-review" | "awaiting-review" | "approved";

interface TierConfig {
  id: QueueTier;
  label: string;
  badgeClass: string;
  matchStates: ReviewerState[];
}

const TIERS: TierConfig[] = [
  {
    id: "needs-re-review",
    label: "Needs re-review",
    badgeClass: "bg-red-500/15 text-red-400",
    matchStates: ["changes_requested"],
  },
  {
    id: "awaiting-review",
    label: "Awaiting my review",
    badgeClass: "bg-yellow-500/15 text-yellow-400",
    matchStates: ["pending", "commented"],
  },
  {
    id: "approved",
    label: "Approved",
    badgeClass: "bg-green-500/15 text-green-400",
    matchStates: ["approved"],
  },
];

interface MyQueueProps {
  prs: ClassifiedPR[];
  currentUser: string;
  sortByScore: boolean;
}

function getUserReviewState(pr: ClassifiedPR, currentUser: string): ReviewerState | null {
  const reviewer = pr.reviewers.find((r) => r.login === currentUser);
  if (!reviewer) return null;

  // If the reviewer requested changes but the author hasn't pushed new
  // commits since, the ball is in the author's court — hide from queue.
  if (reviewer.state === "changes_requested" && reviewer.lastReviewedAt && pr.headCommitDate) {
    const reviewDate = new Date(reviewer.lastReviewedAt).getTime();
    const commitDate = new Date(pr.headCommitDate).getTime();
    if (commitDate <= reviewDate) {
      return null;
    }
  }

  return reviewer.state;
}

export default function MyQueue({ prs, currentUser, sortByScore }: MyQueueProps) {
  const grouped = useMemo(() => {
    const myPrs = prs.filter((pr) =>
      pr.reviewers.some((r) => r.login === currentUser),
    );

    const sorter = (a: ClassifiedPR, b: ClassifiedPR) => {
      if (sortByScore) {
        return (b.mergeScore ?? 0) - (a.mergeScore ?? 0);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    };

    return TIERS.map((tier) => {
      const items = myPrs
        .filter((pr) => {
          const state = getUserReviewState(pr, currentUser);
          return state != null && tier.matchStates.includes(state);
        })
        .sort(sorter);
      return { ...tier, items };
    });
  }, [prs, currentUser, sortByScore]);

  const totalCount = grouped.reduce((sum, t) => sum + t.items.length, 0);

  if (totalCount === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-text-secondary">No PRs in your queue</p>
          <p className="mt-1 text-xs text-text-tertiary">
            PRs assigned to you for review will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {grouped.map((tier) => {
          if (tier.items.length === 0) return null;
          return (
            <div key={tier.id}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tier.badgeClass}`}
                >
                  {tier.label}
                </span>
                <span className="text-[11px] text-text-tertiary">
                  {tier.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {tier.items.map((pr, i) => (
                  <PRCard key={pr.number} pr={pr} index={i} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
