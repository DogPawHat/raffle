/// <reference types="vite/client" />
import type { QueryClient } from "@raf-query/react";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "raf-query + TanStack Start" },
    ],
  }),
  shellComponent: RootDocument,
  component: () => <Outlet />,
  notFoundComponent: () => <p>Not found.</p>,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style>{css}</style>
      </head>
      <body>
        <nav>
          <Link to="/" activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/posts">Posts</Link>
        </nav>
        <main>{children}</main>
        <Scripts />
      </body>
    </html>
  );
}

const css = `
  body { font-family: system-ui, sans-serif; margin: 0; color: #1f2328; }
  nav { display: flex; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid #d1d9e0; }
  nav a { color: inherit; }
  nav a.active, aside a.active { font-weight: 700; }
  main { padding: 1.5rem; }
  .layout { display: grid; grid-template-columns: 14rem 1fr; gap: 2rem; }
  aside ul { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; }
  .muted { color: #59636e; font-size: .875rem; }
  .comments { border-top: 1px solid #d1d9e0; margin-top: 1.5rem; padding-top: 1rem; }
  button { font: inherit; }
`;
