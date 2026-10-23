import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { postsOptions } from "../data/api.ts";

export const Route = createFileRoute("/posts")({
  // Runs on the server and again on the client; never serialized.
  context: ({ context, routeId }) => ({
    raffle: context.raffle.with(routeId, { posts: postsOptions() }),
  }),
  // Waits for the list, so it's in the first HTML chunk.
  loader: async ({ context }) => ({
    raffle: await context.raffle.loadQueries("posts"),
  }),
  component: PostsLayout,
});

function PostsLayout() {
  const { raffle } = Route.useLoaderData();
  const { data: posts } = raffle.posts.useSuspenseQuery();

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
