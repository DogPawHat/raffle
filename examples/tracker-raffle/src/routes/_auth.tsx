import { signOut } from "@examples/tracker/server";
import { Avatar } from "@examples/tracker/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";

import { useMe } from "../session.ts";

export const Route = createFileRoute("/_auth")({
  // The guard needs the session's data, and a raffle only holds hooks, so it
  // fetches the registered options directly. It's cached after the first load.
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.query(context.raffle.getOptions("session"));
    if (!me) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  // Hands the session to every component below, through `useMe`.
  loader: ({ context }) => ({
    raffle: context.raffle.buildQueries("session"),
  }),
  component: AuthLayout,
});

function AuthLayout() {
  const me = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOutMutation = useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      // Leave first: clearing the cache under this layout would suspend it.
      await router.navigate({ to: "/login" });
      queryClient.clear();
    },
  });

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
            disabled={signOutMutation.isPending}
            onClick={() => signOutMutation.mutate()}
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
