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

The totals are within 4% of each other, and most of the gap is style rather than the libraries:

- raf-query's `queries.ts` is about 20 lines longer, mostly because its factories are written as `function x() { return queryOptions(...) }` where the others use one-expression arrows. The input objects cost almost nothing.
- Its comments component is 15 lines longer: about half is the props type (the issue and the comments handle are passed in), and the rest is `useActionState` error handling and showing every pending comment rather than only the latest.
- Its dashboard and widget wrapper are shorter: `use()` replaces `.catch(noop)`, and retry needs no `QueryErrorResetBoundary`.

The apps also differ in a few unforced ways that a stricter comparison would even out. raf-query passes the issue to `IssueStatus`, `Assignee` and `Comments` as a prop, while the other two re-read it from the route in each child. raf-query's new-issue page reads the project id from the params, while the other two read the project query for it. raf-query's login wraps the users in a `<form>` with submit buttons, while the others use `onClick`.

Line by line, `tracker-raffle` differs from `tracker-query` in about 15% of its lines, nearly all mechanical (`Route.useRouteContext()` + `useSuspenseQuery(xQuery)` becomes `Route.useLoaderData()` + `raffle.x.useSuspenseQuery()`). `tracker-raf-query` differs in about 40%.

## How each approach handles the hard parts

