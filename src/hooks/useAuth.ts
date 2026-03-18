import { useState, useEffect, useCallback } from "react";
import { GITHUB_CLIENT_ID, GITHUB_OAUTH_URL } from "../constants";
import type { GitHubUser } from "../types";

const TOKEN_KEY = "gh_token";

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  // Read token from hash fragment on mount
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/token=([^&]+)/);
    if (match) {
      const t = match[1];
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Fetch user info when token is available
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    setLoading(true);
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json() as Promise<GitHubUser>;
      })
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(() => {
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: "read:org",
    });
    window.location.href = `${GITHUB_OAUTH_URL}?${params}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, loading, login, logout };
}
