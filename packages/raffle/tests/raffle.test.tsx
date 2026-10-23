import { cleanup, render, screen } from "@testing-library/react";
import {
  queryOptions,
  type UseQueryResult,
  type UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { afterEach, describe, expect, expectTypeOf, test, vi } from "vite-plus/test";

import {
  createRaffle,
  isRaffle,
  raffleSerializationAdapter,
  raffleState,
  RaffleFactory,
  type AnyRaffle,
} from "../src/index.ts";
import {
  App,
  createApi,
  createQueryClient,
  createTestRouter,
  type Comment,
  type Post,
  type PostRaffle,
} from "./helpers.tsx";

afterEach(cleanup);

/** What a raffle looks like after the server → client trip. */
function viaAdapter<T>(raffle: T): T {
  const wire = JSON.parse(
    JSON.stringify(raffleSerializationAdapter.toSerializable(raffle as AnyRaffle)),
  );
  return raffleSerializationAdapter.fromSerializable(wire) as T;
}

describe("RaffleFactory", () => {
  test("with() adds queries without starting them", () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const factory = new RaffleFactory(queryClient).with("/posts/$postId", {
      post: api.postOptions("1"),
    });

    expect(factory.routeId).toBe("/posts/$postId");
    expect(factory.getOptions("post").queryKey).toEqual(["post", "1"]);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  test("with() inherits and replaces parent queries", () => {
    const api = createApi();
    const parent = new RaffleFactory(createQueryClient()).with("/a", {
      post: api.postOptions("1"),
      comments: api.commentsOptions("1"),
    });
    const child = parent.with("/a/b", { post: api.postOptions("2") });

    expect(child.getOptions("post").queryKey).toEqual(["post", "2"]);
    expect(child.getOptions("comments").queryKey).toEqual(["post", "1", "comments"]);
    expect(parent.getOptions("post").queryKey).toEqual(["post", "1"]);
  });

  test("buildQueries() starts the named queries and returns their hashes", async () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const factory = new RaffleFactory(queryClient).with("/p", {
      post: api.postOptions("1"),
      comments: api.commentsOptions("1"),
    });

    const raffle = factory.buildQueries("post");

    expect(isRaffle(raffle)).toBe(true);
    expect(raffleState(raffle)).toEqual({
      routeId: "/p",
      hashes: { post: '["post","1"]' },
    });
    expect(queryClient.getQueryState(["post", "1"])?.fetchStatus).toBe("fetching");
    expect(queryClient.getQueryState(["post", "1", "comments"])).toBeUndefined();
    await vi.waitFor(() => expect(queryClient.getQueryData(["post", "1"])).toBeDefined());
  });

  test("buildQueries() swallows errors; loadQueries() waits and rejects", async () => {
    const queryClient = createQueryClient();
    const failing = queryOptions({
      queryKey: ["failing"],
      queryFn: async (): Promise<string> => {
        throw new Error("boom");
      },
    });
    const factory = new RaffleFactory(queryClient).with("/p", { failing });

    expect(() => factory.buildQueries("failing")).not.toThrow();
    await expect(factory.loadQueries("failing")).rejects.toThrow("boom");
  });

  test("loadQueries() resolves once data is cached", async () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const factory = new RaffleFactory(queryClient).with("/p", { post: api.postOptions("1") });

    await factory.loadQueries("post");

    expect(queryClient.getQueryData(["post", "1"])).toEqual({ id: "1", title: "Post 1" });
  });

  test("buildQueries() skips disabled queries", () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const factory = new RaffleFactory(queryClient).with("/p", {
      post: { ...api.postOptions("1"), enabled: false },
    });

    factory.buildQueries("post");

    expect(api.calls.post).toBe(0);
  });

  test("getOptions() throws for an unknown name", () => {
    const factory = new RaffleFactory(createQueryClient());
    // @ts-expect-error not registered
    expect(() => factory.getOptions("nope")).toThrow(/No query named "nope"/);
  });
});

describe("raffleSerializationAdapter", () => {
  test("round-trips a raffle through plain data", () => {
    const api = createApi();
    const raffle = new RaffleFactory(createQueryClient())
      .with("/p", { post: api.postOptions("1") })
      .buildQueries("post");

    const wire = raffleSerializationAdapter.toSerializable(raffle);
    expect(JSON.parse(JSON.stringify(wire))).toEqual({
      routeId: "/p",
      hashes: { post: '["post","1"]' },
    });

    const revived = raffleSerializationAdapter.fromSerializable(wire);
    expect(isRaffle(revived)).toBe(true);
    expect(raffleSerializationAdapter.test(revived)).toBe(true);
    expect(typeof (revived as unknown as typeof raffle).post.useSuspenseQuery).toBe("function");
  });

  test("only claims raffles", () => {
    expect(raffleSerializationAdapter.test({ routeId: "/p", hashes: {} })).toBe(false);
    expect(raffleSerializationAdapter.test(createRaffle({ routeId: "/p", hashes: {} }))).toBe(true);
  });
});

