import type { GitHubUser } from "../types";
import { useSearchParam } from "../hooks/useSearchParams";

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
  const [impersonate] = useSearchParam("impersonate");
  const displayLogin = impersonate || user.login;
  const displayAvatar = impersonate
    ? `https://github.com/${impersonate}.png?size=40`
    : user.avatar_url;
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
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="group cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:border-border-hover hover:bg-surface-3/50 hover:text-text-primary disabled:opacity-40"
        >
          <span className={loading ? "animate-pulse-soft" : ""}>
            {loading ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="ml-1 flex items-center gap-2 rounded-lg border border-border px-2.5 py-1">
          <img
            src={displayAvatar}
            alt={displayLogin}
            className="h-5 w-5 rounded-full ring-1 ring-border"
          />
          <span className="text-xs font-medium text-text-secondary">{displayLogin}</span>
        </div>
        <button
          onClick={onLogout}
          className="cursor-pointer rounded-lg px-2 py-1.5 text-xs text-text-tertiary transition-colors hover:bg-surface-3/50 hover:text-text-secondary"
        >
          Sign out
        </button>
        <a
          href="https://github.com/actualbudget/maintainer-dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-surface-3/50 hover:text-text-secondary"
          title="Source on GitHub"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
