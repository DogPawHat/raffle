import { updateStatus } from "@examples/tracker/server";
import type { Status } from "@examples/tracker/types";
import { LabelChip, PriorityBadge, Skeleton, StatusSelect, TimeAgo } from "@examples/tracker/ui";
import { noop, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { Assignee } from "../components/assignee.tsx";
import { Comments } from "../components/comments.tsx";
import { commentsOptions, dashboardKey, issueOptions, userOptions } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/issues/$issueId")({
  context: ({ context, params, routeId }) => ({
    raffle: context.raffle.with(routeId, { issue: issueOptions(Number(params.issueId)) }),
    // Raffle only holds plain queries, so the paged comments sit next to it.
    commentsQuery: commentsOptions(Number(params.issueId)),
  }),
  loader: async ({ context: { raffle, queryClient, commentsQuery } }) => {
    // Start the slow comments first, so they load while we wait for the issue.
    void queryClient.infiniteQuery(commentsQuery).catch(noop);
    // Waits, so a missing issue is a 404 before anything renders.
    const loaded = await raffle.loadQueries("issue", "members", "labels");
    // The assignee depends on the issue, so it can't be registered in `context`.
    // A raffle holds hooks, not data, so read the issue back from the cache.
    const issue = queryClient.getQueryData(raffle.getOptions("issue").queryKey);
    if (issue?.assigneeId) {
      void queryClient.query(userOptions(issue.assigneeId)).catch(noop);
    }
    return { raffle: loaded };
  },
  component: IssuePage,
  notFoundComponent: () => <p className="muted">There's no such issue.</p>,
});

function IssuePage() {
  const { raffle } = Route.useLoaderData();
  const { data: issue } = raffle.issue.useSuspenseQuery();
  const { data: labels } = raffle.labels.useSuspenseQuery();

  return (
    <div className="issue-layout">
      <article>
        <p className="muted">
          <Link to="/projects/$projectId/issues" params={{ projectId: issue.projectId }}>
            Issues
          </Link>{" "}
          / {issue.key}
        </p>
        <h1>{issue.title}</h1>
        <p className="muted">
          Opened <TimeAgo iso={issue.createdAt} /> · fetched <TimeAgo iso={issue.fetchedAt} />
        </p>
        <p>{issue.body}</p>
        <Suspense fallback={<Skeleton lines={4} />}>
          <Comments />
        </Suspense>
      </article>
      <aside>
        <section>
          <h3>Status</h3>
          <IssueStatus />
        </section>
        <section>
          <h3>Priority</h3>
          <PriorityBadge priority={issue.priority} />
        </section>
        <section>
          <h3>Labels</h3>
          {issue.labelIds.length === 0 ? <span className="muted">None</span> : null}
          {labels
            .filter((label) => issue.labelIds.includes(label.id))
            .map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
        </section>
        <section>
          <h3>Assignee</h3>
          <Assignee />
        </section>
      </aside>
    </div>
  );
}

function IssueStatus() {
  const { raffle } = Route.useLoaderData();
  const { data: issue } = raffle.issue.useSuspenseQuery();
  const queryClient = useQueryClient();
  const updateStatusMutation = useMutation({
    mutationFn: (status: Status) => updateStatus({ data: { issueId: issue.id, status } }),
    onSuccess: (updated) => queryClient.setQueryData(issueOptions(issue.id).queryKey, updated),
    // Lists and the dashboard count statuses too.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["issues", "list", issue.projectId] }),
        queryClient.invalidateQueries({ queryKey: dashboardKey(issue.projectId) }),
      ]),
  });

  return (
    <StatusSelect
      // Optimistic: show the new status while it saves, and the old one again if it fails.
      value={updateStatusMutation.isPending ? updateStatusMutation.variables : issue.status}
      pending={updateStatusMutation.isPending}
      onChange={(status) => updateStatusMutation.mutate(status)}
    />
  );
}
