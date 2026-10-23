import { createSerializationAdapter } from "@tanstack/react-router";

import { createRaffle, isRaffle, raffleState, type AnyRaffle, type RaffleState } from "./raffle.ts";

/**
 * Carries a `Raffle` from a server loader to the client as its
 * {@link RaffleState}: the route id and each query's hash. The client
 * rebuilds the hooks; they find the options in the route's context.
 *
 * ```ts
 * // src/start.ts
 * export const startInstance = createStart(() => ({
 *   serializationAdapters: [raffleSerializationAdapter],
 * }))
 * ```
 */
export const raffleSerializationAdapter = createSerializationAdapter<AnyRaffle, RaffleState>({
  key: "raffle",
  test: isRaffle,
  toSerializable: (raffle) => {
    const { routeId, hashes } = raffleState(raffle);
    return { routeId, hashes: { ...hashes } };
  },
  fromSerializable: (state) => createRaffle(state),
});
