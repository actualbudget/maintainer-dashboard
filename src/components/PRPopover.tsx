import type { ClassifiedPR, CheckRun, TimelineEvent } from "../types";
import { timeAgo } from "../lib/format";
import { scoreColors } from "../lib/scoreColors";

function eventTypeLabel(type: TimelineEvent["type"]): string {
  switch (type) {
    case "commented": return "commented";
    case "reviewed": return "reviewed";
    case "committed": return "pushed";
    case "assigned": return "assigned";
    case "labeled": return "labeled";
    case "closed": return "closed";
    case "reopened": return "reopened";
    default: return type;
  }
}

function eventTypeColor(type: TimelineEvent["type"]): string {
  switch (type) {
    case "commented": return "text-blue-400";
    case "reviewed": return "text-violet-400";
    case "committed": return "text-emerald-400";
    case "closed": return "text-red-400";
    case "reopened": return "text-green-400";
    default: return "text-text-tertiary";
  }
}

function isPassing(check: CheckRun): boolean {
  return check.status === "completed" && (check.conclusion === "success" || check.conclusion === "neutral" || check.conclusion === "skipped");
}

function checkDot(check: CheckRun): string {
  if (check.status !== "completed") return "bg-yellow-400";
  if (isPassing(check)) return "bg-green-400";
  return "bg-red-400";
}

function checkSortKey(check: CheckRun): number {
  if (check.status !== "completed") return 1;
  if (check.conclusion === "failure" || check.conclusion === "timed_out" || check.conclusion === "cancelled") return 0;
  return 2;
}

interface PRPopoverProps {
  pr: ClassifiedPR;
  events: TimelineEvent[] | null;
  eventsLoading: boolean;
}

function sizeTag(additions: number, deletions: number): string {
  const total = additions + deletions;
  if (total >= 500) return "XL";
  if (total >= 200) return "L";
  if (total >= 50) return "M";
  return "S";
}

export default function PRPopover({ pr, events, eventsLoading }: PRPopoverProps) {
  const checks = pr.ciChecks ?? [];
  const sortedChecks = [...checks].sort((a, b) => checkSortKey(a) - checkSortKey(b));
  const allPassing = checks.length > 0 && checks.every(isPassing);
  const breakdown = pr.mergeScoreBreakdown;
  const finalScoreColors = breakdown ? scoreColors(breakdown.score) : null;

  return (
    <div className="w-80 max-h-[inherit] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface-1 text-xs shadow-2xl">
      {/* Section 0: PR Size */}
      {pr.additions != null && pr.deletions != null && (
        <div className="flex items-center gap-2 border-b border-border p-3 text-xs">
          <span className="rounded bg-surface-4/60 px-1.5 py-0.5 text-[10px] font-semibold text-text-tertiary">{sizeTag(pr.additions, pr.deletions)}</span>
          <span className="text-green-400/70">+{pr.additions}</span>
          <span className="text-red-400/70">−{pr.deletions}</span>
          <span className="text-text-tertiary">lines changed</span>
        </div>
      )}

      {/* Section 1: Recent Activity */}
      <div className="p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Recent Activity</div>
        {eventsLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded-full bg-surface-3" />
                <div className="h-3 flex-1 animate-pulse rounded bg-surface-3" />
              </div>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-1.5">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-2">
                {event.actorAvatarUrl ? (
                  <img src={event.actorAvatarUrl} alt={event.actor} className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                ) : (
                  <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-surface-3" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-text-primary">{event.actor}</span>{" "}
                  <span className={eventTypeColor(event.type)}>{eventTypeLabel(event.type)}</span>
                  {event.detail && (
                    <span className="text-text-tertiary"> {event.detail}</span>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-text-tertiary">{timeAgo(event.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-text-tertiary">No recent activity</div>
        )}
      </div>

      {/* Section 2: CI Checks */}
      <div className="border-t border-border p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">CI Checks</div>
        {checks.length === 0 ? (
          <div className="text-text-tertiary">No checks</div>
        ) : allPassing ? (
          <div className="flex items-center gap-1.5 text-green-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
            All {checks.length} checks passed
          </div>
        ) : (
          <div className="space-y-1">
            {sortedChecks.filter((c) => !isPassing(c)).map((check, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${checkDot(check)}`} />
                {check.detailsUrl ? (
                  <a
                    href={check.detailsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-text-primary hover:text-blue-400 hover:underline"
                  >
                    {check.name}
                  </a>
                ) : (
                  <span className="truncate text-text-primary">{check.name}</span>
                )}
              </div>
            ))}
            {(() => {
              const passingCount = checks.filter(isPassing).length;
              return passingCount > 0 ? (
                <div className="flex items-center gap-1.5 text-text-tertiary">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                  {passingCount} other check{passingCount !== 1 ? "s" : ""} passed
                </div>
              ) : null;
            })()}
          </div>
        )}
      </div>

      {/* Section 3: Merge Score Breakdown */}
      {breakdown && (
        <div className="border-t border-border p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Merge Score</div>
          <div className="space-y-1.5">
            <ScoreBar label="Author rate" weight="35%" score={breakdown.authorRate} />
            <ScoreBar label="PR size" weight="35%" score={breakdown.sizeScore} />
            <ScoreBar label="Review progress" weight="30%" score={breakdown.reviewScore} />
            {breakdown.orgBonus > 0 && (
              <div className="flex items-center justify-between text-text-secondary">
                <span>Org member bonus</span>
                <span className="font-medium text-text-primary">+{breakdown.orgBonus}</span>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
            <span className="text-text-secondary">Final score</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold ${finalScoreColors!.bg15} ${finalScoreColors!.text}`}>
              {breakdown.score}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, weight, score }: { label: string; weight: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-text-secondary">
        <span>{label} <span className="text-text-tertiary">({weight})</span></span>
        <span className="font-medium text-text-primary">{score}</span>
      </div>
      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${scoreColors(score).solid}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
