import { getSession, json, type Env } from "../_lib/session";

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

  const [owner, repo] = (env.GITHUB_REPO || "").split("/");
  if (!owner || !repo) {
    return json({ error: "Repo requests are not configured on this deployment." }, { status: 500 });
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "reporadar",
    },
    body: JSON.stringify({
      title: `Repo request: ${text.slice(0, 80)}`,
      body: `${text}\n\n---\nSubmitted via the RepoRadar site request form.`,
      labels: ["repo-request"],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: `GitHub rejected the request (${res.status}): ${detail.slice(0, 200)}` }, { status: 502 });
  }

  const issue = (await res.json()) as { html_url: string; number: number };
  return json({ url: issue.html_url, number: issue.number });
};
