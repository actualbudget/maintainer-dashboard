import { useState } from "react";
import type { ClassifiedPR, ColumnId } from "../types";
import { COLUMN_META } from "../constants";
import PRCard from "./PRCard";

interface ColumnProps {
  id: ColumnId;
  prs: ClassifiedPR[];
}

export default function Column({ id, prs }: ColumnProps) {
  const meta = COLUMN_META[id];
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div
      className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-1/50 md:w-80"
      style={{ boxShadow: `0 0 40px ${meta.glow}` }}
    >
      <div
        className="flex items-center justify-between rounded-t-xl px-4 py-2.5"
        style={{
          background: `linear-gradient(135deg, ${meta.color}28 0%, ${meta.color}10 100%)`,
          borderBottom: `1px solid ${meta.color}25`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}80` }}
          />
          <h2
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: meta.color }}
          >
            {meta.title}
          </h2>
          <div
            className="relative"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              className="cursor-help"
              style={{ color: meta.color, opacity: 0.5 }}
            >
              <circle cx="7" cy="7" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" />
              <text
                x="7"
                y="7"
                textAnchor="middle"
                dominantBaseline="central"
                fill="currentColor"
                fontSize="9"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                ?
              </text>
            </svg>
            {showHelp && (
              <div className="absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs leading-relaxed text-text-secondary shadow-lg">
                {meta.description}
              </div>
            )}
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ color: meta.color, backgroundColor: `${meta.color}20` }}
        >
          {prs.length}
        </span>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 10rem)" }}>
        {prs.length === 0 && (
          <p className="py-6 text-center text-xs text-text-tertiary">No PRs</p>
        )}
        {prs.map((pr, i) => (
          <PRCard key={pr.number} pr={pr} index={i} />
        ))}
      </div>
    </div>
  );
}
