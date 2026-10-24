import { validateIssuesSearch } from "@examples/tracker/search";
import { FilterBar, IssueTable, Pager } from "@examples/tracker/ui";
import { createFileRoute, Link } from "@tanstack/react-router";

import { issuesOptions } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/issues/")({
  validateSearch: validateIssuesSearch,
  // The search params that pick the data. `context` and the loader get them
  // as `deps`, and run again when they change.
  loaderDeps: ({ search }) => search,
  context: ({ context, params, deps, routeId }) => ({
    raffle: context.raffle.with(routeId, { issues: issuesOptions(params.projectId, deps) }),
  }),
  // Waits, so the old page stays on screen until the new one is ready. The
  // members and labels come from the project route.
  loader: async ({ context }) => ({
    raffle: await context.raffle.loadQueries("issues", "members", "labels"),
  }),
  component: Issues,
});

function Issues() {
  const { raffle } = Route.useLoaderData();
  const { data } = raffle.issues.useSuspenseQuery();
  const { data: members } = raffle.members.useSuspenseQuery();
  const { data: labels } = raffle.labels.useSuspenseQuery();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <>
      <FilterBar
        filters={filters}
        members={members}
        labels={labels}
        onChange={(patch) => void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }) })}
      />
      <IssueTable
        issues={data.issues}
        members={members}
        labels={labels}
        renderTitle={(issue) => (
          <Link
            to="/projects/$projectId/issues/$issueId"
            params={{ projectId: issue.projectId, issueId: String(issue.id) }}
          >
            {issue.title}
          </Link>
        )}
      />
      <Pager
        page={data.page}
        pageCount={data.pageCount}
        total={data.total}
        renderLink={(page, label) => (
          <Link from={Route.fullPath} search={(prev) => ({ ...prev, page })}>
            {label}
          </Link>
        )}
      />
    </>
  );
}
