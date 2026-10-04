import { getSession, json, type Env } from "../../_lib/session";

// Browser-safe view of the session: name and avatar only, never the token.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(request, env);
  if (!session) return json({});
  return json({ user: { name: session.name, image: session.image } });
};
