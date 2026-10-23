import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRouter,
} from "@tanstack/react-router";
import { Suspense, type ReactNode } from "react";

import { RaffleFactory, type Raffle } from "../src/index.ts";

export interface Post {
  id: string;
  title: string;
}

export interface Comment {
  id: string;
  body: string;
}

export function createApi() {
  const calls = { post: 0, comments: 0 };
  return {
    calls,
    postOptions: (postId: string) =>
      queryOptions({
        queryKey: ["post", postId],
        queryFn: async (): Promise<Post> => {
          calls.post++;
          return { id: postId, title: `Post ${postId}` };
        },
      }),
    commentsOptions: (postId: string) =>
      queryOptions({
        queryKey: ["post", postId, "comments"],
        queryFn: async (): Promise<Array<Comment>> => {
          calls.comments++;
          return [
            { id: "1", body: "First" },
            { id: "2", body: "Second" },
          ];
        },
      }),
  };
}

export type Api = ReturnType<typeof createApi>;

export type PostRaffle = Raffle<{
  post: ReturnType<Api["postOptions"]>;
  comments: ReturnType<Api["commentsOptions"]>;
}>;

export function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/**
 * A root route holding a factory, and `/posts/$postId` registering `post` and
 * `comments`. `transport` runs on the loader's raffle, to simulate the trip
 * from server to client.
 */
export function createTestRouter(options: {
  queryClient: QueryClient;
  api: Api;
  PostPage: (props: { raffle: PostRaffle }) => ReactNode;
  transport?: <T>(raffle: T) => T;
}) {
  const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
    context: ({ context }) => ({ raffle: new RaffleFactory(context.queryClient) }),
    component: () => (
      <Suspense fallback={<p>loading</p>}>
        <Outlet />
      </Suspense>
    ),
  });

  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
    context: ({ context, params, routeId }) => ({
      raffle: context.raffle.with(routeId, {
        post: options.api.postOptions(params.postId),
        comments: options.api.commentsOptions(params.postId),
      }),
    }),
    loader: ({ context }) => {
      const raffle = context.raffle.buildQueries("post", "comments");
      return { raffle: options.transport ? options.transport(raffle) : raffle };
    },
    component: () => <options.PostPage raffle={postRoute.useLoaderData().raffle} />,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([postRoute]),
    history: createMemoryHistory({ initialEntries: ["/posts/1"] }),
    context: { queryClient: options.queryClient },
  });

  return { router, postRoute };
}

export function App(props: { queryClient: QueryClient; router: AnyRouter }) {
  return (
    <QueryClientProvider client={props.queryClient}>
      <RouterProvider router={props.router} />
    </QueryClientProvider>
  );
}