describe.each([
  ["in memory (client navigation)", undefined],
  ["through the adapter (SSR)", viaAdapter],
])("hooks, %s", (_, transport) => {
  test("useSuspenseQuery reads the route's queries", async () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const { router } = createTestRouter({
      queryClient,
      api,
      transport,
      PostPage: ({ raffle }) => {
        const { data: post } = raffle.post.useSuspenseQuery();
        const { data: comments } = raffle.comments.useSuspenseQuery();
        return (
          <h1>
            {post.title} ({comments.length} comments)
          </h1>
        );
      },
    });

    render(<App queryClient={queryClient} router={router} />);

    expect(await screen.findByText("Post 1 (2 comments)")).toBeDefined();
    // The loader started each query once; the hooks reused those fetches.
    expect(api.calls).toEqual({ post: 1, comments: 1 });
  });

  test("override select replaces the result", async () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const { router } = createTestRouter({
      queryClient,
      api,
      transport,
      PostPage: ({ raffle }) => {
        const { data: count } = raffle.comments.useSuspenseQuery({
          select: (comments) => comments.length,
        });
        const { data: title } = raffle.post.useQuery({ select: (post) => post.title });
        return (
          <p>
            {count} comments on {title ?? "…"}
          </p>
        );
      },
    });

    render(<App queryClient={queryClient} router={router} />);

    expect(await screen.findByText("2 comments on Post 1")).toBeDefined();
  });

  test("a refetch uses the queryFn from route context", async () => {
    const queryClient = createQueryClient();
    const api = createApi();
    const { router } = createTestRouter({
      queryClient,
      api,
      transport,
      PostPage: ({ raffle }) => {
        const { data } = raffle.post.useSuspenseQuery();
        return <h1>{data.title}</h1>;
      },
    });
    render(<App queryClient={queryClient} router={router} />);
    await screen.findByText("Post 1");

    await queryClient.invalidateQueries({ queryKey: ["post", "1"] });

    expect(api.calls.post).toBe(2);
  });
});

test("hooks throw outside the route that started them", () => {
  const raffle = createRaffle<{ post: ReturnType<ReturnType<typeof createApi>["postOptions"]> }>({
    routeId: "/elsewhere",
    hashes: { post: '["post","1"]' },
  });
  const queryClient = createQueryClient();
  const { router } = createTestRouter({
    queryClient,
    api: createApi(),
    PostPage: () => {
      raffle.post.useQuery();
      return null;
    },
  });
  const error = vi.spyOn(console, "error").mockImplementation(() => {});

  render(<App queryClient={queryClient} router={router} />);

  return vi.waitFor(() =>
    expect(error.mock.calls.flat().join(" ")).toMatch(/route "\/elsewhere" isn't matched/),
  );
});

test("hooks report a key mismatch between start and read", async () => {
  const queryClient = createQueryClient();
  const api = createApi();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const { router } = createTestRouter({
    queryClient,
    api,
    // A raffle whose recorded hash doesn't match what the route builds.
    transport: <T,>(raffle: T): T => {
      const { routeId, hashes } = raffleState(raffle as AnyRaffle);
      return createRaffle({ routeId, hashes: { ...hashes, post: '["post","2"]' } }) as T;
    },
    PostPage: ({ raffle }) => {
      const { data } = raffle.post.useSuspenseQuery();
      return <h1>{data.title}</h1>;
    },
  });

  render(<App queryClient={queryClient} router={router} />);
  await screen.findByText("Post 1");

  expect(error.mock.calls.flat().join(" ")).toMatch(
    /"post" on route "\/posts\/\$postId" was started as \["post","2"\]/,
  );
});

test("types", () => {
  // Never called: hooks only run in components. Checked by the type checker.
  void (() => {
    const raffle = {} as PostRaffle;

    expectTypeOf(raffle.post.useSuspenseQuery()).toEqualTypeOf<
      UseSuspenseQueryResult<Post, Error>
    >();
    expectTypeOf(raffle.comments.useQuery()).toEqualTypeOf<UseQueryResult<Array<Comment>, Error>>();
    // An override `select` re-types the result.
    expectTypeOf(
      raffle.comments.useSuspenseQuery({ select: (comments) => comments.length }),
    ).toEqualTypeOf<UseSuspenseQueryResult<number, Error>>();
    // @ts-expect-error the key is fixed by the raffle
    raffle.post.useQuery({ queryKey: ["post", "2"] });
    // @ts-expect-error not started by this raffle
    void raffle.other;

    const factory = new RaffleFactory(createQueryClient()).with("/p", {
      comments: createApi().commentsOptions("1"),
    });
    // @ts-expect-error not registered
    factory.buildQueries("post");
    expectTypeOf(factory.buildQueries("comments").comments.useSuspenseQuery()).toEqualTypeOf<
      UseSuspenseQueryResult<Array<Comment>, Error>
    >();
    expectTypeOf(factory.buildQueries("comments")).toExtend<AnyRaffle>();
  });
});
