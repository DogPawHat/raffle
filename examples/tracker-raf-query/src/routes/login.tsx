import { signIn } from "@examples/tracker/server";
import { Avatar, ErrorBox, formText } from "@examples/tracker/ui";
import { useQuery, useQueryClient } from "@raf-query/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useActionState } from "react";

import { sessionQuery, usersQuery } from "../queries.ts";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  loader: async ({ context }) => ({
    users: await context.queryClient.ensure(usersQuery),
  }),
  component: Login,
});

function Login() {
  const data = Route.useLoaderData();
  const [users] = useQuery(usersQuery, data.users);
  const search = Route.useSearch();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, signInAction, isPending] = useActionState(
    async (_previous: unknown, formData: FormData) => {
      try {
        await signIn({ data: formText(formData, "userId") });
      } catch (error) {
        return error;
      }
      // The cached session is the signed-out one; `/_auth` will fetch it again.
      queryClient.remove(sessionQuery);
      await router.navigate({ href: search.redirect ?? "/projects" });
      return null;
    },
    null,
  );

  return (
    <main className="login">
      <h1>Sign in</h1>
      <p className="muted">Pick anyone. There are no passwords.</p>
      {error ? <ErrorBox error={error} /> : null}
      <form action={signInAction}>
        <ul className="plain">
          {users.map((user) => (
            <li key={user.id}>
              <button type="submit" name="userId" value={user.id} disabled={isPending}>
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
      </form>
    </main>
  );
}
