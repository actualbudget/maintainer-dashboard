import { useMemo } from "react";
import type { ClassifiedPR, ColumnId } from "../types";
import Column from "./Column";
import FilterBar from "./FilterBar";
import MyQueue from "./MyQueue";
import { useSearchParam } from "../hooks/useSearchParams";

interface BoardProps {
  columns: Array<{ id: ColumnId; prs: ClassifiedPR[] }>;
  authors: string[];
  allLabels: string[];
  assignees: string[];
  currentUser: string;
  sortByScore: boolean;
  onSortToggle: () => void;
}

export default function Board({ columns, authors, allLabels, assignees, currentUser, sortByScore, onSortToggle }: BoardProps) {
  const [selectedAuthor, setSelectedAuthor] = useSearchParam("author");
  const [selectedLabel, setSelectedLabel] = useSearchParam("label");
  const [selectedAssignee, setSelectedAssignee] = useSearchParam("assignee");
  const [searchQuery, setSearchQuery] = useSearchParam("q");
  const [view, setView] = useSearchParam("view");
  const [impersonate, setImpersonate] = useSearchParam("impersonate");

  const effectiveUser = impersonate || currentUser;

  const searchLower = searchQuery.toLowerCase();

  const matchesFilters = (pr: ClassifiedPR, includeAssignee: boolean) => {
    if (selectedAuthor && pr.author.login !== selectedAuthor) return false;
    if (selectedLabel && !pr.labels.some((l) => l.name === selectedLabel)) return false;
    if (includeAssignee && selectedAssignee && !pr.reviewers.some((r) => r.login === selectedAssignee)) return false;
    if (searchLower && !pr.title.toLowerCase().includes(searchLower)) return false;
    return true;
  };

  const filtered = useMemo(
    () => columns.map((col) => ({
      ...col,
      prs: col.prs.filter((pr) => matchesFilters(pr, true)),
    })),
    [columns, selectedAuthor, selectedLabel, selectedAssignee, searchLower],
  );

  const allFilteredPrs = useMemo(
    () => columns.flatMap((col) => col.prs).filter((pr) => matchesFilters(pr, false)),
    [columns, selectedAuthor, selectedLabel, searchLower],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {impersonate && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-1.5 text-sm text-accent">
          <span>Viewing as <strong>{impersonate}</strong></span>
          <button
            onClick={() => setImpersonate("")}
            className="ml-auto text-accent/60 hover:text-accent transition-colors cursor-pointer"
            title="Clear impersonation"
          >
            ✕
          </button>
        </div>
      )}
      <div className="px-4 py-3">
        <FilterBar
          authors={authors}
          allLabels={allLabels}
          assignees={assignees}
          currentUser={effectiveUser}
          selectedAuthor={selectedAuthor}
          selectedLabel={selectedLabel}
          selectedAssignee={selectedAssignee}
          searchQuery={searchQuery}
          onAuthorChange={setSelectedAuthor}
          onLabelChange={setSelectedLabel}
          onAssigneeChange={setSelectedAssignee}
          onSearchChange={setSearchQuery}
          sortByScore={sortByScore}
          onSortToggle={onSortToggle}
          view={view}
          onViewChange={setView}
        />
      </div>
      {view === "queue" ? (
        <MyQueue prs={allFilteredPrs} currentUser={effectiveUser} sortByScore={sortByScore} />
      ) : (
        <div className="flex-1 flex gap-0 overflow-x-auto px-4 pb-4 md:flex-row flex-col items-stretch">
          {filtered.map((col, i) => (
            <div key={col.id} className="flex items-stretch md:flex-row flex-col">
              {i > 0 && (
                <div className="hidden md:flex items-center justify-center px-1.5 text-text-tertiary/30">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <Column id={col.id} prs={col.prs} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
