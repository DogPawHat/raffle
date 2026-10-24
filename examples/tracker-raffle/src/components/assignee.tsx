import { assignIssue } from "@examples/tracker/server";
import type { User, UserId } from "@examples/tracker/types";
import { AssigneePickerView, Skeleton, UserCard } from "@examples/tracker/ui";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Suspense, useDeferredValue, useState } from "react";

import { dashboardKey, issueOptions, memberSearchOptions, userOptions } from "../queries.ts";

const issueRoute = getRouteApi("/_auth/projects/$projectId/issues/$issueId");

export function Assignee() {
  const { raffle } = issueRoute.useLoaderData();
  const { data: issue } = raffle.issue.useSuspenseQuery();
  const [picking, setPicking] = useState(false);
  const queryClient = useQueryClient();
  const assignMutation = useMutation({
    mutationFn: (user: User | null) =>
      assignIssue({ data: { issueId: issue.id, assigneeId: user?.id ?? null } }),
    onSuccess: (updated) => queryClient.setQueryData(issueOptions(issue.id).queryKey, updated),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["issues", "list", issue.projectId] }),
        queryClient.invalidateQueries({ queryKey: dashboardKey(issue.projectId) }),
      ]),
  });

  return (
    <div className="picker">
      {assignMutation.isPending ? (
        // Optimistic: the picker already has the user, so show them while it saves.
        <div style={{ opacity: 0.5 }}>
          <UserCard user={assignMutation.variables} />
        </div>
      ) : issue.assigneeId ? (
        <Suspense fallback={<Skeleton lines={2} />}>
          <AssigneeCard userId={issue.assigneeId} />
        </Suspense>
      ) : (
        <UserCard user={null} />
      )}
      <button type="button" onClick={() => setPicking(!picking)}>
        {picking ? "Cancel" : "Change"}
      </button>
      {picking ? (
        <AssigneePicker
          projectId={issue.projectId}
          onSelect={(user) => {
            setPicking(false);
            assignMutation.mutate(user);
          }}
        />
      ) : null}
    </div>
  );
}

function AssigneeCard({ userId }: { userId: UserId }) {
  // A dependent query: its options come from the issue's data, so raffle can't
  // register it. The loader started it for the first assignee; after a
  // reassignment this fetches on render.
  const { data: user } = useSuspenseQuery(userOptions(userId));
  return <UserCard user={user} />;
}

function AssigneePicker({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (user: User | null) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  // The input is typed in this component, so no loader (or raffle) can know
  // it: this query fetches on render. The previous results stay up while it loads.
  const { data: results, isPlaceholderData } = useQuery({
    ...memberSearchOptions(projectId, deferredQuery),
    placeholderData: keepPreviousData,
  });

  return (
    <AssigneePickerView
      query={query}
      onQueryChange={setQuery}
      results={results}
      loading={isPlaceholderData || query !== deferredQuery}
      onSelect={onSelect}
    />
  );
}
