import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { labelsOptions, membersOptions, projectOptions } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId")({
  // Child routes inherit these: the issues list and the issue page read the
  // members and labels without starting them again.
  context: ({ params }) => ({
    projectQuery: projectOptions(params.projectId),
    membersQuery: membersOptions(params.projectId),
    labelsQuery: labelsOptions(),
  }),
  // Every page in the project needs these, so the navigation waits for them.
  loader: async ({ context: { queryClient, projectQuery, membersQuery, labelsQuery } }) => {
    await Promise.all([
      queryClient.query(projectQuery),
      queryClient.query(membersQuery),
      queryClient.query(labelsQuery),
    ]);
  },
  component: ProjectLayout,
  notFoundComponent: () => <p className="muted">There's no such project.</p>,
});

function ProjectLayout() {
  const { projectQuery } = Route.useRouteContext();
  const { data: project } = useSuspenseQuery(projectQuery);
  const params = { projectId: project.id };

  return (
    <>
      <div className="page-header">
        <h1>{project.name}</h1>
        <span className="muted">{project.key}</span>
        <span className="spacer" />
        <Link to="/projects/$projectId/issues/new" params={params}>
          New issue
        </Link>
      </div>
      <nav className="tabs">
        <Link to="/projects/$projectId" params={params} activeOptions={{ exact: true }}>
          Dashboard
        </Link>
        <Link to="/projects/$projectId/issues" params={params}>
          Issues
        </Link>
      </nav>
      <Outlet />
    </>
  );
}
