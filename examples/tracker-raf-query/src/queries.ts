/**
 * Every query the app reads, as factories. A loader starts one with an input
 * and returns its handle; a component passes the same factory and the handle
 * to `useQuery`. A component can't read a query nothing started.
 */
import type { IssueFilters, IssueId, ProjectId, UserId } from "@examples/tracker/types";
import {
  getIntegrations,
  getIssue,
  getProject,
  getSession,
  getStatusCounts,
  getUser,
  listActivity,
  listComments,
  listIssues,
  listLabels,
  listMembers,
  listMyIssues,
  listProjects,
  listUsers,
  searchMembers,
} from "@examples/tracker/server";
import { infiniteQueryOptions, queryOptions } from "@raf-query/react";

export function sessionQuery() {
  return queryOptions({ queryKey: ["session"], queryFn: () => getSession() });
}

export function usersQuery() {
  return queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });
}

export function userQuery(input: { userId: UserId }) {
  return queryOptions({
    queryKey: ["users", input.userId],
    queryFn: () => getUser({ data: input.userId }),
  });
}

export function projectsQuery() {
  return queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });
}

export function projectQuery(input: { projectId: ProjectId }) {
  return queryOptions({
    queryKey: ["projects", input.projectId],
    queryFn: () => getProject({ data: input.projectId }),
  });
}

export function membersQuery(input: { projectId: ProjectId }) {
  return queryOptions({
    queryKey: ["projects", input.projectId, "members"],
    queryFn: () => listMembers({ data: input.projectId }),
  });
}

export function memberSearchQuery(input: { projectId: ProjectId; query: string }) {
  return queryOptions({
    queryKey: ["projects", input.projectId, "members", { query: input.query }],
    queryFn: () => searchMembers({ data: input }),
  });
}

export function labelsQuery() {
  return queryOptions({ queryKey: ["labels"], queryFn: () => listLabels(), staleTime: Infinity });
}

// The dashboard's queries share a prefix, so a write can invalidate them together.
export const dashboardKey = (projectId: ProjectId) => ["projects", projectId, "dashboard"] as const;

export function statusCountsQuery(input: { projectId: ProjectId }) {
  return queryOptions({
    queryKey: [...dashboardKey(input.projectId), "status-counts"],
    queryFn: () => getStatusCounts({ data: input.projectId }),
  });
}

export function myIssuesQuery(input: { projectId: ProjectId }) {
  return queryOptions({
    queryKey: [...dashboardKey(input.projectId), "mine"],
    queryFn: () => listMyIssues({ data: input.projectId }),
  });
}

export function activityQuery(input: { projectId: ProjectId }) {
  return queryOptions({
    queryKey: [...dashboardKey(input.projectId), "activity"],
    queryFn: () => listActivity({ data: input.projectId }),
  });
}

export function integrationsQuery(input: { projectId: ProjectId }) {
  return queryOptions({
    queryKey: [...dashboardKey(input.projectId), "integrations"],
    queryFn: () => getIntegrations({ data: input.projectId }),
    retry: 1,
  });
}

export function issuesQuery(input: { projectId: ProjectId } & IssueFilters) {
  const { projectId, ...filters } = input;
  return queryOptions({
    queryKey: ["issues", "list", projectId, filters],
    queryFn: () => listIssues({ data: input }),
  });
}

export function issueQuery(input: { issueId: IssueId }) {
  return queryOptions({
    queryKey: ["issues", "detail", input.issueId],
    queryFn: () => getIssue({ data: input.issueId }),
  });
}

export function commentsQuery(input: { issueId: IssueId }) {
  return infiniteQueryOptions({
    queryKey: ["issues", "detail", input.issueId, "comments"],
    queryFn: (context) =>
      listComments({ data: { issueId: input.issueId, cursor: context.pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
