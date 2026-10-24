import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <h1>TanStack Query</h1>
      <p>
        Each route builds its <code>queryOptions</code> in <code>context</code>. The loader
        prefetches them and the components read the same objects with <code>useRouteContext</code>.
        Open a <Link to="/posts">post</Link>, then reload the page to see the same code run through
        SSR and hydration.
      </p>
    </>
  );
}
