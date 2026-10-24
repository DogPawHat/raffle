import { useQuery } from "@raf-query/react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { postsQuery } from "../data/api.ts";

export const Route = createFileRoute("/posts")({
  // Waits for the list, so it's in the first HTML chunk. `ensure` returns a
  // handle with the data, so the component reads the posts without Suspense.
  loader: async ({ context }) => ({
    posts: await context.queryClient.ensure(postsQuery),
  }),
  component: PostsLayout,
});

function PostsLayout() {
  const data = Route.useLoaderData();
  const [posts] = useQuery(postsQuery, data.posts);

  return (
    <div className="layout">
      <aside>
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              <Link to="/posts/$postId" params={{ postId: post.id }}>
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  );
}
