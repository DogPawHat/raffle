import { noop, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { commentsOptions, postOptions } from "../data/api.ts";

export const Route = createFileRoute("/posts/$postId")({
  // Built from params only, once per match. Child routes and components read
  // these options from context instead of rebuilding them.
  context: ({ params }) => ({
    postQuery: postOptions(params.postId),
    commentsQuery: commentsOptions(params.postId),
  }),
  // Starts both queries without waiting: the post suspends briefly, and the
  // slow comments stream in from the server after the first HTML is sent.
  // Errors are swallowed here; the components' suspense queries throw them.
  loader: ({ context: { queryClient, postQuery, commentsQuery } }) => {
    void queryClient.query(postQuery).catch(noop);
    void queryClient.query(commentsQuery).catch(noop);
  },
  pendingComponent: () => <p className="muted">Loading post…</p>,
  component: PostPage,
});

function PostPage() {
  const { postQuery, commentsQuery } = Route.useRouteContext();
  const { data: post } = useSuspenseQuery(postQuery);
  // Spread the options to add `select`: same cached query, a different shape
  // for this component.
  const { data: commentCount } = useQuery({
    ...commentsQuery,
    select: (comments) => comments.length,
  });
  const queryClient = useQueryClient();

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <p className="muted">
        Fetched at {post.fetchedAt} ·{" "}
        <button
          type="button"
          onClick={() =>
            void queryClient.invalidateQueries({ queryKey: postQuery.queryKey, exact: true })
          }
        >
          Refetch post
        </button>
      </p>
      <div className="comments">
        <h2>Comments {commentCount === undefined ? "" : `(${commentCount})`}</h2>
        <Suspense fallback={<p className="muted">Loading comments…</p>}>
          <Comments />
        </Suspense>
      </div>
    </article>
  );
}

function Comments() {
  const { commentsQuery } = Route.useRouteContext();
  const { data: comments } = useSuspenseQuery(commentsQuery);

  if (comments.length === 0) {
    return <p className="muted">No comments yet.</p>;
  }
  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id}>
          <strong>{comment.author}:</strong> {comment.body}
        </li>
      ))}
    </ul>
  );
}
