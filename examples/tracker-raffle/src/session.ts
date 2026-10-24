import { getRouteApi } from "@tanstack/react-router";

const authRoute = getRouteApi("/_auth");

/** The signed-in user. Only for components under `/_auth`, which guarantees one. */
export function useMe() {
  const { raffle } = authRoute.useLoaderData();
  const { data: me } = raffle.session.useSuspenseQuery();
  if (!me) {
    throw new Error("Not signed in");
  }
  return me;
}
