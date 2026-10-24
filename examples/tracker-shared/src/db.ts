/**
 * An in-memory database, seeded with the same data on every start. Only the
 * server functions in `server.ts` import it, so it never reaches the browser.
 */
import {
  priorities,
  statuses,
  type Activity,
  type Comment,
  type Issue,
  type IssueId,
  type Label,
  type Priority,
  type Project,
  type User,
} from "./types.ts";

export interface Db {
  users: Array<User>;
  projects: Array<Project>;
  labels: Array<Label>;
  issues: Array<Omit<Issue, "fetchedAt">>;
  comments: Array<Comment>;
  activity: Array<Activity>;
  nextIssueId: IssueId;
}

/** A small seeded PRNG, so every start gets the same data. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const users: Array<User> = [
  { id: "ada", name: "Ada Lovelace", email: "ada@example.com", color: "#8250df" },
  { id: "grace", name: "Grace Hopper", email: "grace@example.com", color: "#bf3989" },
  { id: "linus", name: "Linus Torvalds", email: "linus@example.com", color: "#1a7f37" },
  { id: "margaret", name: "Margaret Hamilton", email: "margaret@example.com", color: "#9a6700" },
  { id: "alan", name: "Alan Turing", email: "alan@example.com", color: "#0969da" },
  { id: "barbara", name: "Barbara Liskov", email: "barbara@example.com", color: "#cf222e" },
  { id: "dennis", name: "Dennis Ritchie", email: "dennis@example.com", color: "#57606a" },
  { id: "katherine", name: "Katherine Johnson", email: "katherine@example.com", color: "#116329" },
];

const projects: Array<Project> = [
  {
    id: "web",
    key: "WEB",
    name: "Website",
    description: "The marketing site and the signed-in web app.",
    memberIds: ["ada", "grace", "alan", "barbara", "katherine"],
  },
  {
    id: "api",
    key: "API",
    name: "Public API",
    description: "REST endpoints, webhooks and the SDKs built on them.",
    memberIds: ["linus", "dennis", "margaret", "ada"],
  },
  {
    id: "mobile",
    key: "MOB",
    name: "Mobile app",
    description: "The iOS and Android apps.",
    memberIds: ["margaret", "katherine", "grace", "alan", "dennis"],
  },
];

const labels: Array<Label> = [
  { id: "bug", name: "bug", color: "#d1242f" },
  { id: "feature", name: "feature", color: "#0969da" },
  { id: "design", name: "design", color: "#8250df" },
  { id: "docs", name: "docs", color: "#1a7f37" },
  { id: "performance", name: "performance", color: "#bc4c00" },
  { id: "security", name: "security", color: "#953800" },
];

const subjects = [
  "the sign-in form",
  "the settings page",
  "search results",
  "the billing flow",
  "notifications",
  "the onboarding checklist",
  "file uploads",
  "the activity feed",
  "dark mode",
  "the export job",
  "rate limiting",
  "the invite email",
];

const problems = [
  "Crash when opening",
  "Slow to load",
  "Add keyboard shortcuts to",
  "Improve empty state for",
  "Broken layout in",
  "Add filters to",
  "Write docs for",
  "Audit permissions on",
  "Flaky test around",
  "Redesign",
];

const commentBodies = [
  "I can reproduce this on the latest build.",
  "Is this still happening after the last deploy?",
  "Looks like a regression from last week.",
  "I'll take a look this afternoon.",
  "Added a failing test, fix incoming.",
  "Can we split this into two issues?",
  "This blocks the release, bumping the priority.",
  "Design mocks are linked in the description.",
  "Confirmed fixed in staging.",
  "Needs a decision from product first.",
  "Same root cause as the timeout we saw in the API.",
  "Shipping behind a feature flag first.",
];

const day = 24 * 60 * 60 * 1000;

function seed(): Db {
  const random = mulberry32(42);
  const pick = <T>(items: ReadonlyArray<T>): T => items[Math.floor(random() * items.length)]!;
  const now = Date.now();
  const issues: Db["issues"] = [];
  const comments: Array<Comment> = [];
  const activity: Array<Activity> = [];
  let id = 1;

  for (const project of projects) {
    for (let number = 1; number <= 36; number++) {
      const createdAt = now - Math.floor(random() * 60 * day);
      const updatedAt = createdAt + Math.floor(random() * (now - createdAt));
      const issue: Db["issues"][number] = {
        id: id++,
        projectId: project.id,
        key: `${project.key}-${number}`,
        title: `${pick(problems)} ${pick(subjects)}`,
        body: "Steps to reproduce, expected behaviour and what actually happens go here. This seed text is the same for every issue.",
        status: pick(statuses),
        priority: pick(priorities),
        assigneeId: random() < 0.2 ? null : pick(project.memberIds),
        labelIds: labels.filter(() => random() < 0.25).map((label) => label.id),
        createdAt: new Date(createdAt).toISOString(),
        updatedAt: new Date(updatedAt).toISOString(),
      };
      issues.push(issue);

      const commentCount = random() < 0.3 ? 0 : Math.floor(random() * 18);
      for (let c = 0; c < commentCount; c++) {
        comments.push({
          id: `c${comments.length + 1}`,
          issueId: issue.id,
          authorId: pick(project.memberIds),
          body: pick(commentBodies),
          createdAt: new Date(
            createdAt + ((c + 1) * (updatedAt - createdAt)) / (commentCount + 1),
          ).toISOString(),
        });
      }
      activity.push({
        id: `a${activity.length + 1}`,
        projectId: project.id,
        actorId: pick(project.memberIds),
        issueId: issue.id,
        issueKey: issue.key,
        text: "created",
        createdAt: issue.createdAt,
      });
    }
  }

  return {
    users,
    projects,
    labels,
    issues,
    comments,
    activity: activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    nextIssueId: id,
  };
}

// Kept on `globalThis`, so edits in development don't reset the data.
const store = globalThis as typeof globalThis & { __trackerDb?: Db };

export function db(): Db {
  store.__trackerDb ??= seed();
  return store.__trackerDb;
}

export const priorityRank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
