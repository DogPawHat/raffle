import type { Priority, Status } from "./types.ts";

const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 days ago". The server and the browser can render different text near a boundary. */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) {
      return relative.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

export const statusLabels: Record<Status, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
};

export const priorityLabels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
