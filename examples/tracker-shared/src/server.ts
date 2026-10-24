/**
 * The tracker's API, as TanStack Start server functions. During SSR a call is
 * a function call; in the browser it's an HTTP request. Every one waits a
 * little, so loading states and streaming are visible.
 */
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { db, priorityRank, type Db } from "./db.ts";
import {
  statuses,
  type Activity,
  type Comment,
  type CommentPage,
  type Issue,
  type IssueFilters,
  type IssueId,
  type IssuePage,
  type IssueSummary,
  type Priority,
  type Project,
  type ProjectId,
  type ProjectSummary,
  type Status,
  type StatusCounts,
  type User,
  type UserId,
} from "./types.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sessionCookie = "tracker-user";
const pageSize = 10;
const commentPageSize = 5;

function currentUserId(): UserId | null {
  const id = getCookie(sessionCookie);
  return id && db().users.some((user) => user.id === id) ? id : null;
}

function requireUserId(): UserId {
  const id = currentUserId();
  if (!id) {
    throw new Error("Not signed in");
  }
  return id;
}

function findProject(projectId: ProjectId): Project {
  const project = db().projects.find((p) => p.id === projectId);
  if (!project) {
    throw notFound();
  }
  return project;
}

function findIssue(issueId: IssueId) {
  const issue = db().issues.find((i) => i.id === issueId);
  if (!issue) {
    throw notFound();
  }
  return issue;
}

function summarize(issue: Db["issues"][number]): IssueSummary {
  const { body: _body, ...rest } = issue;
  const commentCount = db().comments.filter((c) => c.issueId === issue.id).length;
  return { ...rest, commentCount };
}

function logActivity(issue: { id: IssueId; key: string; projectId: ProjectId }, text: string) {
  db().activity.unshift({
    id: `a${db().activity.length + 1}`,
    projectId: issue.projectId,
    actorId: requireUserId(),
    issueId: issue.id,
    issueKey: issue.key,
    text,
    createdAt: new Date().toISOString(),
  });
}

// --- Session ---------------------------------------------------------------

/** The signed-in user, or `null`. */
export const getSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<User | null> => {
    await sleep(100);
    const id = currentUserId();
    return db().users.find((user) => user.id === id) ?? null;
  },
);

export const signIn = createServerFn({ method: "POST" })
  .validator((userId: UserId) => userId)
  .handler(async ({ data: userId }) => {
    await sleep(200);
    if (!db().users.some((user) => user.id === userId)) {
      throw new Error(`No user ${userId}`);
    }
    setCookie(sessionCookie, userId, { httpOnly: true, path: "/", sameSite: "lax" });
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await sleep(100);
  deleteCookie(sessionCookie, { path: "/" });
});

/** Everyone who can sign in, for the sign-in page. */
export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  await sleep(150);
  return db().users;
});

// --- Projects --------------------------------------------------------------

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<ProjectSummary>> => {
    await sleep(250);
    return db().projects.map((project) => ({
      ...project,
      openIssueCount: db().issues.filter((i) => i.projectId === project.id && i.status !== "done")
        .length,
    }));
  },
);

export const getProject = createServerFn({ method: "GET" })
  .validator((projectId: ProjectId) => projectId)
  .handler(async ({ data: projectId }) => {
    await sleep(150);
    return findProject(projectId);
  });

export const listMembers = createServerFn({ method: "GET" })
  .validator((projectId: ProjectId) => projectId)
  .handler(async ({ data: projectId }): Promise<Array<User>> => {
    await sleep(200);
    const { memberIds } = findProject(projectId);
    return db().users.filter((user) => memberIds.includes(user.id));
  });

export const listLabels = createServerFn({ method: "GET" }).handler(async () => {
  await sleep(150);
  return db().labels;
});

/** For the assignee picker: members whose name matches `query`. */
export const searchMembers = createServerFn({ method: "GET" })
  .validator((input: { projectId: ProjectId; query: string }) => input)
  .handler(async ({ data }): Promise<Array<User>> => {
    await sleep(300);
    const { memberIds } = findProject(data.projectId);
    const query = data.query.trim().toLowerCase();
    return db().users.filter(
      (user) => memberIds.includes(user.id) && user.name.toLowerCase().includes(query),
    );
  });

// --- Dashboard -------------------------------------------------------------

export const getStatusCounts = createServerFn({ method: "GET" })
  .validator((projectId: ProjectId) => projectId)
  .handler(async ({ data: projectId }): Promise<StatusCounts> => {
    await sleep(400);
    findProject(projectId);
    const counts = Object.fromEntries(statuses.map((s) => [s, 0])) as StatusCounts;
    for (const issue of db().issues) {
      if (issue.projectId === projectId) {
        counts[issue.status]++;
      }
    }
    return counts;
  });

/** The signed-in user's open issues in a project. Reads the session cookie. */
export const listMyIssues = createServerFn({ method: "GET" })
  .validator((projectId: ProjectId) => projectId)
  .handler(async ({ data: projectId }) => {
    await sleep(600);
    const userId = requireUserId();
    return db()
      .issues.filter(
        (i) => i.projectId === projectId && i.assigneeId === userId && i.status !== "done",
      )
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
      .slice(0, 5)
      .map(summarize);
  });

/** The latest activity in a project. The dashboard polls it. */
export const listActivity = createServerFn({ method: "GET" })
  .validator((projectId: ProjectId) => projectId)
  .handler(async ({ data: projectId }): Promise<Array<Activity>> => {
    await sleep(300);
    return db()
      .activity.filter((a) => a.projectId === projectId)
      .slice(0, 8);
  });

