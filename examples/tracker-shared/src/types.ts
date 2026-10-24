export type UserId = string;
export type ProjectId = string;
export type IssueId = number;

export interface User {
  id: UserId;
  name: string;
  email: string;
  /** A CSS color for the avatar. */
  color: string;
}

export interface Project {
  id: ProjectId;
  /** Prefix of issue keys, like `WEB` in `WEB-12`. */
  key: string;
  name: string;
  description: string;
  memberIds: Array<UserId>;
}

export interface ProjectSummary extends Project {
  openIssueCount: number;
}

export const statuses = ["backlog", "todo", "in_progress", "done"] as const;
export type Status = (typeof statuses)[number];

export const priorities = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof priorities)[number];

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Issue {
  id: IssueId;
  projectId: ProjectId;
  /** Like `WEB-12`. */
  key: string;
  title: string;
  body: string;
  status: Status;
  priority: Priority;
  /** Only the id: the assignee is a separate, dependent query. */
  assigneeId: UserId | null;
  labelIds: Array<string>;
  createdAt: string;
  updatedAt: string;
  /** When the server produced this response, to make refetches visible. */
  fetchedAt: string;
}

export type IssueSummary = Omit<Issue, "body" | "fetchedAt"> & { commentCount: number };

export const sorts = ["updated", "created", "priority"] as const;
export type Sort = (typeof sorts)[number];

export interface IssueFilters {
  status?: Status;
  assigneeId?: UserId;
  labelId?: string;
  sort: Sort;
  page: number;
}

export interface IssuePage {
  issues: Array<IssueSummary>;
  page: number;
  pageCount: number;
  total: number;
}

export interface Comment {
  id: string;
  issueId: IssueId;
  authorId: UserId;
  body: string;
  createdAt: string;
}

export interface CommentPage {
  comments: Array<Comment>;
  /** The cursor of the next page, or `null` on the last one. */
  nextCursor: number | null;
  total: number;
}

export type StatusCounts = Record<Status, number>;

export interface Activity {
  id: string;
  projectId: ProjectId;
  actorId: UserId;
  issueId: IssueId;
  issueKey: string;
  text: string;
  createdAt: string;
}
