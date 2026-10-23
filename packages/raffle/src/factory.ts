import { rootRouteId } from "@tanstack/react-router";
import { skipToken, type QueryClient } from "@tanstack/react-query";

import { createRaffle, type Raffle } from "./raffle.ts";
import type { AnyQueryOptions, MergeRegistry, QueryRegistry } from "./types.ts";

const noop = () => {};

/**
 * The queries a route can start, by name. Put one on the root route's
 * `context`, and derive a child from it with {@link RaffleFactory.with} in
 * each route that adds queries:
 *
 * ```ts
 * context: ({ context, params, routeId }) => ({
 *   raffle: context.raffle.with(routeId, { post: postOptions(params.postId) }),
 * }),
 * ```
 *
 * Route `context` runs on the server and again on the client, and is never
 * serialized, so the options (with their `queryFn`) exist on both sides. A
 * {@link Raffle} only needs the names.
 */
export class RaffleFactory<TQueries extends QueryRegistry = {}> {
  readonly "~raffleFactory" = true;
  readonly queryClient: QueryClient;
  /** The route whose context holds this factory. */
  readonly routeId: string;
  readonly #queries: TQueries;

  constructor(queryClient: QueryClient, routeId: string = rootRouteId, queries?: TQueries) {
    this.queryClient = queryClient;
    this.routeId = routeId;
    this.#queries = queries ?? ({} as TQueries);
  }

  /**
   * A factory for the route `routeId` that also knows `queries`, replacing
   * any inherited queries with the same names. Doesn't start anything.
   */
  with<const TNew extends QueryRegistry>(
    routeId: string,
    queries: TNew,
  ): RaffleFactory<MergeRegistry<TQueries, TNew>> {
    return new RaffleFactory(this.queryClient, routeId, {
      ...this.#queries,
      ...queries,
    } as MergeRegistry<TQueries, TNew>);
  }

  /** The registered options for `name`. */
  getOptions<TName extends keyof TQueries & string>(name: TName): TQueries[TName] {
    const options = this.#queries[name];
    if (!options) {
      throw new Error(
        `[raffle] No query named "${name}" on route "${this.routeId}". Register it with \`.with()\` in this route's or a parent route's \`context\`.`,
      );
    }
    return options;
  }

  /** The `queryHash` the query client gives `name`'s query. */
  hashOf(name: keyof TQueries & string): string {
    return this.queryClient.defaultQueryOptions(this.getOptions(name)).queryHash;
  }

  /**
   * Start the named queries without waiting, and return the {@link Raffle}
   * that reads them. Fresh cached data is reused. Errors surface in the hooks
   * that read the queries, never here.
   */
  buildQueries<const TName extends keyof TQueries & string>(
    ...names: Array<TName>
  ): Raffle<Pick<TQueries, TName>> {
    for (const name of names) {
      void this.#start(name).catch(noop);
    }
    return this.#raffle(names);
  }

  /**
   * {@link RaffleFactory.buildQueries}, waiting until every named query has
   * data. Rejects if one of them fails.
   */
  async loadQueries<const TName extends keyof TQueries & string>(
    ...names: Array<TName>
  ): Promise<Raffle<Pick<TQueries, TName>>> {
    await Promise.all(names.map((name) => this.#start(name)));
    return this.#raffle(names);
  }

  #start(name: keyof TQueries & string): Promise<unknown> {
    const options: AnyQueryOptions = this.getOptions(name);
    if (options.enabled === false || options.queryFn === skipToken) {
      return Promise.resolve();
    }
    // `query` only reads the options it shares with observers.
    return this.queryClient.query(options as Parameters<QueryClient["query"]>[0]);
  }

  #raffle<TName extends keyof TQueries & string>(
    names: Array<TName>,
  ): Raffle<Pick<TQueries, TName>> {
    const hashes: Record<string, string> = {};
    for (const name of names) {
      hashes[name] = this.hashOf(name);
    }
    return createRaffle({ routeId: this.routeId, hashes });
  }
}

/** Whether `value` is a {@link RaffleFactory}. */
export function isRaffleFactory(value: unknown): value is RaffleFactory<QueryRegistry> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Partial<RaffleFactory>)["~raffleFactory"] === true
  );
}
