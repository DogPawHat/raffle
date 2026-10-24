/**
 * Presentational components. They take data as props and report events with
 * callbacks; none of them fetches, caches or links. That's left to each app,
 * so the examples differ only in how they load data.
 */
import { Component, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { priorityLabels, statusLabels, timeAgo } from "../format.ts";
import {
  priorities,
  sorts,
  statuses,
  type Activity,
  type Comment,
  type IssueFilters,
  type IssueSummary,
  type Label,
  type Priority,
  type Status,
  type StatusCounts,
  type User,
} from "../types.ts";

export function Avatar({ user, size = 24 }: { user: User | undefined; size?: number }) {
  const initials = user
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
    : "?";
  return (
    <span
      className="avatar"
      title={user?.name ?? "Unassigned"}
      style={{ width: size, height: size, background: user?.color ?? "#d1d9e0" }}
    >
      {initials}
    </span>
  );
}

export function TimeAgo({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en")} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status-${status}`}>{statusLabels[status]}</span>;
}

export function StatusSelect({
  value,
  onChange,
  pending = false,
}: {
  value: Status;
  onChange: (status: Status) => void;
  /** Dims the select while a change is being saved. */
  pending?: boolean;
}) {
  return (
    <select
      aria-label="Status"
      className={`status-select status-${value}`}
      value={value}
      data-pending={pending || undefined}
      onChange={(event) => onChange(event.target.value as Status)}
    >
      {statuses.map((status) => (
        <option key={status} value={status}>
          {statusLabels[status]}
        </option>
      ))}
    </select>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`priority priority-${priority}`}>{priorityLabels[priority]}</span>;
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="label" style={{ borderColor: label.color, color: label.color }}>
      {label.name}
    </span>
  );
}

export function IssueTable({
  issues,
  labels,
  members,
  renderTitle,
  dimmed = false,
}: {
  issues: Array<IssueSummary>;
  labels: Array<Label>;
  members: Array<User>;
  /** The issue's title, usually as a link to it. */
  renderTitle: (issue: IssueSummary) => ReactNode;
  /** Fades the table while the next page or filter loads. */
  dimmed?: boolean;
}) {
  if (issues.length === 0) {
    return <p className="muted empty">No issues match these filters.</p>;
  }
  return (
    <table className="issues" data-dimmed={dimmed || undefined}>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id}>
            <td className="key">{issue.key}</td>
            <td className="title">
              {renderTitle(issue)}
              {issue.labelIds.map((id) => {
                const label = labels.find((l) => l.id === id);
                return label ? <LabelChip key={id} label={label} /> : null;
              })}
            </td>
            <td>
              <StatusBadge status={issue.status} />
            </td>
            <td>
              <PriorityBadge priority={issue.priority} />
            </td>
            <td className="muted">{issue.commentCount > 0 ? `💬 ${issue.commentCount}` : ""}</td>
            <td className="muted">
              <TimeAgo iso={issue.updatedAt} />
            </td>
            <td>
              <Avatar user={members.find((m) => m.id === issue.assigneeId)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const sortLabels = { updated: "Recently updated", created: "Newest", priority: "Priority" };

export function FilterBar({
  filters,
  members,
  labels,
  onChange,
}: {
  filters: IssueFilters;
  members: Array<User>;
  labels: Array<Label>;
  /** Called with the changed filters. The page goes back to 1. */
  onChange: (patch: Partial<IssueFilters>) => void;
}) {
  return (
    <div className="filters">
      <select
        aria-label="Status"
        value={filters.status ?? ""}
        onChange={(e) => onChange({ status: (e.target.value || undefined) as Status | undefined })}
      >
        <option value="">Any status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <select
        aria-label="Assignee"
        value={filters.assigneeId ?? ""}
        onChange={(e) => onChange({ assigneeId: e.target.value || undefined })}
      >
        <option value="">Anyone</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Label"
        value={filters.labelId ?? ""}
        onChange={(e) => onChange({ labelId: e.target.value || undefined })}
      >
        <option value="">Any label</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort"
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value as IssueFilters["sort"] })}
      >
        {sorts.map((sort) => (
          <option key={sort} value={sort}>
            {sortLabels[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Pager({
  page,
  pageCount,
  total,
  renderLink,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** A link to `page`, labelled `label`. */
  renderLink: (page: number, label: string) => ReactNode;
}) {
  return (
    <nav className="pager">
      {page > 1 ? renderLink(page - 1, "← Previous") : <span className="muted">← Previous</span>}
      <span className="muted">
        Page {page} of {pageCount} · {total} issues
      </span>
      {page < pageCount ? renderLink(page + 1, "Next →") : <span className="muted">Next →</span>}
    </nav>
  );
}

export function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function StatusCountsView({ counts }: { counts: StatusCounts }) {
  const total = statuses.reduce((sum, status) => sum + counts[status], 0);
  return (
    <div className="counts">
      {statuses.map((status) => (
        <div key={status}>
          <strong>{counts[status]}</strong>
          <StatusBadge status={status} />
          <div className="bar">
            <span
              className={`status-${status}`}
              style={{ width: `${total ? (counts[status] / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityList({
  items,
  members,
  renderIssue,
}: {
  items: Array<Activity>;
  members: Array<User>;
  renderIssue: (item: Activity) => ReactNode;
}) {
  return (
    <ul className="activity">
      {items.map((item) => (
        <li key={item.id}>
          <Avatar user={members.find((m) => m.id === item.actorId)} size={20} />
          <span>
            {members.find((m) => m.id === item.actorId)?.name ?? "Someone"} {item.text}{" "}
            {renderIssue(item)}
          </span>
          <span className="muted">
            <TimeAgo iso={item.createdAt} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CommentItem({
  comment,
  author,
  pending = false,
}: {
  comment: Pick<Comment, "body" | "createdAt">;
  author: User | undefined;
  /** Shown faded until the server confirms it. */
  pending?: boolean;
}) {
  return (
    <li className="comment" data-pending={pending || undefined}>
      <Avatar user={author} />
      <div>
        <p>
          <strong>{author?.name ?? "Someone"}</strong>{" "}
          <span className="muted">
            {pending ? "sending…" : <TimeAgo iso={comment.createdAt} />}
          </span>
        </p>
        <p>{comment.body}</p>
      </div>
    </li>
  );
}

/** A submit button that disables itself while its form's action runs. */
export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** The fields of the comment form. The app renders the `<form>` around them. */
export function CommentFields({ me }: { me: User }) {
  return (
    <div className="comment-fields">
      <Avatar user={me} />
      <textarea name="body" required rows={3} placeholder={`Comment as ${me.name}…`} />
      <SubmitButton>Comment</SubmitButton>
    </div>
  );
}

/** The fields of the new-issue form. The app renders the `<form>` around them. */
export function IssueFields({ members, labels }: { members: Array<User>; labels: Array<Label> }) {
  return (
    <div className="issue-fields">
      <label>
        Title
        <input name="title" required autoFocus />
      </label>
      <label>
        Description
        <textarea name="body" rows={5} />
      </label>
      <div className="row">
        <label>
          Priority
          <select name="priority" defaultValue="medium">
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabels[priority]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assignee
          <select name="assigneeId" defaultValue="">
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Labels</legend>
        {labels.map((label) => (
          <label key={label.id} className="check">
            <input type="checkbox" name="labelIds" value={label.id} /> <LabelChip label={label} />
          </label>
        ))}
      </fieldset>
      <SubmitButton>Create issue</SubmitButton>
    </div>
  );
}

/** A text field's value from `formData`, or `""` if it's missing or a file. */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Reads the new-issue form's fields back out of its `FormData`. */
export function readIssueFields(formData: FormData) {
  return {
    title: formText(formData, "title"),
    body: formText(formData, "body"),
    priority: (formText(formData, "priority") || "medium") as Priority,
    assigneeId: formText(formData, "assigneeId") || null,
    labelIds: formData.getAll("labelIds").filter((id) => typeof id === "string"),
  };
}

/**
 * The assignee picker's view: a search box and its results. The app owns the
 * query text and decides where the results come from.
 */
export function AssigneePickerView({
  query,
  onQueryChange,
  results,
  loading,
  onSelect,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  results: Array<User> | undefined;
  loading: boolean;
  onSelect: (user: User | null) => void;
}) {
  return (
    <div className="picker">
      <input
        type="search"
        aria-label="Search members"
        placeholder="Search members…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <ul data-dimmed={loading || undefined}>
        <li>
          <button type="button" onClick={() => onSelect(null)}>
            <Avatar user={undefined} size={20} /> Unassigned
          </button>
        </li>
        {results?.map((user) => (
          <li key={user.id}>
            <button type="button" onClick={() => onSelect(user)}>
              <Avatar user={user} size={20} /> {user.name}
            </button>
          </li>
        ))}
        {results?.length === 0 ? <li className="muted">No members match.</li> : null}
        {!results ? <li className="muted">Searching…</li> : null}
      </ul>
    </div>
  );
}

export function UserCard({ user }: { user: User | null }) {
  if (!user) {
    return <p className="muted">Nobody is assigned.</p>;
  }
  return (
    <div className="user-card">
      <Avatar user={user} size={36} />
      <div>
        <strong>{user.name}</strong>
        <p className="muted">{user.email}</p>
      </div>
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="error" role="alert">
      <p>{error instanceof Error ? error.message : "Something went wrong."}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * Catches a render error below it and renders `fallback` instead. `reset`
 * clears the error and renders the children again; `onReset` runs first, for
 * the app to retry whatever failed.
 */
export class ErrorBoundary extends Component<
  {
    fallback: (props: { error: unknown; reset: () => void }) => ReactNode;
    onReset?: () => void;
    children: ReactNode;
  },
  { error: unknown }
> {
  override state = { error: undefined as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: undefined });
  };

  override render() {
    if (this.state.error !== undefined) {
      return this.props.fallback({ error: this.state.error, reset: this.reset });
    }
    return this.props.children;
  }
}

/** A thin bar across the top of the page while a navigation is pending. */
export function NavigationProgress({ active }: { active: boolean }) {
  return <div className="progress" data-active={active || undefined} />;
}
