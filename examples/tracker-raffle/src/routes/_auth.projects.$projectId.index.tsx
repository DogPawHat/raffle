import { ActivityList, IssueTable, StatusCountsView } from "@examples/tracker/ui";
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
  context: ({ context, params, routeId }) => ({
    raffle: context.raffle.with(routeId, {
      statusCounts: statusCountsOptions(params.projectId),
      myIssues: myIssuesOptions(params.projectId),
      activity: activityOptions(params.projectId),
      integrations: integrationsOptions(params.projectId),
    }),
  }),
  // Starts every widget's query without waiting. Each widget suspends on its
  // own, and streams in from the server when its data lands. The members and
  // labels are the project route's, already loaded.
  loader: ({ context }) => ({
    raffle: context.raffle.buildQueries(
      "statusCounts",
      "myIssues",
      "activity",
      "integrations",
      "members",
      "labels",
    ),
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
  const { raffle } = Route.useLoaderData();
  const { data: counts } = raffle.statusCounts.useSuspenseQuery();
  return <StatusCountsView counts={counts} />;
}

function MyIssues() {
  const { raffle } = Route.useLoaderData();
  const { data: issues } = raffle.myIssues.useSuspenseQuery();
  const { data: members } = raffle.members.useSuspenseQuery();
  const { data: labels } = raffle.labels.useSuspenseQuery();
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
  const { raffle } = Route.useLoaderData();
  // Polling is a reader's option: it only runs while this widget is mounted.
  const { data: activity } = raffle.activity.useSuspenseQuery({ refetchInterval: 10_000 });
  const { data: members } = raffle.members.useSuspenseQuery();
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
  const { raffle } = Route.useLoaderData();
  const { data: integrations } = raffle.integrations.useSuspenseQuery();
  return (
    <ul className="plain">
      {integrations.map((integration) => (
        <li key={integration.name}>{integration.name}</li>
      ))}
    </ul>
  );
}
