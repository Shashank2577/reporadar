// Deep aiSummary enrichment (AGENTS.md task 2), replacing the Jules sessions.
//
//   node scripts/deep-enrich.mjs --provider gemini [--limit 15] [--dry]
//   node scripts/deep-enrich.mjs --provider agy    [--limit 5]  [--dry]
//
// Selection, prompt, validation and writing are shared. Only generate() differs:
//   gemini  Gemini API over REST (GEMINI_API_KEY from a project with no billing
//           attached = free tier). Runs in GitHub Actions.
//   agy     Antigravity CLI in headless print mode (uses the local Google login,
//           so it runs on a developer machine, not in CI).
// Only the aiSummary object of each profile is ever written.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const REPO_DIR = path.join(ROOT, "data", "repos");
const CATEGORIES = new Set([
  "ai-ml", "developer-tools", "web", "mobile", "data", "infrastructure",
  "security", "systems", "learning", "productivity", "other",
]);

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const PROVIDER = opt("provider", "gemini");
const LIMIT = Number(opt("limit", 15));
const DRY = args.includes("--dry");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const AGY_MODEL = process.env.AGY_MODEL || "gemini-3.8-flash-medium";
// Free-tier requests-per-minute cap; one call every 7s stays under 10 RPM.
const GEMINI_GAP_MS = Number(process.env.GEMINI_GAP_MS || 7000);

const SYSTEM_PROMPT = `You are a senior engineer writing repository briefings for a developer intelligence site. Readers decide in 60 seconds whether a project is worth adopting. Be specific and technical, grounded in the README; never paraphrase boilerplate. Plain text only, no markdown, no emojis, no hype words.

Return ONLY a JSON object with exactly these fields:
{
  "oneLiner": string,        // <=120 chars, names the actual differentiator, not "a tool for X"
  "whatItDoes": string,      // 4-6 sentences: the real problem, the technical approach, what is distinctive
  "keyFeatures": string[],   // 5-8 items, each "<real feature name>: <one concrete sentence>"; never the literal word "Feature"
  "useCases": [{"title": string, "description": string}], // 4-6; who does this, why this project over alternatives
  "whoIsItFor": string,      // 2-3 sentences: audiences and prerequisites
  "gettingStarted": string,  // the real first command from the README, verbatim if there is one
  "tags": string[],          // 5-10 lowercase kebab-case
  "category": string         // one of: ${[...CATEGORIES].join(", ")}
}`;

const SCHEMA = {
  type: "object",
  required: ["oneLiner", "whatItDoes", "keyFeatures", "useCases", "whoIsItFor", "gettingStarted", "tags", "category"],
  properties: {
    oneLiner: { type: "string" },
    whatItDoes: { type: "string" },
    keyFeatures: { type: "array", items: { type: "string" } },
    useCases: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "description"],
        properties: { title: { type: "string" }, description: { type: "string" } },
      },
    },
    whoIsItFor: { type: "string" },
    gettingStarted: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    category: { type: "string" },
  },
};

const sentences = (t) => (String(t).match(/[^.!?]+[.!?]+(\s|$)/g) || []).length;

// AGENTS.md task 2a: README present, and no summary / template / thin llm one.
export function needsDeepSummary(p) {
  if (!String(p.readmeExcerpt || "").trim()) return false;
  const s = p.aiSummary;
  if (!s || s.source === "template") return true;
  if (s.source === "llm") {
    return sentences(s.whatItDoes) < 2 || (s.keyFeatures || []).length < 3 || (s.useCases || []).length < 3;
  }
  return false;
}

export function validate(s) {
  const errs = [];
  const str = (v) => typeof v === "string" && v.trim().length > 0;
  if (!str(s.oneLiner) || s.oneLiner.length > 120) errs.push("oneLiner missing or >120 chars");
  if (!str(s.whatItDoes) || sentences(s.whatItDoes) < 3) errs.push("whatItDoes needs >=3 sentences");
  const kf = s.keyFeatures;
  if (!Array.isArray(kf) || kf.length < 5 || kf.length > 8) errs.push("keyFeatures must have 5-8 items");
  else if (kf.some((f) => !/^[^:]{2,60}:\s+\S/.test(f) || /^feature\s*:/i.test(f))) errs.push("keyFeatures must be '<name>: <sentence>'");
  const uc = s.useCases;
  if (!Array.isArray(uc) || uc.length < 4 || uc.length > 6 || uc.some((u) => !str(u?.title) || !str(u?.description))) errs.push("useCases must have 4-6 {title,description}");
  if (!str(s.whoIsItFor)) errs.push("whoIsItFor missing");
  if (!str(s.gettingStarted)) errs.push("gettingStarted missing");
  const tags = s.tags;
  if (!Array.isArray(tags) || tags.length < 5 || tags.length > 10 || tags.some((t) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t))) errs.push("tags must be 5-10 kebab-case");
  if (!CATEGORIES.has(s.category)) errs.push(`category "${s.category}" not allowed`);
  return errs;
}

