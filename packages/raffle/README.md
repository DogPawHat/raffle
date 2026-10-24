# @raffle/react

Render-as-you-fetch query handles for TanStack Router and Start, built on
TanStack Query.

Peer dependencies: `@tanstack/react-query` ≥ 5.104 (for `queryClient.query`),
`@tanstack/react-router` ≥ 1.170, `react` 19.

## How it works

- **`RaffleFactory`** holds the queries a route can start, by name. Create one
  in the root route's `context`, and derive a child with
  `.with(routeId, { name: queryOptions })` in each route that adds queries.
  Children inherit their parent's queries and can replace them by name.
- Route `context` runs on the server and again on the client, and Router never
  serializes it. So the options, `queryFn` included, exist on both sides
  without crossing the wire.
- **`factory.buildQueries(...names)`** starts the named queries without
  waiting and returns a **`Raffle`**. **`await factory.loadQueries(...names)`**
  waits until they all have data, and rejects if one fails.
- A `Raffle` holds only the route id and each query's hash.
  `raffle.<name>.useQuery(overrides?)` and `.useSuspenseQuery(overrides?)` find
  the options in that route's context, merge `overrides` over them, and call
  TanStack Query's hook. Overrides can change anything except `queryKey`,
  `queryHash` and `queryKeyHashFn`. An override `select` replaces the
  registered one and re-types the result.
- **`raffleSerializationAdapter`** sends a raffle from server to client as
  `{ routeId, hashes }` and rebuilds the hooks there. Register it in
  `createStart({ serializationAdapters })`. Without it, SSR fails when it
  serializes loader data.

## Setup

These steps assume a TanStack Start app with file-based routes. Every file below has a working version in [`examples/start-basic`](../../examples/start-basic).

### 1. Install

```bash
pnpm add @raffle/react @tanstack/react-query @tanstack/react-router @tanstack/react-router-ssr-query
```

### 2. Put a `QueryClient` in the router context

Create one `QueryClient` per router. On the server, Start creates a router per request, so each request gets its own cache. Connect the router to the cache with the SSR query integration.

```tsx
// src/router.tsx
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen.ts";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
  });

  // Dehydrates the cache on the server (streaming pending queries) and
  // hydrates it on the client.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}
```

### 3. Register the serialization adapter

The adapter is what lets a loader return a raffle. Without it, server rendering fails when it serializes loader data.

```ts
// src/start.ts
import { raffleSerializationAdapter } from "@raffle/react";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  serializationAdapters: [raffleSerializationAdapter],
}));
```

If you use TanStack Router without Start, loader data never gets serialized, so you can skip this step.

### 4. Create the root factory in the root route

The root route's `context` creates the factory every other route builds on. It starts with no queries.

```tsx
// src/routes/__root.tsx
import { RaffleFactory } from "@raffle/react";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  context: ({ context }) => ({ raffle: new RaffleFactory(context.queryClient) }),
  // head, shellComponent, component, ...
});
```

Use the key `raffle` in every route. Each route's factory replaces its parent's under that key, which is how the queries add up from parent to child.

### 5. Register queries in a route and start them in its loader

Each route that needs data does two things:

- **`context`** registers its `queryOptions` by name with `context.raffle.with(routeId, {...})`. Build the options from `params` and `deps` only.
- **`loader`** starts the queries and returns the raffle.

```tsx
// src/routes/posts.$postId.tsx
import { createFileRoute } from "@tanstack/react-router";

import { commentsOptions, postOptions } from "../data/api.ts";

export const Route = createFileRoute("/posts/$postId")({
  context: ({ context, params, routeId }) => ({
    raffle: context.raffle.with(routeId, {
      post: postOptions(params.postId),
      comments: commentsOptions(params.postId),
    }),
  }),
  loader: ({ context }) => ({
    raffle: context.raffle.buildQueries("post", "comments"),
  }),
  component: PostPage,
});
```

There are two ways to start queries:

