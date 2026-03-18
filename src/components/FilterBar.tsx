interface FilterBarProps {
  authors: string[];
  allLabels: string[];
  assignees: string[];
  currentUser: string;
  selectedAuthor: string;
  selectedLabel: string;
  selectedAssignee: string;
  searchQuery: string;
  onAuthorChange: (author: string) => void;
  onLabelChange: (label: string) => void;
  onAssigneeChange: (assignee: string) => void;
  onSearchChange: (query: string) => void;
  sortByScore: boolean;
  onSortToggle: () => void;
  view: string;
  onViewChange: (view: string) => void;
}

export default function FilterBar({
  authors,
  allLabels,
  assignees,
  currentUser,
  selectedAuthor,
  selectedLabel,
  selectedAssignee,
  searchQuery,
  onAuthorChange,
  onLabelChange,
  onAssigneeChange,
  onSearchChange,
  sortByScore,
  onSortToggle,
  view,
  onViewChange,
}: FilterBarProps) {
  const isQueue = view === "queue";
  const sortedAssignees = [...assignees].sort((a, b) => {
    if (a === currentUser) return -1;
    if (b === currentUser) return 1;
    return a.localeCompare(b);
  });

  const selectClasses =
    "cursor-pointer rounded-lg border border-border bg-surface-2/80 px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-border-hover hover:bg-surface-3/60 hover:text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="mr-2 flex rounded-lg border border-border bg-surface-2/80 p-0.5">
        <button
          onClick={() => onViewChange("")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            !isQueue
              ? "bg-accent/15 text-accent shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Board
        </button>
        <button
          onClick={() => onViewChange("queue")}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            isQueue
              ? "bg-accent/15 text-accent shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          My Queue
        </button>
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search PRs…"
        className="w-40 rounded-lg border border-border bg-surface-2/80 px-3 py-1.5 text-xs font-medium text-text-primary placeholder-text-tertiary transition-all hover:border-border-hover focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/40"
      />
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
        Filter
      </span>
      <select
        value={selectedAuthor}
        onChange={(e) => onAuthorChange(e.target.value)}
        className={selectClasses}
      >
        <option value="">All authors</option>
        {authors.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      {!isQueue && (
        <select
          value={selectedAssignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
          className={selectClasses}
        >
          <option value="">All assignees</option>
          {sortedAssignees.map((a) => (
            <option key={a} value={a}>
              {a === currentUser ? `${a} (me)` : a}
            </option>
          ))}
        </select>
      )}
      <select
        value={selectedLabel}
        onChange={(e) => onLabelChange(e.target.value)}
        className={selectClasses}
      >
        <option value="">All labels</option>
        {allLabels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <div className="ml-auto flex items-center gap-1">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Sort
        </span>
        <button
          onClick={onSortToggle}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
            sortByScore
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-border bg-surface-2/80 text-text-secondary hover:border-border-hover hover:bg-surface-3/60 hover:text-text-primary"
          }`}
        >
          {sortByScore ? "Merge likelihood" : "Updated"}
        </button>
      </div>
    </div>
  );
}