/** Always fails, so the dashboard has a widget that shows an error. */
export const getIntegrations = createServerFn({ method: "GET" })
  .validator((projectId: ProjectId) => projectId)
  .handler(async (): Promise<Array<{ name: string; connected: boolean }>> => {
    await sleep(500);
    throw new Error("The integrations service is unavailable.");
  });

// --- Issues ----------------------------------------------------------------

export const listIssues = createServerFn({ method: "GET" })
  .validator((input: { projectId: ProjectId } & IssueFilters) => input)
  .handler(async ({ data }): Promise<IssuePage> => {
    await sleep(350);
    findProject(data.projectId);
    const matching = db()
      .issues.filter(
        (i) =>
          i.projectId === data.projectId &&
          (!data.status || i.status === data.status) &&
          (!data.assigneeId || i.assigneeId === data.assigneeId) &&
          (!data.labelId || i.labelIds.includes(data.labelId)),
      )
      .sort((a, b) =>
        data.sort === "priority"
          ? priorityRank[a.priority] - priorityRank[b.priority] || b.id - a.id
          : data.sort === "created"
            ? b.createdAt.localeCompare(a.createdAt)
            : b.updatedAt.localeCompare(a.updatedAt),
      );
    const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
    const page = Math.min(data.page, pageCount);
    return {
      issues: matching.slice((page - 1) * pageSize, page * pageSize).map(summarize),
      page,
      pageCount,
      total: matching.length,
    };
  });

export const getIssue = createServerFn({ method: "GET" })
  .validator((issueId: IssueId) => issueId)
  .handler(async ({ data: issueId }): Promise<Issue> => {
    await sleep(300);
    return { ...findIssue(issueId), fetchedAt: new Date().toISOString() };
  });

export const getUser = createServerFn({ method: "GET" })
  .validator((userId: UserId) => userId)
  .handler(async ({ data: userId }): Promise<User> => {
    await sleep(400);
    const user = db().users.find((u) => u.id === userId);
    if (!user) {
      throw notFound();
    }
    return user;
  });

/** One page of an issue's comments, newest first. Deliberately slow. */
export const listComments = createServerFn({ method: "GET" })
  .validator((input: { issueId: IssueId; cursor: number }) => input)
  .handler(async ({ data }): Promise<CommentPage> => {
    await sleep(900);
    const all = db()
      .comments.filter((c) => c.issueId === data.issueId)
      .toReversed();
    const end = data.cursor + commentPageSize;
    return {
      comments: all.slice(data.cursor, end),
      nextCursor: end < all.length ? end : null,
      total: all.length,
    };
  });

export const createIssue = createServerFn({ method: "POST" })
  .validator(
    (input: {
      projectId: ProjectId;
      title: string;
      body: string;
      priority: Priority;
      assigneeId: UserId | null;
      labelIds: Array<string>;
    }) => input,
  )
  .handler(async ({ data }): Promise<Issue> => {
    await sleep(500);
    const project = findProject(data.projectId);
    if (data.title.trim() === "") {
      throw new Error("An issue needs a title.");
    }
    const number = db().issues.filter((i) => i.projectId === project.id).length + 1;
    const now = new Date().toISOString();
    const issue = {
      id: db().nextIssueId++,
      projectId: project.id,
      key: `${project.key}-${number}`,
      title: data.title.trim(),
      body: data.body.trim(),
      status: "todo" as const,
      priority: data.priority,
      assigneeId: data.assigneeId,
      labelIds: data.labelIds,
      createdAt: now,
      updatedAt: now,
    };
    db().issues.push(issue);
    logActivity(issue, "created");
    return { ...issue, fetchedAt: now };
  });

export const updateStatus = createServerFn({ method: "POST" })
  .validator((input: { issueId: IssueId; status: Status }) => input)
  .handler(async ({ data }): Promise<Issue> => {
    await sleep(700);
    const issue = findIssue(data.issueId);
    issue.status = data.status;
    issue.updatedAt = new Date().toISOString();
    logActivity(issue, `moved to ${data.status.replace("_", " ")}`);
    return { ...issue, fetchedAt: issue.updatedAt };
  });

export const assignIssue = createServerFn({ method: "POST" })
  .validator((input: { issueId: IssueId; assigneeId: UserId | null }) => input)
  .handler(async ({ data }): Promise<Issue> => {
    await sleep(500);
    const issue = findIssue(data.issueId);
    issue.assigneeId = data.assigneeId;
    issue.updatedAt = new Date().toISOString();
    const name = db().users.find((u) => u.id === data.assigneeId)?.name;
    logActivity(issue, name ? `assigned to ${name}` : "unassigned");
    return { ...issue, fetchedAt: issue.updatedAt };
  });

export const addComment = createServerFn({ method: "POST" })
  .validator((input: { issueId: IssueId; body: string }) => input)
  .handler(async ({ data }): Promise<Comment> => {
    await sleep(600);
    const issue = findIssue(data.issueId);
    if (data.body.trim() === "") {
      throw new Error("A comment can't be empty.");
    }
    const comment: Comment = {
      id: `c${db().comments.length + 1}`,
      issueId: issue.id,
      authorId: requireUserId(),
      body: data.body.trim(),
      createdAt: new Date().toISOString(),
    };
    db().comments.push(comment);
    issue.updatedAt = comment.createdAt;
    logActivity(issue, "commented on");
    return comment;
  });
