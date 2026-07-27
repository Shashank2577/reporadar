// Generates the editorial sections of each repo profile ("what it does",
// "use cases", "getting started", tags) using the GitHub Models API — free
// with a GITHUB_TOKEN that has the `models` permission. Falls back to a
// deterministic template when no model is available, so the pipeline never
// blocks on AI.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { token } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const MODEL = process.env.MODELS_MODEL || "openai/gpt-4o-mini";
const SUMMARY_TTL_DAYS = 30;
const MAX_PER_RUN = Number(process.env.ENRICH_LIMIT || 40);

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

async function llmSummarize(profile) {
  const t = process.env.MODELS_TOKEN || token();
  if (!t) return null;

  const prompt = [
    `Repository: ${profile.id}`,
    `Description: ${profile.description || "n/a"}`,
    `Primary language: ${profile.language || "n/a"}`,
    `Topics: ${(profile.topics || []).join(", ") || "n/a"}`,
    `License: ${profile.license || "n/a"}`,
    `Stars: ${profile.stars}`,
    "",
    "README excerpt:",
    (profile.readmeExcerpt || "").slice(0, 4000),
  ].join("\n");

  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write concise, factual editorial summaries of open-source GitHub repositories for a developer-facing site. Plain text only, no markdown, no emojis, no hype. Respond with a JSON object: {\"whatItDoes\": string (2-3 sentences), \"whyItMatters\": string (1-2 sentences), \"useCases\": string[] (3-5 short items), \"gettingStarted\": string (1-2 sentences pointing at how a user would begin), \"tags\": string[] (4-8 lowercase kebab-case topical tags), \"category\": string (one of: ai-ml, developer-tools, web, mobile, data, infrastructure, security, systems, learning, productivity, other)}",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    console.warn(`  models API ${res.status}: ${(await res.text()).slice(0, 150)}`);
    return null;
  }
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    if (!parsed.whatItDoes) return null;
    return { ...parsed, source: "llm", model: MODEL, generatedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

function templateSummarize(profile) {
  const lang = profile.language ? ` written primarily in ${profile.language}` : "";
  const license = profile.license ? ` under the ${profile.license} license` : "";
  return {
    whatItDoes: `${profile.id} is an open-source project${lang}, published${license}. ${profile.description || ""}`.trim(),
    whyItMatters: `It has accumulated ${profile.stars?.toLocaleString?.() || profile.stars} stars on GitHub and is actively tracked as a trending repository.`,
    useCases: (profile.topics || []).slice(0, 5).map((t) => `Projects involving ${t.replace(/-/g, " ")}`),
    gettingStarted: `Visit the repository README on GitHub for installation and usage instructions.`,
    tags: (profile.topics || []).slice(0, 8),
    category: guessCategory(profile),
    source: "template",
    generatedAt: new Date().toISOString(),
  };
}

function guessCategory(profile) {
  const hay = `${profile.description || ""} ${(profile.topics || []).join(" ")} ${profile.language || ""}`.toLowerCase();
  if (/\b(llm|ai|agent|gpt|ml|machine.learning|deep.learning|neural|transformer|rag)\b/.test(hay)) return "ai-ml";
  if (/\b(cli|devtool|developer|sdk|framework|compiler|lint|test)\b/.test(hay)) return "developer-tools";
  if (/\b(react|vue|svelte|css|frontend|web|nextjs|ui)\b/.test(hay)) return "web";
  if (/\b(android|ios|flutter|mobile|swift|kotlin)\b/.test(hay)) return "mobile";
  if (/\b(database|sql|data|etl|analytics|pipeline)\b/.test(hay)) return "data";
  if (/\b(kubernetes|docker|devops|cloud|infra|terraform|serverless)\b/.test(hay)) return "infrastructure";
  if (/\b(security|crypto|auth|vulnerabilit|pentest)\b/.test(hay)) return "security";
  if (/\b(rust|kernel|os|embedded|low.level|systems)\b/.test(hay)) return "systems";
  if (/\b(course|tutorial|learn|awesome|interview|roadmap)\b/.test(hay)) return "learning";
  return "other";
}

async function main() {
  const files = fs.existsSync(REPO_DIR)
    ? fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))
    : [];

  let enriched = 0;
  for (const f of files) {
    const file = path.join(REPO_DIR, f);
    const profile = JSON.parse(fs.readFileSync(file, "utf8"));
    const stale =
      !profile.aiSummary ||
      profile.aiSummary.source === "template" ||
      daysSince(profile.aiSummary.generatedAt) > SUMMARY_TTL_DAYS;
    if (!stale) continue;
    if (enriched >= MAX_PER_RUN) break;

    console.log(`Enriching ${profile.id}`);
    let summary = null;
    try {
      summary = await llmSummarize(profile);
    } catch (err) {
      console.warn(`  llm failed: ${err.message}`);
    }
    // Never downgrade an existing LLM summary to a template one.
    if (!summary && profile.aiSummary?.source === "llm") continue;
    profile.aiSummary = summary || templateSummarize(profile);
    fs.writeFileSync(file, JSON.stringify(profile, null, 2));
    enriched++;
  }
  console.log(`Enriched ${enriched} repos`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
