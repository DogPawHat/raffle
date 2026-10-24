import { assignIssue } from "@examples/tracker/server";
import type { Issue, User, UserId } from "@examples/tracker/types";
import { AssigneePickerView, Skeleton, UserCard } from "@examples/tracker/ui";
import { useQuery, useQueryClient, useWaterfall } from "@raf-query/react";
import { Suspense, use, useDeferredValue, useOptimistic, useState, useTransition } from "react";

import { dashboardKey, issueQuery, memberSearchQuery, userQuery } from "../queries.ts";

export function Assignee({ issue }: { issue: Issue }) {
  const [picking, setPicking] = useState(false);
  const queryClient = useQueryClient();
  // Optimistic: the picker already has the user, so show them while it saves.
  const [pendingAssignee, setPendingAssignee] = useOptimistic<User | null | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="picker">
      {isPending && pendingAssignee !== undefined ? (
        <div style={{ opacity: 0.5 }}>
          <UserCard user={pendingAssignee} />
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
            startTransition(async () => {
              setPendingAssignee(user);
              try {
                const updated = await assignIssue({
                  data: { issueId: issue.id, assigneeId: user?.id ?? null },
                });
                queryClient.setData(issueQuery, { issueId: issue.id }, updated);
              } catch {
                // Rolled back by `useOptimistic`.
              }
              await Promise.all([
                queryClient.invalidate({ queryKey: ["issues", "list", issue.projectId] }),
                queryClient.invalidate({ queryKey: dashboardKey(issue.projectId) }),
              ]);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function AssigneeCard({ userId }: { userId: UserId }) {
  // A dependent query: its input comes from the issue's data, so no loader
  // handle reaches here. The loader started it for the first assignee; after
  // a reassignment this is a waterfall, and the name says so.
  const handle = useWaterfall(userQuery, { userId });
  const [userPromise] = useQuery(userQuery, handle);
  return <UserCard user={use(userPromise)} />;
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
  // The input is typed in this component, so no loader can know it: start the
  // search during render. The previous results stay up while it loads.
  const handle = useWaterfall(memberSearchQuery, { projectId, query: deferredQuery });
  const [resultsPromise, results] = useQuery(memberSearchQuery, handle, {
    whilePending: "previous",
  });

  return (
    <AssigneePickerView
      query={query}
      onQueryChange={setQuery}
      // Reads the promise's status instead of suspending: undefined until the first results.
      results={resultsPromise.status === "fulfilled" ? resultsPromise.value : undefined}
      loading={results.isPrevious || query !== deferredQuery}
      onSelect={onSelect}
    />
  );
}
