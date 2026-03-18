import type { GitHubUser } from "../types";

interface HeaderProps {
  user: GitHubUser;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function Header({
  user,
  lastUpdated,
  loading,
  onRefresh,
  onLogout,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1/60 px-5 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft">
          <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
        </div>
        <h1 className="text-sm font-bold tracking-tight text-text-primary">
          Actual Budget
          <span className="ml-2 font-medium text-text-secondary">PR Review Board</span>
        </h1>
        {lastUpdated && (
          <span className="ml-1 rounded-md bg-surface-3/60 px-2 py-0.5 text-[11px] tabular-nums text-text-tertiary">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="group cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-border-hover hover:bg-surface-3/50 hover:text-text-primary disabled:opacity-40"
        >
          <span className={loading ? "animate-pulse-soft" : ""}>
            {loading ? "Refreshing..." : "Refresh"}
          </span>
        </button>
        <div className="ml-1 flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="h-5 w-5 rounded-full ring-1 ring-border"
          />
          <span className="text-xs font-medium text-text-secondary">{user.login}</span>
        </div>
        <button
          onClick={onLogout}
          className="cursor-pointer rounded-lg px-2 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-surface-3/50 hover:text-text-secondary"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
