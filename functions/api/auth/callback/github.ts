import { cookie, readCookie, seal, SESSION_COOKIE, SESSION_MAX_AGE, STATE_COOKIE, unseal, type Env, type Session } from "../../../_lib/session";

// Same path Auth.js used, so the GitHub OAuth app's callback URL needs no change.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const raw = readCookie(request, STATE_COOKIE);
  const saved = raw ? await unseal<{ state: string; returnTo: string }>(raw, env.AUTH_SECRET) : null;
  if (!code || !state || !saved || saved.state !== state) {
    return new Response("Sign-in failed: invalid or expired state. Please try again.", { status: 400 });
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.AUTH_GITHUB_ID,
      client_secret: env.AUTH_GITHUB_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/callback/github`,
    }),
  });
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string };
  if (!token.access_token) {
    return new Response("Sign-in failed: GitHub did not return an access token.", { status: 502 });
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "reporadar",
    },
  });
  const user = (await userRes.json().catch(() => ({}))) as { name?: string; login?: string; avatar_url?: string };

  const session: Session = {
    accessToken: token.access_token,
    name: user.name || user.login || null,
    image: user.avatar_url || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };

  const headers = new Headers({ Location: saved.returnTo || "/" });
  headers.append("Set-Cookie", cookie(SESSION_COOKIE, await seal(session, env.AUTH_SECRET), SESSION_MAX_AGE));
  headers.append("Set-Cookie", cookie(STATE_COOKIE, "", 0));
  return new Response(null, { status: 302, headers });
};
