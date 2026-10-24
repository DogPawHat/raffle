import { allKeyed, useQuery } from "@raf-query/react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { labelsQuery, membersQuery, projectQuery } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId")({
  // Every page in the project needs these, so the navigation waits for them.
  // Child routes read the members and labels from this route's loader data.
  loader: ({ context: { queryClient }, params: { projectId } }) =>
    allKeyed({
      project: queryClient.ensure(projectQuery, { projectId }),
      members: queryClient.ensure(membersQuery, { projectId }),
      labels: queryClient.ensure(labelsQuery),
    }),
  component: ProjectLayout,
  notFoundComponent: () => <p className="muted">There's no such project.</p>,
});

function ProjectLayout() {
  const data = Route.useLoaderData();
  const [project] = useQuery(projectQuery, data.project);
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
