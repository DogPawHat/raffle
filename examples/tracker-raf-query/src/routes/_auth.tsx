import { signOut } from "@examples/tracker/server";
import { Avatar } from "@examples/tracker/ui";
import { useQueryClient } from "@raf-query/react";
import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useTransition } from "react";

import { sessionQuery } from "../queries.ts";
import { useMe } from "../session.ts";

export const Route = createFileRoute("/_auth")({
  // Guards every route below. The handle goes into the route context, so any
  // component under here can read the session; it's cached, so this is free
  // after the first load.
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensure(sessionQuery);
    if (!session.data) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { session };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const me = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, startTransition] = useTransition();

  return (
    <>
      <header className="app-header">
        <Link to="/projects" className="brand">
          Tracker
        </Link>
        <nav>
          <Link to="/projects" activeOptions={{ exact: true }}>
            Projects
          </Link>
        </nav>
        <div className="me">
          <Avatar user={me} />
          <span>{me.name}</span>
          <button
            type="button"
            disabled={isSigningOut}
            onClick={() =>
              startTransition(async () => {
                await signOut();
                // Leave first: clearing the cache under this layout would suspend it.
                await router.navigate({ to: "/login" });
                queryClient.clear();
              })
            }
          >
            Sign out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
