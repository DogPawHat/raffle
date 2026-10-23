import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

import { commentsOptions, postOptions } from "../data/api.ts";

export const Route = createFileRoute("/posts/$postId")({
  context: ({ context, params, routeId }) => ({
    raffle: context.raffle.with(routeId, {
      post: postOptions(params.postId),
      comments: commentsOptions(params.postId),
    }),
  }),
  // Starts both queries without waiting: the post suspends briefly, and the
  // slow comments stream in from the server after the first HTML is sent.
  loader: ({ context }) => ({
    raffle: context.raffle.buildQueries("post", "comments"),
  }),
  pendingComponent: () => <p className="muted">Loading post…</p>,
  component: PostPage,
});

function PostPage() {
  const { raffle } = Route.useLoaderData();
  const { data: post } = raffle.post.useSuspenseQuery();
  // Override `select`: same cached query, a different shape for this component.
  const { data: commentCount } = raffle.comments.useQuery({
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
            queryClient.invalidateQueries({ queryKey: ["posts", post.id], exact: true })
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
  const { raffle } = Route.useLoaderData();
  const { data: comments } = raffle.comments.useSuspenseQuery();

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
