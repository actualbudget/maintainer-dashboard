export const REPO_OWNER = "actualbudget";
export const REPO_NAME = "actual";

export const LABEL_APPROVED = ":white_check_mark: approved";
export const LABEL_WIP = ":construction: WIP";
export const LABEL_READY = ":mag: ready for review";

export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID as string;
export const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";

export const REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const CONCURRENT_REVIEW_FETCHES = 10;
export const MERGE_STATS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const CLOSED_PR_PAGES = 2;

export const COLUMN_META: Record<
  string,
  { title: string; color: string; bgClass: string; glow: string; description: string }
> = {
  wip: {
    title: "WIP",
    color: "#6b7280",
    bgClass: "bg-gray-500",
    glow: "rgba(107, 114, 128, 0.12)",
    description: "Draft PRs or PRs without the 'ready for review' label",
  },
  ready: {
    title: "Ready for Review",
    color: "#3b82f6",
    bgClass: "bg-blue-500",
    glow: "rgba(59, 130, 246, 0.12)",
    description: "PRs labeled 'ready for review', not assigned to anyone, and not yet AI-approved",
  },
  "ai-approved": {
    title: "AI Approved",
    color: "#8b5cf6",
    bgClass: "bg-violet-500",
    glow: "rgba(139, 92, 246, 0.12)",
    description: "PRs labeled 'ready for review' that have been approved by CodeRabbit but not yet assigned to a human reviewer",
  },
  "in-review": {
    title: "In Review",
    color: "#eab308",
    bgClass: "bg-yellow-500",
    glow: "rgba(234, 179, 8, 0.12)",
    description: "PRs assigned to a reviewer, or PRs with changes requested by a human reviewer",
  },
  approved: {
    title: "Approved",
    color: "#22c55e",
    bgClass: "bg-green-500",
    glow: "rgba(34, 197, 94, 0.12)",
    description: "PRs labeled 'approved' or that have received a human approval",
  },
};
