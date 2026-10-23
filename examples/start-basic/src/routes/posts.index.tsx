import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/posts/")({
  component: () => <p className="muted">Pick a post.</p>,
});
