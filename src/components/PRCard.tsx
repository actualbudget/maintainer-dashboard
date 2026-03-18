import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ClassifiedPR, ReviewerState } from "../types";
import { useToken } from "../contexts/TokenContext";
import { useTimelineEvents } from "../hooks/useTimelineEvents";
import { timeAgo } from "../lib/format";
import { scoreColors } from "../lib/scoreColors";
import LabelBadge from "./LabelBadge";
import PRPopover from "./PRPopover";

const REVIEWER_RING: Record<ReviewerState, string> = {
  approved: "ring-green-400/80",
  changes_requested: "ring-red-400/80",
  commented: "ring-text-tertiary",
  pending: "ring-surface-4",
};

interface PRCardProps {
  pr: ClassifiedPR;
  index: number;
}

const HOVER_DELAY = 300;

export default function PRCard({ pr, index }: PRCardProps) {
  const isStale = pr.labels.some((l) => l.name.toLowerCase() === "stale");
  const token = useToken();

  const [popoverPos, setPopoverPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const popoverHovered = useRef(false);

  const popoverVisible = popoverPos !== null;
  const activePrNumber = popoverVisible ? pr.number : null;
  const { events, loading: eventsLoading } = useTimelineEvents(token, activePrNumber);

  const positionPopover = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const gap = 8;
    const margin = 8;

    let left = rect.right + gap;
    if (left + popoverWidth > window.innerWidth) {
      left = rect.left - popoverWidth - gap;
    }

    // If more space above the card's bottom than below the card's top, anchor to bottom
    const spaceBelow = window.innerHeight - rect.top;
    const spaceAbove = rect.bottom;

    if (spaceBelow >= spaceAbove) {
      setPopoverPos({ left, top: Math.max(margin, rect.top) });
    } else {
      setPopoverPos({ left, bottom: Math.max(margin, window.innerHeight - rect.bottom) });
    }
  }, []);

  const showPopover = useCallback(() => {
    positionPopover();
  }, [positionPopover]);

  const hidePopover = useCallback(() => {
    // Small delay to allow moving cursor to popover
    setTimeout(() => {
      if (!popoverHovered.current) {
        setPopoverPos(null);
      }
    }, 100);
  }, []);

  const onCardEnter = useCallback(() => {
    hoverTimer.current = setTimeout(showPopover, HOVER_DELAY);
  }, [showPopover]);

  const onCardLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hidePopover();
  }, [hidePopover]);

  const onPopoverEnter = useCallback(() => {
    popoverHovered.current = true;
  }, []);

  const onPopoverLeave = useCallback(() => {
    popoverHovered.current = false;
    setPopoverPos(null);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimeout(hoverTimer.current);
  }, []);

  const sc = pr.mergeScore != null ? scoreColors(pr.mergeScore) : null;

  const cardClass = isStale
    ? "border-border/50 bg-surface-2/30 opacity-50 grayscale-[40%]"
    : "border-border bg-surface-2/70";

  return (
    <div
      ref={cardRef}
      className="relative"
      onMouseEnter={onCardEnter}
      onMouseLeave={onCardLeave}
    >
      <a
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`glass-card animate-card-in relative block rounded-lg border p-3 backdrop-blur-sm ${cardClass}`}
        style={{ animationDelay: `${index * 40}ms` }}
      >
        {pr.ciStatus !== "success" && (
          <span
            title={pr.ciStatus === "pending" ? "CI: Running" : "CI: Required check failing"}
            className={`absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full ${
              pr.ciStatus === "pending"
                ? "bg-yellow-400 shadow-yellow-400/40 shadow-sm animate-ci-pulse"
                : "bg-red-500 shadow-red-500/40 shadow-sm"
            }`}
          />
        )}
        {pr.codeRabbitStatus !== "none" && (
          <span
            title={pr.codeRabbitStatus === "approved" ? "CodeRabbit: Approved" : "CodeRabbit: Changes Requested"}
            className={`absolute -top-1.5 -left-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] leading-none shadow-lg ${
              pr.codeRabbitStatus === "approved"
                ? "bg-green-500 shadow-green-500/30"
                : "bg-red-500 shadow-red-500/30"
            }`}
          >
            {"\uD83D\uDC07"}
          </span>
        )}
        <div className="flex items-start gap-2.5">
          <img
            src={pr.author.avatarUrl}
            alt={pr.author.login}
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-snug text-text-primary line-clamp-2">
              {pr.title}
            </p>
          </div>
          {pr.reviewers.length > 0 && (
            <div className="ml-1 mt-0.5 flex shrink-0 -space-x-1.5">
              {pr.reviewers.map((r) => (
                <img
                  key={r.login}
                  src={r.avatarUrl}
                  alt={r.login}
                  title={`${r.login} (${r.state.replace("_", " ")})`}
                  className={`h-5 w-5 rounded-full ring-2 ${REVIEWER_RING[r.state]}`}
                />
              ))}
            </div>
          )}
        </div>
        {pr.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {pr.labels.map((label) => (
              <LabelBadge key={label.name} label={label} />
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="font-semibold text-text-primary/70">#{pr.number}</span>
            <span className="text-text-tertiary/40">·</span>
            <span>{pr.author.login}</span>
            <span className="text-text-tertiary/40">·</span>
            <span title={`Updated ${new Date(pr.updatedAt).toLocaleString()}`}>{timeAgo(pr.updatedAt)}</span>
          </div>
          {sc && (
            <span
              title={`Merge likelihood: ${pr.mergeScore}%`}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${sc.bg10} ${sc.text}`}
            >
              <span className={`inline-block h-1 w-1 rounded-full ${sc.solid}`} />
              {pr.mergeScore}
            </span>
          )}
        </div>
      </a>

      {popoverVisible && popoverPos && createPortal(
        <div
          className="fixed z-50"
          style={{
            left: popoverPos.left,
            ...(popoverPos.top != null
              ? { top: popoverPos.top, maxHeight: `calc(100vh - ${popoverPos.top}px - 8px)` }
              : { bottom: popoverPos.bottom, maxHeight: `calc(100vh - ${popoverPos.bottom!}px - 8px)` }),
          }}
          onMouseEnter={onPopoverEnter}
          onMouseLeave={onPopoverLeave}
        >
          <PRPopover pr={pr} events={events} eventsLoading={eventsLoading} />
        </div>,
        document.body,
      )}
    </div>
  );
}
