/// <reference types="vite/client" />
import appCss from "@examples/tracker/styles.css?url";
import { ErrorBox, NavigationProgress } from "@examples/tracker/ui";
import { RaffleFactory } from "@raffle/react";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { sessionOptions } from "../queries.ts";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Every route derives its factory from this one, so any loader can start the session.
  context: ({ context, routeId }) => ({
    raffle: new RaffleFactory(context.queryClient).with(routeId, { session: sessionOptions() }),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tracker · raffle" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: Root,
  errorComponent: RootError,
  notFoundComponent: () => <p className="muted">Nothing here.</p>,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Root() {
  const loading = useRouterState({ select: (state) => state.isLoading });
  return (
    <>
      <NavigationProgress active={loading} />
      <Outlet />
    </>
  );
}

function RootError({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <main>
      <ErrorBox error={error} onRetry={() => void router.invalidate()} />
    </main>
  );
}
