import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { postsOptions } from "../data/api.ts";

export const Route = createFileRoute("/posts")({
  // Runs on the server and again on the client; never serialized. It only
  // reruns when params or loaderDeps change, so the options stay stable.
  context: () => ({ postsQuery: postsOptions() }),
  // Waits for the list, so it's in the first HTML chunk.
  loader: async ({ context }) => {
    await context.queryClient.query(context.postsQuery);
  },
  component: PostsLayout,
});

function PostsLayout() {
  // The same options the loader used, so the keys can't drift apart.
  const { postsQuery } = Route.useRouteContext();
  const { data: posts } = useSuspenseQuery(postsQuery);

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