| Case                              | TanStack Query                                                                        | raffle                                                                                                                                         | raf-query                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Reading a query**               | `useSuspenseQuery(context.issueQuery)`                                                | `raffle.issue.useSuspenseQuery()` from loader data                                                                                             | `useQuery(issueQuery, handle)`: data for `ensure` handles, a promise to `use()` for `prefetch` handles                             |
| **What stops fetch-on-render**    | Convention: options come from context, but any component can pass any options         | Raffle hooks only read queries the loader started, but nothing stops a component using TanStack Query's hooks directly; three reads here do    | Reading needs a handle. Fetch-on-render only through `useWaterfall`                                                                |
| **Parent's queries in a child**   | Inherited through route context                                                       | Child's factory inherits them, but each child loader re-lists them by name to get hooks (the new-issue page reads the parent's raffle instead) | Read from the parent's loader data through `getRouteApi` (`project.ts`); the session handle goes through context from `beforeLoad` |
| **Session guard in `beforeLoad`** | `queryClient.query(context.sessionQuery)`                                             | Falls back to `queryClient.query(raffle.getOptions("session"))`: a raffle holds hooks, not data. An extra loader hands components a raffle     | `qc.ensure(sessionQuery)`, and the handle goes into context                                                                        |
| **Search-param queries**          | `context: ({ deps })`                                                                 | Same, through `.with()`                                                                                                                        | The loader passes `deps` as the input                                                                                              |
| **Dependent query (assignee)**    | Loader starts it after the issue arrives; component builds its options from the issue | Same, plus reading the issue back with `getQueryData`, since `loadQueries` returns hooks                                                       | Loader `prefetch` after `ensure`; component uses `useWaterfall`, which reuses that request                                         |
| **Infinite comments**             | `infiniteQuery` + `useSuspenseInfiniteQuery`                                          | Not supported. Falls back to the TanStack Query pattern. Registering `infiniteQueryOptions` type-checks but would cache the wrong shape        | Native: `infiniteQueryOptions` and the same `useQuery`                                                                             |
| **Search-as-you-type**            | `useQuery` + `keepPreviousData`                                                       | Same as TanStack Query                                                                                                                         | `useWaterfall` + `whilePending: "previous"`                                                                                        |
| **Mutations**                     | `useMutation`; optimistic via `variables`                                             | Same as TanStack Query                                                                                                                         | No `useMutation`: actions, `useOptimistic`, `useActionState`, then `invalidate`/`setData`                                          |
| **Widget error retry**            | Needs `QueryErrorResetBoundary`                                                       | Same as TanStack Query                                                                                                                         | Resetting the boundary refetches; no extra wiring                                                                                  |
| **Polling**                       | `refetchInterval` read option                                                         | Same, as a hook override                                                                                                                       | `refetchInterval` read option                                                                                                      |
| **Server render errors**          | Real message in development, redacted in production                                   | Same                                                                                                                                           | Redacted even in development unless `keepErrors: true`                                                                             |

## Takeaways

- **No approach is meaningfully shorter at this size.** The difference is what each one enforces, not how much code it takes. Without enforcement, none is a clear DX win or loss over the others.
- **TanStack Query is the most flexible and the least enforced.** Options in context keep loaders and components in sync, but nothing stops a component fetching on render. It handles every case here without escape hatches.
- **raffle makes started queries the only readable ones, for plain queries, but only by convention.** It falls back to TanStack Query for infinite queries, dependent queries, render-time inputs and guards that need data, and uses `useMutation` as is. In the issue page, raffle and plain queries sit side by side. The infinite-query gap is the sharpest: raffle starts every query with `queryClient.query()`, so a registered `infiniteQueryOptions` would be cached in the wrong shape. Its route wiring (`.with(routeId, …)`, re-listing parent queries, an extra `/_auth` loader, the serialization adapter) costs about what it saves on reads.
- **raf-query enforces render-as-you-fetch everywhere, including infinite queries.** Its escape hatches are named and searchable (`useWaterfall`). In exchange, children read parent queries through loader data rather than inherited context, mutations are built from React primitives, and streamed reads need an extra `use()`.
- **Some costs hit all three.** A dependent query needs its parent's data in the loader in every approach. Child loaders run in parallel with their parent's, so a missing project still starts the dashboard's queries before the 404.

## raffle with a lint rule

raffle's guarantee becomes real if it's enforced. A lint rule that bans TanStack Query's read hooks in components (`useQuery`, `useSuspenseQuery`, `useInfiniteQuery`, `useSuspenseInfiniteQuery`, `useQueries`, `usePrefetchQuery`), but allows `useMutation` and `useQueryClient`, would leave raffle's hooks as the only way to read. `no-restricted-imports` covers most of it.

In `tracker-raffle` it would flag three reads:

| Read             | Why it can't use raffle today         |
| ---------------- | ------------------------------------- |
| `Comments`       | Paged: raffle has no infinite queries |
| `AssigneeCard`   | Depends on the issue's data           |
| `AssigneePicker` | Its input only exists at render time  |

Clearing them needs two additions to raffle: infinite query support (`infiniteQuery()` in the loader, `useSuspenseInfiniteQuery` on the entry), and a named escape hatch for render-time inputs, like raf-query's `useWaterfall`. With both, raffle would offer raf-query's enforcement while keeping the TanStack Query ecosystem: `useMutation` with optimistic `variables`, the devtools, `react-router-ssr-query` and existing `queryOptions`. Neither of the other two offers that combination. The route wiring stays, so the trade becomes a little more ceremony for an enforced loader-first rule.

## Known issues

These are in all three apps unless noted:

- **The projects list's open-issue count goes stale.** `openIssueCount` lives under `["projects"]`, and neither creating an issue nor changing a status invalidates it, so it can be wrong for up to the 30-second `staleTime`. Invalidating `{ queryKey: ["projects"], exact: true }` fixes it.
- **"Assigned to me" can show another user's issues.** Its key has no user id, and signing in only removes the session. `/login` doesn't redirect signed-in users, so signing in as someone else from there shows the previous user's cached issues. Putting the user id in the key, or clearing the cache on sign-in, fixes it.
- **Reassigning flashes a skeleton.** The picker already has the new assignee, but the card fetches them again. Seeding the user's cache entry on success avoids it.
- **Status and assignee failures are silent.** They roll back, but no error is shown.
- **TanStack Query and raffle only show the latest pending comment.** Submitting a second comment while the first is saving hides the first until the refetch. raf-query shows both.
