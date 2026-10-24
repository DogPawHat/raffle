import { queryOptions } from "@tanstack/react-query";
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
    title: "Options in context",
    body: "The route's context builds its query options once. The loader and the components read the same object, so their keys can't drift apart.",
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

export const postsOptions = () =>
  queryOptions({
    queryKey: ["posts"],
    queryFn: () => fetchPosts(),
  });

export const postOptions = (postId: string) =>
  queryOptions({
    queryKey: ["posts", postId],
    queryFn: () => fetchPost({ data: postId }),
  });

export const commentsOptions = (postId: string) =>
  queryOptions({
    queryKey: ["posts", postId, "comments"],
    queryFn: () => fetchComments({ data: postId }),
  });
