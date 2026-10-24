import { queryOptions } from "@raf-query/react";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

export interface PostSummary {
  id: string;
  title: string;
}

export interface Post extends PostSummary {
  body: string;
  /** When the server produced this response, to make refetches visible. */
  fetchedAt: string;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
}

const posts: Array<Omit<Post, "fetchedAt">> = [
  {
    id: "1",
    title: "Render as you fetch",
    body: "The loader starts every query the page needs before React renders anything.",
  },
  {
    id: "2",
    title: "Handles, not data",
    body: "A loader returns handles: the key and input of each query it started. Components read the live cache with them.",
  },
  {
    id: "3",
    title: "Context runs twice",
    body: "Route context runs on the server and again on the client, so query options never cross the wire.",
  },
];

const comments: Record<string, Array<Comment>> = {
  "1": [
    { id: "1", author: "Ada", body: "No more waterfalls." },
    { id: "2", author: "Linus", body: "The comments stream in after the post." },
  ],
  "2": [{ id: "3", author: "Grace", body: "And they stay typed." }],
  "3": [],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchPosts = createServerFn({ method: "GET" }).handler(async () => {
  await sleep(200);
  return posts.map(({ id, title }): PostSummary => ({ id, title }));
});

export const fetchPost = createServerFn({ method: "GET" })
  .validator((postId: string) => postId)
  .handler(async ({ data: postId }): Promise<Post> => {
    await sleep(300);
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      throw notFound();
    }
    return { ...post, fetchedAt: new Date().toISOString() };
  });

/** Deliberately slow, so the page streams it in after the post. */
export const fetchComments = createServerFn({ method: "GET" })
  .validator((postId: string) => postId)
  .handler(async ({ data: postId }) => {
    await sleep(1500);
    return comments[postId] ?? [];
  });

// A query is a factory: the loader starts it with an input, and the component
// passes the same factory to `useQuery` with the handle the loader returned.
export function postsQuery() {
  return queryOptions({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
  });
}

export function postQuery(input: { postId: string }) {
  return queryOptions({
    queryKey: ["posts", input.postId],
    queryFn: () => fetchPost({ data: input.postId }),
  });
}

export function commentsQuery(input: { postId: string }) {
  return queryOptions({
    queryKey: ["posts", input.postId, "comments"],
    queryFn: () => fetchComments({ data: input.postId }),
  });
}
