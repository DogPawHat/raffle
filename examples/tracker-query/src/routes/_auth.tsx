import { signOut } from "@examples/tracker/server";
import { Avatar } from "@examples/tracker/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";

import { useMe } from "../session.ts";

export const Route = createFileRoute("/_auth")({
  // The session query comes from the root route's context. Waiting for it here
  // guards every route below; it's cached, so this is free after the first load.
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.query(context.sessionQuery);
    if (!me) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
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
