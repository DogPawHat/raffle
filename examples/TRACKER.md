# The tracker, three ways

A small issue tracker built three times on TanStack Start, once per data-loading approach. The apps have the same routes, the same features and the same UI. Only how they start and read queries differs.

| App                                        | Port | Approach                                                                              |
| ------------------------------------------ | ---- | ------------------------------------------------------------------------------------- |
| [`tracker-query`](./tracker-query)         | 3011 | Plain TanStack Query, with `queryOptions` built in route `context` (TkDodo's pattern) |
| [`tracker-raffle`](./tracker-raffle)       | 3010 | raffle on top of TanStack Query                                                       |
| [`tracker-raf-query`](./tracker-raf-query) | 3012 | [raf-query](https://github.com/KATT/raf-query)                                        |

[`tracker-shared`](./tracker-shared) holds everything that isn't data loading: a seeded in-memory database, the Start server functions, and presentational components that only take props. Every server function waits a little, so loading states and streaming are visible.

```bash
vp run dev:tracker-query       # or dev:tracker-raffle, dev:tracker-raf-query
```

Sign in as anyone; there are no passwords.

## Features

| Feature                                                              | What it exercises                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Sign-in; the session is loaded in the root and read deep in the tree | Inherited queries; a `beforeLoad` guard that needs data    |
| Project layout with members and labels for every page below it       | Parent queries read by child routes                        |
| Issues list: status, assignee and label filters, sort, pages in URL  | `validateSearch` + `loaderDeps`; queries keyed by search   |
| Issue page: the issue, its assignee, paged comments                  | Waiting vs. streaming; a dependent query; infinite queries |
| Status change, reassign, add comment, create issue                   | Mutations, optimistic UI, invalidation, cache seeding      |
| Assignee picker that searches as you type                            | A query whose input only exists at render time             |
| Dashboard with four widgets                                          | Independent streaming; per-widget errors and retry         |
| Activity widget                                                      | Polling                                                    |
| Missing project or issue                                             | 404s from a server function                                |

All three apps make the same choices about waiting. The project layout, issues list and issue wait in their loaders. The comments, the assignee and the dashboard widgets stream.

## Size

Non-blank, non-comment lines in `src/`, excluding the generated route tree:

| App               | Lines | Files |
| ----------------- | ----: | ----: |
| tracker-query     |   846 |    17 |
| tracker-raffle    |   858 |    17 |
| tracker-raf-query |   880 |    18 |

The totals are within 4% of each other. raf-query's query factories take an input object, which makes `queries.ts` about 20 lines longer. Its comments component is 15 lines longer because of the `useActionState` error handling. Its dashboard and widget wrapper are shorter.

## How each approach handles the hard parts

| Case                              | TanStack Query                                                                        | raffle                                                                                                                                     | raf-query                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Reading a query**               | `useSuspenseQuery(context.issueQuery)`                                                | `raffle.issue.useSuspenseQuery()` from loader data                                                                                         | `useQuery(issueQuery, handle)`: data for `ensure` handles, a promise to `use()` for `prefetch` handles |
| **What stops fetch-on-render**    | Convention: options come from context, but any component can pass any options         | Only queries the route's loader started can be read                                                                                        | Reading needs a handle. Fetch-on-render only through `useWaterfall`                                    |
| **Parent's queries in a child**   | Inherited through route context                                                       | Child's factory inherits them; the child's loader starts them by name                                                                      | Not inherited: children read the parent's loader data through `getRouteApi` (`project.ts`)             |
| **Session guard in `beforeLoad`** | `queryClient.query(context.sessionQuery)`                                             | Falls back to `queryClient.query(raffle.getOptions("session"))`: a raffle holds hooks, not data. An extra loader hands components a raffle | `qc.ensure(sessionQuery)`, and the handle goes into context                                            |
| **Search-param queries**          | `context: ({ deps })`                                                                 | Same, through `.with()`                                                                                                                    | The loader passes `deps` as the input                                                                  |
| **Dependent query (assignee)**    | Loader starts it after the issue arrives; component builds its options from the issue | Same, plus reading the issue back with `getQueryData`, since `loadQueries` returns hooks                                                   | Loader `prefetch` after `ensure`; component uses `useWaterfall`, which reuses that request             |
| **Infinite comments**             | `infiniteQuery` + `useSuspenseInfiniteQuery`                                          | Not supported. Falls back to the TanStack Query pattern. Registering `infiniteQueryOptions` type-checks but would cache the wrong shape    | Native: `infiniteQueryOptions` and the same `useQuery`                                                 |
| **Search-as-you-type**            | `useQuery` + `keepPreviousData`                                                       | Same as TanStack Query                                                                                                                     | `useWaterfall` + `whilePending: "previous"`                                                            |
| **Mutations**                     | `useMutation`; optimistic via `variables`                                             | Same as TanStack Query                                                                                                                     | No `useMutation`: actions, `useOptimistic`, `useActionState`, then `invalidate`/`setData`              |
| **Widget error retry**            | Needs `QueryErrorResetBoundary`                                                       | Same as TanStack Query                                                                                                                     | Resetting the boundary refetches; no extra wiring                                                      |
| **Polling**                       | `refetchInterval` read option                                                         | Same, as a hook override                                                                                                                   | `refetchInterval` read option                                                                          |
| **Server render errors**          | Real message in development, redacted in production                                   | Same                                                                                                                                       | Redacted even in development unless `keepErrors: true`                                                 |

## Takeaways

- **No approach is meaningfully shorter at this size.** The difference is what each one enforces, not how much code it takes.
- **TanStack Query is the most flexible and the least enforced.** Options in context keep loaders and components in sync, but nothing stops a component fetching on render. It handles every case here without escape hatches.
- **raffle makes started queries the only readable ones, for plain queries.** It falls back to TanStack Query for infinite queries, dependent queries, render-time inputs, guards that need data, and mutations. In the issue page, raffle and plain queries sit side by side. The infinite-query gap is the sharpest: it type-checks and then misbehaves.
- **raf-query enforces render-as-you-fetch everywhere, including infinite queries.** Its escape hatches are named and searchable (`useWaterfall`). In exchange, you get no context inheritance, mutations are built from React primitives, and query factories carry a little more boilerplate.
- **Some costs hit all three.** A dependent query needs its parent's data in the loader in every approach. Child loaders run in parallel with their parent's, so a missing project still starts the dashboard's queries before the 404.
