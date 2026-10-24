import { Card } from "@examples/tracker/ui";
import { useQuery } from "@raf-query/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { projectsQuery } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/")({
  loader: async ({ context }) => ({
    projects: await context.queryClient.ensure(projectsQuery),
  }),
  component: Projects,
});

function Projects() {
  const data = Route.useLoaderData();
  const [projects] = useQuery(projectsQuery, data.projects);

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
