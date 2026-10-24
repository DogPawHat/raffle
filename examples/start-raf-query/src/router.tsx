import { QueryClient, QueryClientProvider } from "@raf-query/react";
import { setupRouterIntegration } from "@raf-query/react/tanstack-router";
import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen.ts";

export function getRouter() {
  const queryClient = new QueryClient({
    defaults: { staleTime: 30_000 },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    // The query cache decides what's fresh; loaders always run and dedupe there.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });

  // Streams queries to the browser as they settle, clears the request's cache
  // when the response finishes, and registers handles as serializable.
  setupRouterIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
