import { cookie, safeReturnTo, seal, STATE_COOKIE, type Env } from "../../../_lib/session";

// Starts the GitHub OAuth flow. `public_repo` is the minimum scope needed to
// open an issue on this (public) repository as the signed-in user.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AUTH_GITHUB_ID || !env.AUTH_SECRET) {
    return new Response("GitHub sign-in is not configured on this deployment.", { status: 503 });
  }
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.AUTH_GITHUB_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/callback/github`);
  authorize.searchParams.set("scope", "read:user public_repo");
  authorize.searchParams.set("state", state);

  const sealed = await seal({ state, returnTo }, env.AUTH_SECRET);
  return new Response(null, {
    status: 302,
    headers: { Location: authorize.toString(), "Set-Cookie": cookie(STATE_COOKIE, sealed, 600) },
  });
};
