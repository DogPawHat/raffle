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

## Development

```bash
vp install
vp run dev           # build the library, then run the raffle example on :3000
vp run dev:query     # run the TanStack Query example on :3001
vp run dev:raf-query # run the raf-query example on :3002
vp run dev:tracker-query # run a tracker: dev:tracker-raffle (:3010), dev:tracker-query (:3011), dev:tracker-raf-query (:3012)
vp run ready         # check, test and build everything
```
