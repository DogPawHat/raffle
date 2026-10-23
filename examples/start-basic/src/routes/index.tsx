import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <>
      <h1>raffle</h1>
      <p>
        Loaders start queries and return a <em>raffle</em>: one hook per query, typed from its
        options. Open a <Link to="/posts">post</Link>, then reload the page to see the same code run
        through SSR and hydration.
      </p>
    </>
  );
}
