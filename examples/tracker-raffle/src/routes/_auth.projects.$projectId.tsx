import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { labelsOptions, membersOptions, projectOptions } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId")({
  // Child routes inherit these: their loaders can start the members and labels
  // too, and get hooks for them in their own raffle.
  context: ({ context, params, routeId }) => ({
    raffle: context.raffle.with(routeId, {
      project: projectOptions(params.projectId),
      members: membersOptions(params.projectId),
      labels: labelsOptions(),
    }),
  }),
  // Every page in the project needs these, so the navigation waits for them.
  loader: async ({ context }) => ({
    raffle: await context.raffle.loadQueries("project", "members", "labels"),
  }),
  component: ProjectLayout,
  notFoundComponent: () => <p className="muted">There's no such project.</p>,
});

function ProjectLayout() {
  const { raffle } = Route.useLoaderData();
  const { data: project } = raffle.project.useSuspenseQuery();
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
