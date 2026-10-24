import { type QueryHandle, useQuery, useQueryClient } from "@raf-query/react";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, use } from "react";

import { commentsQuery, postQuery } from "../data/api.ts";

export const Route = createFileRoute("/posts/$postId")({
  // Starts both queries without waiting: `prefetch` returns each handle at
  // once. The post suspends briefly, and the slow comments stream in from the
  // server after the first HTML is sent.
  loader: ({ context: { queryClient }, params: { postId } }) => ({
    post: queryClient.prefetch(postQuery, { postId }),
    comments: queryClient.prefetch(commentsQuery, { postId }),
  }),
  pendingComponent: () => <p className="muted">Loading post…</p>,
  component: PostPage,
});

function PostPage() {
  const data = Route.useLoaderData();
  // `prefetch` didn't wait, so this is a promise; `use()` suspends until it lands.
  const [postPromise] = useQuery(postQuery, data.post);
  const post = use(postPromise);
  // Read the promise's status instead of suspending: undefined until it lands.
  const [commentsPromise] = useQuery(commentsQuery, data.comments);
  const commentCount =
    commentsPromise.status === "fulfilled" ? commentsPromise.value.length : undefined;
  const queryClient = useQueryClient();

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
      <p className="muted">
        Fetched at {post.fetchedAt} ·{" "}
        <button
          type="button"
          onClick={() => void queryClient.invalidate(postQuery, { postId: post.id })}
        >
          Refetch post
        </button>
      </p>
      <div className="comments">
        <h2>Comments {commentCount === undefined ? "" : `(${commentCount})`}</h2>
        <Suspense fallback={<p className="muted">Loading comments…</p>}>
          <Comments handle={data.comments} />
        </Suspense>
      </div>
    </article>
  );
}

function Comments({ handle }: { handle: QueryHandle<typeof commentsQuery> }) {
  const [commentsPromise] = useQuery(commentsQuery, handle);
  const comments = use(commentsPromise);

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
