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

| Path                                             | What                                              |
| ------------------------------------------------ | ------------------------------------------------- |
| [`packages/raffle`](./packages/raffle)           | `@raffle/react`, the library                      |
| [`examples/start-basic`](./examples/start-basic) | A TanStack Start app using it, with SSR streaming |

## Development

```bash
vp install
vp run dev          # build the library, then run the example on :3000
vp run ready        # check, test and build everything
```
