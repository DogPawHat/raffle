import { updateStatus } from "@examples/tracker/server";
import type { Issue } from "@examples/tracker/types";
import { LabelChip, PriorityBadge, Skeleton, StatusSelect, TimeAgo } from "@examples/tracker/ui";
import { useQuery, useQueryClient } from "@raf-query/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useOptimistic, useTransition } from "react";

import { Assignee } from "../components/assignee.tsx";
import { Comments } from "../components/comments.tsx";
import { useProjectLookups } from "../project.ts";
import { commentsQuery, dashboardKey, issueQuery, userQuery } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/issues/$issueId")({
  loader: async ({ context: { queryClient }, params }) => {
    const issueId = Number(params.issueId);
    // Start the slow comments first, so they load while we wait for the issue.
    const comments = queryClient.prefetch(commentsQuery, { issueId });
    // Waits, so a missing issue is a 404 before anything renders.
    const issue = await queryClient.ensure(issueQuery, { issueId });
    // The assignee depends on the issue. Starting it here beats waiting for
    // the component; the component's `useWaterfall` picks up this request.
    if (issue.data.assigneeId) {
      queryClient.prefetch(userQuery, { userId: issue.data.assigneeId });
    }
    return { comments, issue };
  },
  component: IssuePage,
  notFoundComponent: () => <p className="muted">There's no such issue.</p>,
});

function IssuePage() {
  const data = Route.useLoaderData();
  const [issue] = useQuery(issueQuery, data.issue);
  const { labels } = useProjectLookups();

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
          <Comments issue={issue} handle={data.comments} />
        </Suspense>
      </article>
      <aside>
        <section>
          <h3>Status</h3>
          <IssueStatus issue={issue} />
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
          <Assignee issue={issue} />
        </section>
      </aside>
    </div>
  );
}

function IssueStatus({ issue }: { issue: Issue }) {
  const queryClient = useQueryClient();
  // Optimistic: shows the new status while the action runs, and falls back to
  // the cached one when it ends, which is the old one again if it failed.
  const [status, setOptimisticStatus] = useOptimistic(issue.status);
  const [isPending, startTransition] = useTransition();

  return (
    <StatusSelect
      value={status}
      pending={isPending}
      onChange={(next) =>
        startTransition(async () => {
          setOptimisticStatus(next);
          try {
            const updated = await updateStatus({ data: { issueId: issue.id, status: next } });
            queryClient.setData(issueQuery, { issueId: issue.id }, updated);
          } catch {
            // Rolled back by `useOptimistic`.
          }
          // Lists and the dashboard count statuses too.
          await Promise.all([
            queryClient.invalidate({ queryKey: ["issues", "list", issue.projectId] }),
            queryClient.invalidate({ queryKey: dashboardKey(issue.projectId) }),
          ]);
        })
      }
    />
  );
}
