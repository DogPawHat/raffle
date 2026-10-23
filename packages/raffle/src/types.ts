import type {
  DefaultError,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
  UseSuspenseQueryOptions,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";

/** Any `queryOptions(...)` result a factory can register. */
// oxlint-disable-next-line typescript/no-explicit-any
export type AnyQueryOptions = UseQueryOptions<any, any, any, any>;

/** The queries a factory knows, by name. */
export type QueryRegistry = Record<string, AnyQueryOptions>;

/** `TBase` with `TNew`'s entries added, replacing same-named ones. */
export type MergeRegistry<TBase extends QueryRegistry, TNew extends QueryRegistry> = {
  [K in keyof TBase | keyof TNew]: K extends keyof TNew
    ? TNew[K]
    : K extends keyof TBase
      ? TBase[K]
      : never;
};

/** The type parameters of a registered `queryOptions(...)` result. */
export type OptionsTypes<TOptions> =
  TOptions extends UseQueryOptions<infer TQueryFnData, infer TError, infer TData, infer TQueryKey>
    ? {
        queryFnData: TQueryFnData;
        error: unknown extends TError ? DefaultError : TError;
        data: TData;
        queryKey: TQueryKey;
      }
    : never;

/**
 * Options a component can pass to a raffle entry's hooks. Everything that
 * decides which `Query` the hook reads is fixed by the entry, so it's left out.
 */
export type RaffleOverrideOptions<TOptions> = Omit<
  TOptions,
  "queryKey" | "queryHash" | "queryKeyHashFn"
>;

/** One named query of a {@link Raffle}: the hooks that read it. */
export interface RaffleEntry<TOptions extends AnyQueryOptions> {
  /**
   * `useQuery` with the registered options. `overrides` can change anything
   * but the query's identity; its `select` replaces the registered one.
   */
  useQuery<TSelected = OptionsTypes<TOptions>["data"]>(
    overrides?: RaffleOverrideOptions<
      UseQueryOptions<
        OptionsTypes<TOptions>["queryFnData"],
        OptionsTypes<TOptions>["error"],
        TSelected,
        OptionsTypes<TOptions>["queryKey"] & QueryKey
      >
    >,
  ): UseQueryResult<TSelected, OptionsTypes<TOptions>["error"]>;
  /** {@link RaffleEntry.useQuery}, suspending until the query has data. */
  useSuspenseQuery<TSelected = OptionsTypes<TOptions>["data"]>(
    overrides?: RaffleOverrideOptions<
      UseSuspenseQueryOptions<
        OptionsTypes<TOptions>["queryFnData"],
        OptionsTypes<TOptions>["error"],
        TSelected,
        OptionsTypes<TOptions>["queryKey"] & QueryKey
      >
    >,
  ): UseSuspenseQueryResult<TSelected, OptionsTypes<TOptions>["error"]>;
}
