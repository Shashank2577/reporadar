import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hybrid mode: content pages (repos, reports, topics, languages) still
  // prerender to static HTML at build time exactly as before. The only
  // server-side pieces are GitHub login (/api/auth) and the repo-request
  // API route (/api/request-repo), both needed because GitHub's OAuth token
  // exchange requires a client secret that can never live in browser code.
  trailingSlash: false,
};

export default nextConfig;
