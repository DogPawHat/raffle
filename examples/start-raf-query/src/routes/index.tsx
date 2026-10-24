import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <h1>raf-query</h1>
      <p>
        Loaders start queries and return <em>handles</em>. A component can only read a query through
        a handle, so nothing fetches on render. Open a <Link to="/posts">post</Link>, then reload
        the page to see the same code run through SSR and hydration.
      </p>
    </>
  );
}
