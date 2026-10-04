// Fixed category buckets (see scripts/enrich.mjs's guessCategory/prompt).
// Kept free of fs imports so the Cloudflare Pages Functions (MCP endpoint)
// can share it with the site.
export const CATEGORIES: Record<string, { title: string; description: string }> = {
  "ai-ml": {
    title: "AI & Machine Learning",
    description: "Agents, LLM tooling, model training, inference, and applied AI projects trending on GitHub.",
  },
  "developer-tools": {
    title: "Developer Tools",
    description: "CLIs, SDKs, frameworks, linters, and build tooling that other developers rely on daily.",
  },
  web: {
    title: "Web Development",
    description: "Frontend frameworks, UI libraries, and full-stack web projects gaining traction.",
  },
  mobile: {
    title: "Mobile Development",
    description: "iOS, Android, and cross-platform mobile frameworks and apps.",
  },
  data: {
    title: "Data & Analytics",
    description: "Databases, ETL pipelines, analytics engines, and data infrastructure.",
  },
  infrastructure: {
    title: "Infrastructure & DevOps",
    description: "Kubernetes, containers, cloud tooling, and infrastructure-as-code projects.",
  },
  security: {
    title: "Security",
    description: "Authentication, cryptography, vulnerability tooling, and security research projects.",
  },
  systems: {
    title: "Systems Programming",
    description: "Low-level, performance-critical, and systems-language projects — Rust, C, kernels, embedded.",
  },
  learning: {
    title: "Learning Resources",
    description: "Courses, curated lists, roadmaps, and educational open-source projects.",
  },
  productivity: {
    title: "Productivity",
    description: "Note-taking, task management, and personal productivity tools.",
  },
  other: {
    title: "Other",
    description: "Everything that doesn't fit neatly into a single category above.",
  },
};

// The model is prompted for one of the fixed keys above but isn't always
// perfectly compliant; anything outside the known set falls back to "other".
export function normalizeCategory(category: string | undefined | null): string | null {
  if (!category) return null;
  return CATEGORIES[category] ? category : "other";
}
