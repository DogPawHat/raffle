import { Card } from "@examples/tracker/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { projectsOptions } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/")({
  context: () => ({ projectsQuery: projectsOptions() }),
  loader: async ({ context }) => {
    await context.queryClient.query(context.projectsQuery);
  },
  component: Projects,
});

function Projects() {
  const { projectsQuery } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);

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