function buildPrompt(p) {
  const issues = (p.recentIssues || []).slice(0, 8).map((i) => `- ${i.title || i}`).join("\n");
  return [
    `Repository: ${p.id}`,
    `Description: ${p.description || "n/a"}`,
    `Language: ${p.language || "n/a"} | License: ${p.license || "n/a"} | Stars: ${p.stars}`,
    `Topics: ${(p.topics || []).join(", ") || "n/a"}`,
    `Latest release: ${p.releases?.[0]?.tag || "none"}`,
    issues ? `Recent issues:\n${issues}` : "",
    "",
    "README:",
    String(p.readmeExcerpt).slice(0, 14000),
  ].filter(Boolean).join("\n");
}

class RateLimited extends Error {}

async function generateGemini(p) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(p) }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    },
  );
  if (res.status === 429) throw new RateLimited(await res.text());
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((x) => x.text).join("") || "";
  return JSON.parse(text);
}

function generateAgy(p) {
  // Run from a scratch dir in plan mode so the agent cannot touch the repo.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-enrich-"));
  const schemaFile = path.join(dir, "schema.json");
  fs.writeFileSync(schemaFile, JSON.stringify(SCHEMA));
  const out = execFileSync(
    "agy",
    [
      "-p", `${SYSTEM_PROMPT}\n\n${buildPrompt(p)}`,
      "--output-format", "json",
      "--json-schema", schemaFile,
      "--mode", "plan",
      "--model", AGY_MODEL,
      "--print-timeout", "240s",
    ],
    { cwd: dir, encoding: "utf8", timeout: 300000, maxBuffer: 16 * 1024 * 1024 },
  );
  const env = JSON.parse(out);
  if (env.status !== "SUCCESS") throw new Error(`agy status ${env.status}`);
  return JSON.parse(env.response);
}

async function main() {
  const files = fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"));
  const candidates = files
    .map((f) => ({ file: path.join(REPO_DIR, f), profile: JSON.parse(fs.readFileSync(path.join(REPO_DIR, f), "utf8")) }))
    .filter(({ profile }) => needsDeepSummary(profile))
    .sort((a, b) => (b.profile.stars || 0) - (a.profile.stars || 0))
    .slice(0, LIMIT);

  console.log(`${candidates.length} candidate(s), provider=${PROVIDER}${DRY ? " (dry run, nothing written)" : ""}`);
  let written = 0;
  for (const { file, profile } of candidates) {
    process.stdout.write(`Enriching ${profile.id} ... `);
    try {
      const raw = PROVIDER === "agy" ? generateAgy(profile) : await generateGemini(profile);
      const errs = validate(raw);
      if (errs.length) {
        console.log(`rejected: ${errs.join("; ")}`);
      } else {
        const prev = profile.aiSummary;
        profile.aiSummary = {
          ...raw,
          source: "gemini",
          model: PROVIDER === "agy" ? `agy:${AGY_MODEL}` : GEMINI_MODEL,
          version: Math.max(3, (prev?.version || 0) + 1),
          generatedAt: new Date().toISOString(),
        };
        if (!DRY) fs.writeFileSync(file, JSON.stringify(profile, null, 2));
        console.log(DRY ? "ok (not written)" : "ok");
        if (DRY) console.log(JSON.stringify(profile.aiSummary, null, 2).slice(0, 1200));
        written++;
      }
    } catch (err) {
      if (err instanceof RateLimited) {
        console.log("rate limited; stopping, later runs pick up the rest");
        break;
      }
      console.log(`failed: ${err.message.slice(0, 200)}`);
    }
    if (PROVIDER === "gemini") await new Promise((r) => setTimeout(r, GEMINI_GAP_MS));
  }
  console.log(`Done: ${written}/${candidates.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
