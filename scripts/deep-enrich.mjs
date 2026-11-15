// Deep aiSummary enrichment (AGENTS.md task 2), replacing the Jules sessions.
//
//   node scripts/deep-enrich.mjs [--provider gemini|groq] [--limit 15] [--dry]
//
// gemini: Gemini API over REST (GEMINI_API_KEY from an AI Studio project with no
//         billing attached = free tier).
// groq:   Groq OpenAI-compatible API (GROQ_API_KEY, free tier).
// Runs in GitHub Actions. Only the aiSummary object of each profile is written.

import fs from "node:fs";
import path from "node:path";
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
const LIMIT = Number(opt("limit", 15));
const DRY = args.includes("--dry");
const PROVIDER = opt("provider", "gemini"); // gemini | groq
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MODEL = PROVIDER === "groq" ? GROQ_MODEL : GEMINI_MODEL;
// Free-tier requests-per-minute caps; Gemini one call per 7s (<10 RPM), Groq per 15s.
const GAP_MS = Number(process.env.ENRICH_GAP_MS || (PROVIDER === "groq" ? 15000 : 7000));

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

// Groq: OpenAI-compatible chat completions. GROQ_API_KEY from console.groq.com.
async function generateGroq(p) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(p) },
      ],
    }),
  });
  if (res.status === 429) throw new RateLimited(await res.text());
  if (!res.ok) throw new Error(`Groq API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "");
}

const generate = (p) => (PROVIDER === "groq" ? generateGroq(p) : generateGemini(p));

async function main() {
  const files = fs.readdirSync(REPO_DIR).filter((f) => f.endsWith(".json"));
  const candidates = files
    .map((f) => ({ file: path.join(REPO_DIR, f), profile: JSON.parse(fs.readFileSync(path.join(REPO_DIR, f), "utf8")) }))
    .filter(({ profile }) => needsDeepSummary(profile))
    .sort((a, b) => (b.profile.stars || 0) - (a.profile.stars || 0))
    .slice(0, LIMIT);

  console.log(`${candidates.length} candidate(s), ${PROVIDER}${DRY ? " (dry run, nothing written)" : ""}`);
  let written = 0;
  for (const { file, profile } of candidates) {
    process.stdout.write(`Enriching ${profile.id} ... `);
    try {
      const raw = await generate(profile);
      const errs = validate(raw);
      if (errs.length) {
        console.log(`rejected: ${errs.join("; ")}`);
      } else {
        const prev = profile.aiSummary;
        profile.aiSummary = {
          ...raw,
          source: PROVIDER,
          model: MODEL,
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
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  console.log(`Done: ${written}/${candidates.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
