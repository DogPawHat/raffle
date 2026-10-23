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

## Setup (TanStack Start)

```ts
// src/start.ts
export const startInstance = createStart(() => ({
  serializationAdapters: [raffleSerializationAdapter],
}));

// src/routes/__root.tsx
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  context: ({ context }) => ({ raffle: new RaffleFactory(context.queryClient) }),
});
```

Use `@tanstack/react-router-ssr-query` as usual: it dehydrates the query cache
and streams pending queries. A raffle only carries the names.

## Rules

- **Call a raffle's hooks only while the route that built it is matched.** A
  child route's component can read its parent's raffle. Calling them anywhere
  else throws.
- **Build query keys from `params` and `loaderDeps` only.** Route `context`
  doesn't receive raw search params, so search-dependent queries must go
  through `loaderDeps`. In development, the hooks log an error if the client
  derives a different key than the one the loader started.
- **The route `context` option isn't documented by TanStack Router.** This
  library depends on how it currently behaves: it runs on the server, it runs
  again on the client during hydration, and its result is cached per match.
