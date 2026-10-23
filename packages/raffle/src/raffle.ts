import { useMatch } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { isRaffleFactory, type RaffleFactory } from "./factory.ts";
import type { AnyQueryOptions, QueryRegistry, RaffleEntry } from "./types.ts";

/** What a {@link Raffle} is made of, and all that crosses the wire. */
export interface RaffleState {
  /** The route whose context holds the factory that built the raffle. */
  readonly routeId: string;
  /** Each query's `queryHash` when it was started, by name. */
  readonly hashes: Readonly<Record<string, string>>;
}

const stateKey = "~raffle";

class RaffleBase {
  readonly [stateKey]: RaffleState;

  constructor(state: RaffleState) {
    this[stateKey] = state;
  }
}

/** A {@link Raffle} of any queries. */
export type AnyRaffle = RaffleBase;

/**
 * The queries a loader started, as hooks a component calls:
 * `raffle.post.useSuspenseQuery()`. Return it from a loader; the
 * {@link raffleSerializationAdapter} carries it from server to client.
 *
 * The hooks read each query's options from the context of the route that
 * started it, so the component must render while that route is matched.
 */
export type Raffle<TQueries extends QueryRegistry = QueryRegistry> = RaffleBase & {
  readonly [K in keyof TQueries]: RaffleEntry<TQueries[K]>;
};

/** Rebuild a {@link Raffle} from its {@link RaffleState}. */
export function createRaffle<TQueries extends QueryRegistry = QueryRegistry>(
  state: RaffleState,
): Raffle<TQueries> {
  const raffle = new RaffleBase(state) as unknown as Record<string, unknown>;
  for (const name of Object.keys(state.hashes)) {
    if (name === stateKey) {
      throw new Error(`[raffle] "${stateKey}" is reserved and can't name a query.`);
    }
    raffle[name] = createEntry(state, name);
  }
  return raffle as Raffle<TQueries>;
}

/** Whether `value` is a {@link Raffle}. */
export function isRaffle(value: unknown): value is AnyRaffle {
  return value instanceof RaffleBase;
}

/** The {@link RaffleState} of `raffle`. */
export function raffleState(raffle: AnyRaffle): RaffleState {
  return raffle[stateKey];
}

function createEntry(state: RaffleState, name: string): RaffleEntry<AnyQueryOptions> {
  return {
    useQuery(overrides) {
      return useQuery(merge(useRaffleOptions(state, name), overrides));
    },
    useSuspenseQuery(overrides) {
      return useSuspenseQuery(merge(useRaffleOptions(state, name), overrides));
    },
  };
}

// does this have to return any?
function merge(options: AnyQueryOptions, overrides: object | undefined): any {
  return {
    ...options,
    ...overrides,
    queryKey: options.queryKey,
    queryHash: options.queryHash,
    queryKeyHashFn: options.queryKeyHashFn,
  };
}

// `useMatch`'s types want a route id literal; a raffle only has a string.
const useMatchById = useMatch as unknown as <T>(options: {
  from: string;
  shouldThrow: false;
  select: (match: { context: unknown }) => T;
}) => T | undefined;

const reportedMismatches = new Set<string>();

function useRaffleOptions(state: RaffleState, name: string): AnyQueryOptions {
  const factory = useMatchById({
    from: state.routeId,
    shouldThrow: false,
    select: (match) => findFactory(match.context, state.routeId),
  });
  if (!factory) {
    throw new Error(
      `[raffle] Can't read "${name}": route "${state.routeId}" isn't matched, or its context has no RaffleFactory for it. Render raffle hooks inside the route that started them.`,
    );
  }
  const options = factory.getOptions(name);

  const queryClient = useQueryClient();
  if (process.env.NODE_ENV !== "production") {
    const hash = queryClient.defaultQueryOptions(options).queryHash;
    const expected = state.hashes[name];
    const report = `${state.routeId}:${name}:${expected}:${hash}`;
    if (hash !== expected && !reportedMismatches.has(report)) {
      reportedMismatches.add(report);
      console.error(
        `[raffle] "${name}" on route "${state.routeId}" was started as ${expected}, but this route's context now builds ${hash}. Server and client must derive the same query key from the same route params and loader deps.`,
      );
    }
  }
  return options;
}

function findFactory(context: unknown, routeId: string): RaffleFactory<QueryRegistry> | undefined {
  if (typeof context !== "object" || context === null) {
    return undefined;
  }
  for (const value of Object.values(context)) {
    if (isRaffleFactory(value) && value.routeId === routeId) {
      return value;
    }
  }
  return undefined;
}
