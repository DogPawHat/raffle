import { addComment } from "@examples/tracker/server";
import { CommentFields, CommentItem, ErrorBox, formText } from "@examples/tracker/ui";
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { dashboardKey } from "../queries.ts";
import { useMe } from "../session.ts";

const issueRoute = getRouteApi("/_auth/projects/$projectId/issues/$issueId");

export function Comments() {
  const { commentsQuery, issueQuery, membersQuery } = issueRoute.useRouteContext();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(commentsQuery);
  const { data: issue } = useSuspenseQuery(issueQuery);
  const { data: members } = useSuspenseQuery(membersQuery);
  const me = useMe();
  const queryClient = useQueryClient();
  const addCommentMutation = useMutation({
    mutationFn: (body: string) => addComment({ data: { issueId: issue.id, body } }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ["issues", "list", issue.projectId] }),
        queryClient.invalidateQueries({ queryKey: dashboardKey(issue.projectId) }),
      ]),
  });
  const comments = data.pages.flatMap((page) => page.comments);
  const total = data.pages[0]?.total ?? 0;

  return (
    <section>
      <h2>
        {total} {total === 1 ? "comment" : "comments"}
      </h2>
      <form
        action={async (formData) => {
          // A failure shows below, from `addCommentMutation.error`.
          await addCommentMutation.mutateAsync(formText(formData, "body")).catch(() => {});
        }}
      >
        <CommentFields me={me} />
      </form>
      {addCommentMutation.error ? <ErrorBox error={addCommentMutation.error} /> : null}
      <ul className="comments">
        {addCommentMutation.isPending ? (
          // Optimistic: the comment as it was typed, until the refetch replaces it.
          <CommentItem
            comment={{ body: addCommentMutation.variables, createdAt: new Date().toISOString() }}
            author={me}
            pending
          />
        ) : null}
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            author={members.find((m) => m.id === comment.authorId)}
          />
        ))}
      </ul>
      {hasNextPage ? (
        <button type="button" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
          {isFetchingNextPage ? "Loading…" : "Load older"}
        </button>
      ) : null}
    </section>
  );
}
