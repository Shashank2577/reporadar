import { json, type Env, type Session } from "./session";

// Opens a GitHub Issue on this repo as the signed-in user, so the issue's
// author is the requester. Shared by the repo-request and feature-request
// endpoints; the matching workflow in .github/workflows picks it up by label.
export async function createIssue(
  env: Env,
  session: Session,
  issue: { title: string; body: string; labels: string[] }
): Promise<Response> {
  const [owner, repo] = (env.GITHUB_REPO || "").split("/");
  if (!owner || !repo) return json({ error: "Requests are not configured on this deployment." }, { status: 500 });

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "reporadar",
    },
    body: JSON.stringify(issue),
  });
  if (!res.ok) {
    const detail = await res.text();
    return json({ error: `GitHub rejected the request (${res.status}): ${detail.slice(0, 200)}` }, { status: 502 });
  }
  const created = (await res.json()) as { html_url: string; number: number };
  return json({ url: created.html_url, number: created.number });
}
