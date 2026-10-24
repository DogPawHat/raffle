import type { SearchSchemaInput } from "@tanstack/react-router";

import { sorts, statuses, type IssueFilters, type Sort, type Status } from "./types.ts";

/**
 * `validateSearch` for the issues list. Filters, sort and page live in the
 * URL, so every view is linkable and a loader can start its query.
 */
export function validateIssuesSearch(
  // The input type makes every param optional in links; the output fills in defaults.
  search: Partial<Record<keyof IssueFilters, unknown>> & SearchSchemaInput,
): IssueFilters {
  const page = Number(search.page);
  return {
    status: statuses.includes(search.status as Status) ? (search.status as Status) : undefined,
    assigneeId: typeof search.assigneeId === "string" ? search.assigneeId : undefined,
    labelId: typeof search.labelId === "string" ? search.labelId : undefined,
    sort: sorts.includes(search.sort as Sort) ? (search.sort as Sort) : "updated",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}
