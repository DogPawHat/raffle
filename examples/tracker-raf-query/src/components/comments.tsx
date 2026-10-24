import { addComment } from "@examples/tracker/server";
import type { Issue } from "@examples/tracker/types";
import { CommentFields, CommentItem, ErrorBox, formText } from "@examples/tracker/ui";
import { type QueryHandle, useQuery, useQueryClient } from "@raf-query/react";
import { use, useActionState, useOptimistic } from "react";

import { useProjectLookups } from "../project.ts";
import { commentsQuery, dashboardKey } from "../queries.ts";
import { useMe } from "../session.ts";

export function Comments({
  issue,
  handle,
}: {
  issue: Issue;
  handle: QueryHandle<typeof commentsQuery>;
}) {
  const [pagesPromise, comments] = useQuery(commentsQuery, handle);
  const pages = use(pagesPromise);
  const { members } = useProjectLookups();
  const me = useMe();
  const queryClient = useQueryClient();
  // Optimistic: the comment as it was typed, until the refetch replaces it.
  const [pendingBodies, addPendingBody] = useOptimistic<Array<string>, string>(
    [],
    (current, body) => [body, ...current],
  );
  const [error, addCommentAction] = useActionState(
    async (_previous: unknown, formData: FormData) => {
      const body = formText(formData, "body");
      addPendingBody(body);
      let failure: unknown = null;
      try {
        await addComment({ data: { issueId: issue.id, body } });
      } catch (error) {
        failure = error;
      }
      await Promise.all([
        queryClient.invalidate(commentsQuery, { issueId: issue.id }),
        queryClient.invalidate({ queryKey: ["issues", "list", issue.projectId] }),
        queryClient.invalidate({ queryKey: dashboardKey(issue.projectId) }),
      ]);
      return failure;
    },
    null,
  );
  const loaded = pages.pages.flatMap((page) => page.comments);
  const total = pages.pages[0]?.total ?? 0;

  return (
    <section>
      <h2>
        {total} {total === 1 ? "comment" : "comments"}
      </h2>
      <form action={addCommentAction}>
        <CommentFields me={me} />
      </form>
      {error ? <ErrorBox error={error} /> : null}
      <ul className="comments">
        {pendingBodies.map((body, index) => (
          <CommentItem
            key={index}
            comment={{ body, createdAt: new Date().toISOString() }}
            author={me}
            pending
          />
        ))}
        {loaded.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            author={members.find((m) => m.id === comment.authorId)}
          />
        ))}
      </ul>
      {comments.hasNextPage ? (
        <button
          type="button"
          disabled={comments.isFetchingNextPage}
          onClick={() => void comments.fetchNextPage()}
        >
          {comments.isFetchingNextPage ? "Loading…" : "Load older"}
        </button>
      ) : null}
    </section>
  );
}
