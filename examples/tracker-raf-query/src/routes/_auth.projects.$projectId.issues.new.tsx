import { createIssue } from "@examples/tracker/server";
import { ErrorBox, IssueFields, readIssueFields } from "@examples/tracker/ui";
import { useQueryClient } from "@raf-query/react";
import { createFileRoute } from "@tanstack/react-router";
import { useActionState } from "react";

import { useProjectLookups } from "../project.ts";
import { dashboardKey, issueQuery } from "../queries.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/issues/new")({
  // No queries of its own: the members and labels come from the project route.
  component: NewIssue,
});

function NewIssue() {
  const { members, labels } = useProjectLookups();
  const { projectId } = Route.useParams();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [error, createIssueAction] = useActionState(
    async (_previous: unknown, formData: FormData) => {
      let issue;
      try {
        issue = await createIssue({ data: { projectId, ...readIssueFields(formData) } });
      } catch (error) {
        return error;
      }
      // Seed the new issue's cache entry, so its page opens without fetching.
      queryClient.setData(issueQuery, { issueId: issue.id }, issue);
      await Promise.all([
        queryClient.invalidate({ queryKey: ["issues", "list", projectId] }),
        queryClient.invalidate({ queryKey: dashboardKey(projectId) }),
      ]);
      await navigate({
        to: "/projects/$projectId/issues/$issueId",
        params: { projectId, issueId: String(issue.id) },
      });
      return null;
    },
    null,
  );

  return (
    <form action={createIssueAction}>
      {error ? <ErrorBox error={error} /> : null}
      <IssueFields members={members} labels={labels} />
    </form>
  );
}
