import { getSession, json, type Env } from "../_lib/session";
import { createIssue } from "../_lib/issue";

// Creates a GitHub Issue on this repo, authenticated as the signed-in user's
// own GitHub account — so the issue's author *is* the requester, the same
// way GitHub attributes any issue. No database, no user table: GitHub's own
// issue metadata is the durable, attributed request queue. A workflow
// (.github/workflows/repo-requests.yml) picks up newly labeled issues,
// searches for the best-matching repository, and adds it to tracking.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Sign in with GitHub first." }, { status: 401 });

  const { query } = (await request.json().catch(() => ({}))) as { query?: unknown };
  const text = typeof query === "string" ? query.trim() : "";
  if (!text || text.length < 6) {
    return json({ error: "Describe what you're looking for in a bit more detail." }, { status: 400 });
  }
  if (text.length > 500) {
    return json({ error: "Keep the description under 500 characters." }, { status: 400 });
  }

  return createIssue(env, session, {
    title: `Repo request: ${text.slice(0, 80)}`,
    body: `${text}\n\n---\nSubmitted via the RepoRadar site request form.`,
    labels: ["repo-request"],
  });
};
