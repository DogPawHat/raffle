import { useQuery } from "@raf-query/react";
import { getRouteApi } from "@tanstack/react-router";

import { labelsQuery, membersQuery } from "./queries.ts";

const projectRoute = getRouteApi("/_auth/projects/$projectId");

/**
 * The project's members and labels, for pages under a project. The project
 * route's loader waited for them, so they're data, not promises.
 */
export function useProjectLookups() {
  const data = projectRoute.useLoaderData();
  const [members] = useQuery(membersQuery, data.members);
  const [labels] = useQuery(labelsQuery, data.labels);
  return { members, labels };
}
