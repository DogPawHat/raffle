import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

const authRoute = getRouteApi("/_auth");

/** The signed-in user. Only for components under `/_auth`, which guarantees one. */
export function useMe() {
  const { sessionQuery } = authRoute.useRouteContext();
  const { data: me } = useSuspenseQuery(sessionQuery);
  if (!me) {
    throw new Error("Not signed in");
  }
  return me;
}
