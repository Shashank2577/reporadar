// Generates the editorial sections of each repo profile using the GitHub
// Models API — free with a GITHUB_TOKEN that has the `models` permission.
// Falls back to a deterministic template when no model is available, so the
// pipeline never blocks on AI.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { token } from "./lib/gh.mjs";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const MODEL = process.env.MODELS_MODEL || "openai/gpt-4o";
const SUMMARY_VERSION = 2;
const SUMMARY_TTL_DAYS = 45;
// GitHub Models free tier allows roughly 50 requests/day for gpt-4o, so keep
// each run well inside it; anything skipped is picked up by a later run.
const MAX_PER_RUN = Number(process.env.ENRICH_LIMIT || 20);
const KNOWN_CATEGORIES = new Set([
  "ai-ml", "developer-tools", "web", "mobile", "data", "infrastructure",
  "security", "systems", "learning", "productivity", "other",
]);

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

const SYSTEM_PROMPT = `You are a senior engineer writing repository briefings for a developer intelligence site. Your readers decide in 60 seconds whether a project is worth adopting. Be specific and technical; name the actual mechanisms, protocols, and commands from the README. Plain text only, no markdown syntax, no emojis, no hype words (revolutionary, blazing, game-changing).

Respond with a JSON object with EXACTLY these fields:
{
  "oneLiner": string,            // <=120 chars, what it is + the differentiator
  "whatItDoes": string,          // 3-4 sentences: the problem, the approach, what is distinctive technically
  "keyFeatures": string[],       // 4-6 items, each "Feature name: one concrete sentence"
  "useCases": [                  // 3-5 CONCRETE scenarios
    {"title": string,            // <=8 words
     "description": string}      // 1-2 sentences: who does this, in what situation, why this tool over alternatives
  ],
  "whoIsItFor": string,          // 1-2 sentences naming the audiences and prerequisites
  "gettingStarted": string,      // the actual first step, including the real install/run command from the README if present
  "tags": string[],              // 4-8 lowercase kebab-case topical tags
  "category": string             // one of: ai-ml, developer-tools, web, mobile, data, infrastructure, security, systems, learning, productivity, other
}`;

async function llmSummarize(profile) {
  const t = process.env.MODELS_TOKEN || token();
  if (!t) return null;

  const prompt = [
    `Repository: ${profile.id}`,
    `Description: ${profile.description || "n/a"}`,
    `Primary language: ${profile.language || "n/a"}`,
    `Topics: ${(profile.topics || []).join(", ") || "n/a"}`,
    `License: ${profile.license || "n/a"}`,
    `Stars: ${profile.stars} | Forks: ${profile.forks} | Contributors: ~${profile.contributorCount || "?"}`,
    `Latest release: ${profile.releases?.[0]?.tag || "none"}`,
    "",
    "README:",
    (profile.readmeExcerpt || "").slice(0, 11000),
  ].join("\n");

  const res = await fetch("https://models.github.ai/inference/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 150);
    console.warn(`  models API ${res.status}: ${body}`);
    if (res.status === 429) throw new Error("RATE_LIMITED");
    return null;
  }
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    if (!parsed.whatItDoes || !Array.isArray(parsed.useCases)) return null;
    // The model is asked for one of a fixed set of categories but isn't
    // always perfectly compliant; anything else becomes "other" so it can
    // never produce a category with no corresponding browse page.
    if (!KNOWN_CATEGORIES.has(parsed.category)) parsed.category = "other";
    return {
      ...parsed,
      source: "llm",
      model: MODEL,
      version: SUMMARY_VERSION,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
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

function templateSummarize(profile) {
  const lang = profile.language ? ` written primarily in ${profile.language}` : "";
  const license = profile.license ? ` under the ${profile.license} license` : "";
  return {
    oneLiner: (profile.description || `Open-source project by ${profile.owner}`).slice(0, 120),
    whatItDoes: `${profile.id} is an open-source project${lang}, published${license}. ${profile.description || ""}`.trim(),
    keyFeatures: [],
    useCases: (profile.topics || []).slice(0, 4).map((t) => ({
      title: t.replace(/-/g, " "),
      description: `Projects involving ${t.replace(/-/g, " ")}.`,
    })),
    whoIsItFor: "",
    gettingStarted: "Visit the repository README on GitHub for installation and usage instructions.",
    tags: (profile.topics || []).slice(0, 8),
    category: guessCategory(profile),
    source: "template",
    version: SUMMARY_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

async function main() {
  const files = fs.existsSync(REPO_DIR)
    ? fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"))
    : [];

  let enriched = 0;
  for (const f of files) {
    const file = path.join(REPO_DIR, f);
    const profile = JSON.parse(fs.readFileSync(file, "utf8"));
    const s = profile.aiSummary;
    const jitter = [...profile.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 0) % 14;
    const stale =
      !s ||
      s.source === "template" ||
      (s.version || 1) < SUMMARY_VERSION ||
      daysSince(s.generatedAt) > SUMMARY_TTL_DAYS + jitter;
    if (!stale) continue;
    if (enriched >= MAX_PER_RUN) break;

    console.log(`Enriching ${profile.id}`);
    let summary = null;
    try {
      summary = await llmSummarize(profile);
    } catch (err) {
      if (err.message === "RATE_LIMITED") {
        console.log("Model quota reached; remaining repos will be enriched on a later run");
        break;
      }
      console.warn(`  llm failed: ${err.message}`);
    }
    // Never downgrade an existing LLM/Jules summary to a template one.
    if (!summary && (s?.source === "llm" || s?.source === "jules")) continue;
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
