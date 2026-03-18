import { useAuth } from "./hooks/useAuth";
import { usePullRequests } from "./hooks/usePullRequests";
import { TokenContext } from "./contexts/TokenContext";
import LoginScreen from "./components/LoginScreen";
import Header from "./components/Header";
import Board from "./components/Board";
import Spinner from "./components/Spinner";

export default function App() {
  const { token, user, loading: authLoading, login, logout } = useAuth();
  const {
    columns,
    authors,
    allLabels,
    assignees,
    loading: prLoading,
    error,
    lastUpdated,
    refresh,
    sortByScore,
    setSortByScore,
  } = usePullRequests(token);

  if (!token || authLoading || !user) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <TokenContext.Provider value={token}>
      <div className="flex h-screen flex-col bg-surface-0">
        <Header
          user={user}
          lastUpdated={lastUpdated}
          loading={prLoading}
          onRefresh={refresh}
          onLogout={logout}
        />
        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {prLoading && columns.every((c) => c.prs.length === 0) ? (
          <Spinner />
        ) : (
          <Board columns={columns} authors={authors} allLabels={allLabels} assignees={assignees} currentUser={user.login} sortByScore={sortByScore} onSortToggle={() => setSortByScore(!sortByScore)} />
        )}
      </div>
    </TokenContext.Provider>
  );
}
