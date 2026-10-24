import { signIn } from "@examples/tracker/server";
import { Avatar, ErrorBox } from "@examples/tracker/ui";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { usersOptions } from "../queries.ts";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  context: () => ({ usersQuery: usersOptions() }),
  loader: async ({ context }) => {
    await context.queryClient.query(context.usersQuery);
  },
  component: Login,
});

function Login() {
  const { usersQuery, sessionQuery } = Route.useRouteContext();
  const { data: users } = useSuspenseQuery(usersQuery);
  const search = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const signInMutation = useMutation({
    mutationFn: (userId: string) => signIn({ data: userId }),
    onSuccess: async () => {
      // The cached session is the signed-out one; `/_auth` will fetch it again.
      queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
      await router.navigate({ href: search.redirect ?? "/projects" });
    },
  });

  return (
    <main className="login">
      <h1>Sign in</h1>
      <p className="muted">Pick anyone. There are no passwords.</p>
      {signInMutation.error ? <ErrorBox error={signInMutation.error} /> : null}
      <ul className="plain">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              disabled={signInMutation.isPending}
              onClick={() => signInMutation.mutate(user.id)}
            >
              <Avatar user={user} size={32} />
              <span>
                <strong>{user.name}</strong>
                <br />
                <span className="muted">{user.email}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