| Call                                         | Waits?                     | Use it when                                                                                 |
| -------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `context.raffle.buildQueries(...names)`      | No                         | The page can render with Suspense fallbacks. Pending queries stream from the server.        |
| `await context.raffle.loadQueries(...names)` | Until every query has data | The data must be in the first HTML chunk, or the loader needs it. Rejects if a query fails. |

`queryOptions` that are disabled (`enabled: false` or `skipToken`) are registered but never started.

### 6. Read the queries in components

```tsx
import { Suspense } from "react";

function PostPage() {
  const { raffle } = Route.useLoaderData();

  // Suspends until the post has data.
  const { data: post } = raffle.post.useSuspenseQuery();

  // Doesn't suspend. Override `select` re-types the result.
  const { data: commentCount } = raffle.comments.useQuery({
    select: (comments) => comments.length,
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments />
      </Suspense>
    </article>
  );
}

function Comments() {
  const { raffle } = Route.useLoaderData();
  const { data: comments } = raffle.comments.useSuspenseQuery();
  return (
    <ul>
      {comments.map((c) => (
        <li key={c.id}>{c.body}</li>
      ))}
    </ul>
  );
}
```

The hooks take the same options as TanStack Query's `useQuery` and `useSuspenseQuery`, except `queryKey`, `queryHash` and `queryKeyHashFn`. Those are fixed by the registered query.

### 7. Nested routes

A child route's `context` gets its parent's factory as `context.raffle`. Calling `.with()` on it keeps the parent's queries and adds the child's:

```tsx
// src/routes/posts.tsx: registers `posts`
export const Route = createFileRoute("/posts")({
  context: ({ context, routeId }) => ({
    raffle: context.raffle.with(routeId, { posts: postsOptions() }),
  }),
  loader: async ({ context }) => ({
    raffle: await context.raffle.loadQueries("posts"),
  }),
  component: PostsLayout,
});

// src/routes/posts.$postId.tsx: registers `post` and `comments`, inherits `posts`
export const Route = createFileRoute("/posts/$postId")({
  context: ({ context, params, routeId }) => ({
    raffle: context.raffle.with(routeId, {
      post: postOptions(params.postId),
      comments: commentsOptions(params.postId),
    }),
  }),
  // Can start inherited queries too.
  loader: ({ context }) => ({
    raffle: context.raffle.buildQueries("posts", "post", "comments"),
  }),
});
```

- **A child can replace an inherited query** by registering one with the same name.
- **A route with no `context` callback** inherits its parent's factory unchanged. Its loader can still start the parent's queries.
- **A route that calls `new RaffleFactory(...)`** instead of `context.raffle.with(...)` starts again with no queries.
- **Sibling routes** don't see each other's queries.
- **Components can read their own route's raffle and any parent route's raffle**, because every parent route is matched while a child renders.

## Rules

- **Call a raffle's hooks only while the route that built it is matched.** A
  child route's component can read its parent's raffle. Calling them anywhere
  else throws.
- **Build query keys from `params` and `loaderDeps` only.** Route `context`
  doesn't receive raw search params, so search-dependent queries must go
  through `loaderDeps`. In development, the hooks log an error if the client
  derives a different key than the one the loader started.
- **Don't depend on inherited queries built from a parent's search-based
  `loaderDeps`.** Router caches each route's `context` result per match. If
  only the parent's `loaderDeps` change (say `?page=1` → `?page=2` under
  `/list/$id`), the parent's context runs again but the child's doesn't. The
  child's factory keeps the parent's old options, so starting or reading the
  inherited query from the child gives the old page. Parent path params are
  safe: changing them gives the child a new match, which runs its `context`
  again. Until this is fixed, start and read such queries from the parent
  route's own raffle.
- **The route `context` option isn't documented by TanStack Router.** This
  library depends on how it currently behaves: it runs on the server, it runs
  again on the client during hydration, and its result is cached per match.
