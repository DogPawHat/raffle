import { Card } from "@examples/tracker/ui";
import { createFileRoute, Link } from "@tanstack/react-router";

import { projectsOptions } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/")({
  context: ({ context, routeId }) => ({
    raffle: context.raffle.with(routeId, { projects: projectsOptions() }),
  }),
  loader: async ({ context }) => ({
    raffle: await context.raffle.loadQueries("projects"),
  }),
  component: Projects,
});

function Projects() {
  const { raffle } = Route.useLoaderData();
  const { data: projects } = raffle.projects.useSuspenseQuery();

  return (
    <>
      <div className="page-header">
        <h1>Projects</h1>
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <Card
            key={project.id}
            title={project.name}
            aside={<span className="muted">{project.openIssueCount} open</span>}
          >
            <p className="muted">{project.description}</p>
            <Link to="/projects/$projectId" params={{ projectId: project.id }}>
              Open {project.key} →
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
