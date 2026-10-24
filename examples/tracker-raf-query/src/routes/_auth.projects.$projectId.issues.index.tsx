import { validateIssuesSearch } from "@examples/tracker/search";
import { FilterBar, IssueTable, Pager } from "@examples/tracker/ui";
import { useQuery } from "@raf-query/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useProjectLookups } from "../project.ts";
import { issuesQuery } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/issues/")({
  validateSearch: validateIssuesSearch,
  // The search params that pick the data. The loader gets them as `deps`, and
  // runs again when they change.
  loaderDeps: ({ search }) => search,
  // Waits, so the old page stays on screen until the new one is ready.
  loader: async ({ context, params, deps }) => ({
    issues: await context.queryClient.ensure(issuesQuery, { projectId: params.projectId, ...deps }),
  }),
  component: Issues,
});

function Issues() {
  const loaderData = Route.useLoaderData();
  const [data] = useQuery(issuesQuery, loaderData.issues);
  const { members, labels } = useProjectLookups();
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
