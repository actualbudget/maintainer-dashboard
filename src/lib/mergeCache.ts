import type { AuthorMergeStats, PRDetails } from "./github";
import { MERGE_STATS_CACHE_TTL_MS } from "../constants";

const AUTHOR_STATS_KEY = "merge-author-stats";
const PR_DETAILS_KEY = "merge-pr-details";
const ORG_MEMBERS_KEY = "merge-org-members";

interface CachedAuthorStats {
  timestamp: number;
  data: Record<string, AuthorMergeStats>;
}

export function getCachedAuthorStats(): Map<string, AuthorMergeStats> | null {
  try {
    const raw = localStorage.getItem(AUTHOR_STATS_KEY);
    if (!raw) return null;
    const cached: CachedAuthorStats = JSON.parse(raw);
    if (Date.now() - cached.timestamp > MERGE_STATS_CACHE_TTL_MS) return null;
    return new Map(Object.entries(cached.data));
  } catch {
    return null;
  }
}

export function setCachedAuthorStats(stats: Map<string, AuthorMergeStats>): void {
  const cached: CachedAuthorStats = {
    timestamp: Date.now(),
    data: Object.fromEntries(stats),
  };
  localStorage.setItem(AUTHOR_STATS_KEY, JSON.stringify(cached));
}

interface CachedOrgMembers {
  timestamp: number;
  data: string[];
}

export function getCachedOrgMembers(): Set<string> | null {
  try {
    const raw = localStorage.getItem(ORG_MEMBERS_KEY);
    if (!raw) return null;
    const cached: CachedOrgMembers = JSON.parse(raw);
    if (Date.now() - cached.timestamp > MERGE_STATS_CACHE_TTL_MS) return null;
    return new Set(cached.data);
  } catch {
    return null;
  }
}

export function setCachedOrgMembers(members: Set<string>): void {
  const cached: CachedOrgMembers = {
    timestamp: Date.now(),
    data: [...members],
  };
  localStorage.setItem(ORG_MEMBERS_KEY, JSON.stringify(cached));
}

export function getCachedPRDetails(): Map<number, PRDetails> {
  try {
    const raw = localStorage.getItem(PR_DETAILS_KEY);
    if (!raw) return new Map();
    const entries: Array<[number, PRDetails]> = JSON.parse(raw);
    return new Map(entries);
  } catch {
    return new Map();
  }
}

export function setCachedPRDetails(
  details: Map<number, PRDetails>,
  openPRNumbers: number[],
): void {
  const openSet = new Set(openPRNumbers);
  const pruned = new Map<number, PRDetails>();
  for (const [num, d] of details) {
    if (openSet.has(num)) pruned.set(num, d);
  }
  localStorage.setItem(PR_DETAILS_KEY, JSON.stringify([...pruned]));
}
