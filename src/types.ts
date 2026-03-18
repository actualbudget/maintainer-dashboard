export interface PRLabel {
  name: string;
  color: string;
}

export type ColumnId = "wip" | "ready" | "ai-approved" | "in-review" | "approved";

export type CodeRabbitStatus = "approved" | "changes_requested" | "none";

export type CIStatus = "success" | "pending" | "failure";

export type ReviewerState = "approved" | "changes_requested" | "commented" | "pending";

export interface Reviewer {
  login: string;
  avatarUrl: string;
  state: ReviewerState;
  lastReviewedAt?: string;
}

export interface ClassifiedPR {
  number: number;
  title: string;
  url: string;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  labels: PRLabel[];
  reviewers: Reviewer[];
  humanReviewCount: number;
  isAI: boolean;
  codeRabbitStatus: CodeRabbitStatus;
  ciStatus: CIStatus;
  ciChecks?: CheckRun[];
  column: ColumnId;
  headCommitDate?: string;
  additions?: number;
  deletions?: number;
  mergeScore?: number;
  mergeScoreBreakdown?: MergeScoreBreakdown;
  authorCreatedAt?: string;
}

export interface CheckRun {
  name: string;
  status: "completed" | "in_progress" | "queued";
  conclusion: string | null;
  detailsUrl: string | null;
}

export interface MergeScoreBreakdown {
  score: number;
  authorRate: number;
  sizeScore: number;
  reviewScore: number;
  orgBonus: number;
  accountAgeBonus: number;
  rawTotal: number;
}

export interface TimelineEvent {
  type: "commented" | "reviewed" | "committed" | "assigned" | "labeled" | "closed" | "reopened" | "other";
  actor: string;
  actorAvatarUrl?: string;
  createdAt: string;
  detail: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
}
