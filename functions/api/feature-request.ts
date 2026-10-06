import { getSession, json, type Env } from "../_lib/session";
import { createIssue } from "../_lib/issue";

// "Get featured": opens an issue labelled `feature-request` as the signed-in
// user. A workflow validates the repository and acknowledges it; a maintainer
// approves by adding the `feature-approved` label (only maintainers can), which
// adds it to data/featured.json. Nothing is featured automatically.
const REPO = /^[\w.-]+\/[\w.-]+$/;

function parseRepo(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/\/$/, "");
  return REPO.test(cleaned) ? cleaned : null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await getSession(request, env);
  if (!session) return json({ error: "Sign in with GitHub first." }, { status: 401 });

  const { repo, pitch } = (await request.json().catch(() => ({}))) as { repo?: unknown; pitch?: unknown };
  const id = parseRepo(repo);
  if (!id) return json({ error: "Enter a GitHub repository as owner/name or a github.com URL." }, { status: 400 });
  const text = typeof pitch === "string" ? pitch.replace(/\s+/g, " ").trim() : "";
  if (text.length < 20) return json({ error: "Add a short pitch (at least 20 characters): what it does and who it is for." }, { status: 400 });
  if (text.length > 240) return json({ error: "Keep the pitch under 240 characters." }, { status: 400 });

  return createIssue(env, session, {
    title: `Feature request: ${id}`,
    body: `Repository: ${id}\nPitch: ${text}\n\n---\nSubmitted via the RepoRadar feature request form.`,
    labels: ["feature-request"],
  });
};
