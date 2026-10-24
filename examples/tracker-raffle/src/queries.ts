/**
 * Every query the app reads. Routes register these with raffle in their
 * `context`; the few raffle can't hold are used directly.
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
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

export const sessionOptions = () =>
  queryOptions({ queryKey: ["session"], queryFn: () => getSession() });

export const usersOptions = () => queryOptions({ queryKey: ["users"], queryFn: () => listUsers() });

export const userOptions = (userId: UserId) =>
  queryOptions({ queryKey: ["users", userId], queryFn: () => getUser({ data: userId }) });

export const projectsOptions = () =>
  queryOptions({ queryKey: ["projects"], queryFn: () => listProjects() });

export const projectOptions = (projectId: ProjectId) =>
  queryOptions({
    queryKey: ["projects", projectId],
    queryFn: () => getProject({ data: projectId }),
  });

export const membersOptions = (projectId: ProjectId) =>
  queryOptions({
    queryKey: ["projects", projectId, "members"],
    queryFn: () => listMembers({ data: projectId }),
  });

export const memberSearchOptions = (projectId: ProjectId, query: string) =>
  queryOptions({
    queryKey: ["projects", projectId, "members", { query }],
    queryFn: () => searchMembers({ data: { projectId, query } }),
  });

export const labelsOptions = () =>
  queryOptions({ queryKey: ["labels"], queryFn: () => listLabels(), staleTime: Infinity });

// The dashboard's queries share a prefix, so a write can invalidate them together.
export const dashboardKey = (projectId: ProjectId) => ["projects", projectId, "dashboard"] as const;

export const statusCountsOptions = (projectId: ProjectId) =>
  queryOptions({
    queryKey: [...dashboardKey(projectId), "status-counts"],
    queryFn: () => getStatusCounts({ data: projectId }),
  });

export const myIssuesOptions = (projectId: ProjectId) =>
  queryOptions({
    queryKey: [...dashboardKey(projectId), "mine"],
    queryFn: () => listMyIssues({ data: projectId }),
  });

export const activityOptions = (projectId: ProjectId) =>
  queryOptions({
    queryKey: [...dashboardKey(projectId), "activity"],
    queryFn: () => listActivity({ data: projectId }),
  });

export const integrationsOptions = (projectId: ProjectId) =>
  queryOptions({
    queryKey: [...dashboardKey(projectId), "integrations"],
    queryFn: () => getIntegrations({ data: projectId }),
    retry: 1,
  });

export const issuesOptions = (projectId: ProjectId, filters: IssueFilters) =>
  queryOptions({
    queryKey: ["issues", "list", projectId, filters],
    queryFn: () => listIssues({ data: { projectId, ...filters } }),
  });

export const issueOptions = (issueId: IssueId) =>
  queryOptions({
    queryKey: ["issues", "detail", issueId],
    queryFn: () => getIssue({ data: issueId }),
  });

export const commentsOptions = (issueId: IssueId) =>
  infiniteQueryOptions({
    queryKey: ["issues", "detail", issueId, "comments"],
    queryFn: ({ pageParam }) => listComments({ data: { issueId, cursor: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
