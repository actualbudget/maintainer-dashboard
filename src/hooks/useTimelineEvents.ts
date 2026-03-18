import { useState, useEffect, useRef } from "react";
import type { TimelineEvent } from "../types";
import { createOctokit, fetchTimelineEvents } from "../lib/github";

interface CacheEntry {
  data: TimelineEvent[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<number, CacheEntry>();

export function useTimelineEvents(
  token: string | null,
  prNumber: number | null,
): { events: TimelineEvent[] | null; loading: boolean } {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;

    if (!token || prNumber === null) {
      setEvents(null);
      setLoading(false);
      return;
    }

    const cached = cache.get(prNumber);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setEvents(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    const octokit = createOctokit(token);
    fetchTimelineEvents(octokit, prNumber)
      .then((data) => {
        if (abortRef.current) return;
        cache.set(prNumber, { data, fetchedAt: Date.now() });
        setEvents(data);
      })
      .catch(() => {
        if (abortRef.current) return;
        setEvents([]);
      })
      .finally(() => {
        if (!abortRef.current) setLoading(false);
      });

    return () => {
      abortRef.current = true;
    };
  }, [token, prNumber]);

  return { events, loading };
}
