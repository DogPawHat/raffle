import { createIssue } from "@examples/tracker/server";
import { ErrorBox, IssueFields, readIssueFields } from "@examples/tracker/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";

import { dashboardKey, issueOptions } from "../queries.ts";

const projectRoute = getRouteApi("/_auth/projects/$projectId");

export const Route = createFileRoute("/_auth/projects/$projectId/issues/new")({
  // No queries of its own: it reads the project route's raffle.
  component: NewIssue,
});

function NewIssue() {
  const { raffle } = projectRoute.useLoaderData();
  const { data: members } = raffle.members.useSuspenseQuery();
  const { data: labels } = raffle.labels.useSuspenseQuery();
  const { data: project } = raffle.project.useSuspenseQuery();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const createIssueMutation = useMutation({
    mutationFn: (fields: ReturnType<typeof readIssueFields>) =>
      createIssue({ data: { projectId: project.id, ...fields } }),
    onSuccess: async (issue) => {
      // Seed the new issue's cache entry, so its page opens without fetching.
      queryClient.setQueryData(issueOptions(issue.id).queryKey, issue);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["issues", "list", project.id] }),
        queryClient.invalidateQueries({ queryKey: dashboardKey(project.id) }),
      ]);
      await navigate({
        to: "/projects/$projectId/issues/$issueId",
        params: { projectId: project.id, issueId: String(issue.id) },
      });
    },
  });

  return (
    <form
      action={async (formData) => {
        // A failure shows below, from `createIssueMutation.error`.
        await createIssueMutation.mutateAsync(readIssueFields(formData)).catch(() => {});
      }}
    >
      {createIssueMutation.error ? <ErrorBox error={createIssueMutation.error} /> : null}
      <IssueFields members={members} labels={labels} />
    </form>
  );
}
