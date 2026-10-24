import { ActivityList, IssueTable, StatusCountsView } from "@examples/tracker/ui";
import { noop, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Widget } from "../components/widget.tsx";
import {
  activityOptions,
  integrationsOptions,
  myIssuesOptions,
  statusCountsOptions,
} from "../queries.ts";
import { useMe } from "../session.ts";

export const Route = createFileRoute("/_auth/projects/$projectId/")({
  context: ({ params }) => ({
    statusCountsQuery: statusCountsOptions(params.projectId),
    myIssuesQuery: myIssuesOptions(params.projectId),
    activityQuery: activityOptions(params.projectId),
    integrationsQuery: integrationsOptions(params.projectId),
  }),
  // Starts every widget's query without waiting. Each widget suspends on its
  // own, and streams in from the server when its data lands.
  loader: ({ context: { queryClient, ...queries } }) => {
    void queryClient.query(queries.statusCountsQuery).catch(noop);
    void queryClient.query(queries.myIssuesQuery).catch(noop);
    void queryClient.query(queries.activityQuery).catch(noop);
    void queryClient.query(queries.integrationsQuery).catch(noop);
  },
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
  const { statusCountsQuery } = Route.useRouteContext();
  const { data: counts } = useSuspenseQuery(statusCountsQuery);
  return <StatusCountsView counts={counts} />;
}

function MyIssues() {
  const { myIssuesQuery, membersQuery, labelsQuery } = Route.useRouteContext();
  const { data: issues } = useSuspenseQuery(myIssuesQuery);
  const { data: members } = useSuspenseQuery(membersQuery);
  const { data: labels } = useSuspenseQuery(labelsQuery);
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
  const { activityQuery, membersQuery } = Route.useRouteContext();
  // Polling is a reader's option: it only runs while this widget is mounted.
  const { data: activity } = useSuspenseQuery({ ...activityQuery, refetchInterval: 10_000 });
  const { data: members } = useSuspenseQuery(membersQuery);
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
  const { integrationsQuery } = Route.useRouteContext();
  const { data: integrations } = useSuspenseQuery(integrationsQuery);
  return (
    <ul className="plain">
      {integrations.map((integration) => (
        <li key={integration.name}>{integration.name}</li>
      ))}
    </ul>
  );
}
