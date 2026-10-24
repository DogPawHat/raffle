import { Card, ErrorBoundary, ErrorBox, Skeleton } from "@examples/tracker/ui";
import { Suspense, type ReactNode } from "react";

/**
 * A dashboard card that loads on its own: a skeleton until its query lands,
 * and an error with a retry button if it fails, without taking the page down.
 */
export function Widget({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card title={title} aside={aside}>
      {/* Resetting re-renders the reader, and reading a failed query refetches it. */}
      <ErrorBoundary fallback={({ error, reset }) => <ErrorBox error={error} onRetry={reset} />}>
        <Suspense fallback={<Skeleton />}>{children}</Suspense>
      </ErrorBoundary>
    </Card>
  );
}
