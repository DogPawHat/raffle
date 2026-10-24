# raffle

Render-as-you-fetch query handles for TanStack Router and Start, built on
TanStack Query.

A route registers `queryOptions` in its `context`. Its loader starts them and
returns a **raffle**: one hook per query, typed from its options.

```tsx
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

function PostPage() {
  const { raffle } = Route.useLoaderData();
  const { data: post } = raffle.post.useSuspenseQuery();
  const { data: count } = raffle.comments.useQuery({ select: (c) => c.length });
  // ...
}
```

| Path                                                         | What                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`packages/raffle`](./packages/raffle)                       | `@raffle/react`, the library                                            |
| [`examples/start-basic`](./examples/start-basic)             | A TanStack Start app using it, with SSR streaming                       |
| [`examples/start-query`](./examples/start-query)             | The same app with plain TanStack Query, `queryOptions` in route context |
| [`examples/start-raf-query`](./examples/start-raf-query)     | The same app with [raf-query](https://github.com/KATT/raf-query)        |
| [`examples/tracker-query`](./examples/tracker-query)         | An issue tracker with plain TanStack Query                              |
| [`examples/tracker-raffle`](./examples/tracker-raffle)       | The same tracker with raffle                                            |
| [`examples/tracker-raf-query`](./examples/tracker-raf-query) | The same tracker with raf-query                                         |
| [`examples/tracker-shared`](./examples/tracker-shared)       | The tracker's database, server functions and presentational components  |

The three `start-*` examples render the same pages, so the patterns can be compared side by side:

- **`start-basic`** registers `queryOptions` in each route's `context`, starts them in the loader and reads them through the raffle the loader returns.
- **`start-query`** follows TkDodo's [Reliable Query Prefetching with TanStack Router](https://tkdodo.eu/blog/reliable-query-prefetching-with-tanstack-router): each route builds its `queryOptions` in `context`, the loader passes them to `queryClient.query()` (awaited, or not awaited with `.catch(noop)`), and components read the same objects with `Route.useRouteContext()` and `useSuspenseQuery` or `useQuery`.
- **`start-raf-query`** uses raf-query: the loader calls `prefetch` or `ensure` and returns handles, and a component can only read a query through `useQuery(factory, handle)`, so every query must be started before it's read.

The tracker is a bigger comparison: sign-in, nested layouts, filters and pagination in the URL, paged comments, a dependent query, search-as-you-type, mutations with optimistic updates, and a polling, partly failing dashboard. See [`examples/TRACKER.md`](./examples/TRACKER.md) for line counts and a case-by-case comparison.

### What the tracker shows

No approach wins on code size. The three trackers are within 4% of each other (846, 858 and 880 lines), and most of that gap is style. The differences are in what each approach enforces and what it costs:

- **TanStack Query** is the most flexible and needs no escape hatches, but nothing stops a component fetching on render.
- **raffle** currently reads like TanStack Query with renamed hooks: about 15% of its lines differ from `tracker-query`, nearly all mechanically. It adds route wiring (`.with(routeId, …)`, re-listing parent queries in child loaders, the serialization adapter) and falls back to plain TanStack Query for infinite queries, dependent queries and render-time inputs, so on its own its guarantee is opt-in.
- **raf-query** is the only structurally different one. It enforces render-as-you-fetch through handles and supports infinite queries natively, but it has no `useMutation`, so every write is built from React actions.

raffle earns its place if its guarantee is enforced. A lint rule that bans TanStack Query's read hooks (`useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useSuspenseInfiniteQuery`, `useQueries`, `usePrefetchQuery`) in components, while still allowing `useMutation` and `useQueryClient`, would make loader-started queries the only readable ones. In the tracker it would flag three reads today: the paged comments, the assignee card and the assignee search. Clearing them needs two things raffle doesn't have yet:

1. infinite query support, and
2. a named escape hatch for inputs only known at render time, like raf-query's `useWaterfall`.

With those, raffle would offer raf-query's enforcement while keeping the TanStack Query ecosystem: `useMutation` and its optimistic `variables`, the devtools, `react-router-ssr-query` and existing `queryOptions`. [`examples/TRACKER.md`](./examples/TRACKER.md) has the details, and the tracker's known issues.

## Development

```bash
vp install
vp run dev                   # build the library, then run the raffle example on :3000
vp run dev:query             # run the TanStack Query example on :3001
vp run dev:raf-query         # run the raf-query example on :3002
vp run dev:tracker-raffle    # build the library, then run the raffle tracker on :3010
vp run dev:tracker-query     # run the TanStack Query tracker on :3011
vp run dev:tracker-raf-query # run the raf-query tracker on :3012
vp run ready                 # check, test and build everything
```
