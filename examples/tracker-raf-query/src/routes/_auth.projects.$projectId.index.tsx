import { ActivityList, IssueTable, StatusCountsView } from "@examples/tracker/ui";
import { useQuery } from "@raf-query/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { use } from "react";

import { Widget } from "../components/widget.tsx";
import { useProjectLookups } from "../project.ts";
import { activityQuery, integrationsQuery, myIssuesQuery, statusCountsQuery } from "../queries.ts";
import { useMe } from "../session.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/")({
  // Starts every widget's query without waiting. Each widget suspends on its
  // own, and streams in from the server when its data lands.
  loader: ({ context: { queryClient }, params: { projectId } }) => ({
    statusCounts: queryClient.prefetch(statusCountsQuery, { projectId }),
    myIssues: queryClient.prefetch(myIssuesQuery, { projectId }),
    activity: queryClient.prefetch(activityQuery, { projectId }),
    integrations: queryClient.prefetch(integrationsQuery, { projectId }),
  }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  return (
    <div className="grid">
      <Widget title="Status">
        <StatusCounts />
      </Widget>
      <Widget title={`Assigned to ${me.name.split(" ")[0]}`}>
        <MyIssues />
      </Widget>
      <Widget title="Activity" aside={<span className="muted">Updates every 10s</span>}>
        <Activity />
      </Widget>
      <Widget title="Integrations">
        <Integrations />
      </Widget>
    </div>
  );
}

function StatusCounts() {
  const data = Route.useLoaderData();
  const [countsPromise] = useQuery(statusCountsQuery, data.statusCounts);
  return <StatusCountsView counts={use(countsPromise)} />;
}

function MyIssues() {
  const data = Route.useLoaderData();
  const [issuesPromise] = useQuery(myIssuesQuery, data.myIssues);
  const issues = use(issuesPromise);
  const { members, labels } = useProjectLookups();
  return (
    <IssueTable
      issues={issues}
      members={members}
      labels={labels}
      renderTitle={(issue) => (
        <Link
          to="/projects/$projectId/issues/$issueId"
          params={{ projectId: issue.projectId, issueId: String(issue.id) }}
        >
          {issue.title}
        </Link>
      )}
    />
  );
}

function Activity() {
  const data = Route.useLoaderData();
  // Polling is a reader's option: it only runs while this widget is mounted.
  const [activityPromise] = useQuery(activityQuery, data.activity, { refetchInterval: 10_000 });
  const activity = use(activityPromise);
  const { members } = useProjectLookups();
  return (
    <ActivityList
      items={activity}
      members={members}
      renderIssue={(item) => (
        <Link
          to="/projects/$projectId/issues/$issueId"
          params={{ projectId: item.projectId, issueId: String(item.issueId) }}
        >
          {item.issueKey}
        </Link>
      )}
    />
  );
}

function Integrations() {
  const data = Route.useLoaderData();
  const [integrationsPromise] = useQuery(integrationsQuery, data.integrations);
  const integrations = use(integrationsPromise);
  return (
    <ul className="plain">
      {integrations.map((integration) => (
        <li key={integration.name}>{integration.name}</li>
      ))}
    </ul>
  );
}
