import { useQuery } from "@raf-query/react";
import { getRouteApi } from "@tanstack/react-router";

import { sessionQuery } from "./queries.ts";

const authRoute = getRouteApi("/_auth");

/** The signed-in user. Only for components under `/_auth`, which guarantees one. */
export function useMe() {
  // `/_auth`'s `beforeLoad` put the session's handle in the route context.
  const { session } = authRoute.useRouteContext();
  const [me] = useQuery(sessionQuery, session);
  if (!me) {
    throw new Error("Not signed in");
  }
  return me;
}
