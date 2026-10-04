import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `next build` writes plain HTML to out/, which is
  // deployed to Cloudflare Pages. The only server-side pieces (GitHub login,
  // the repo-request endpoint, the MCP endpoint) are Pages Functions in
  // functions/, not Next routes.
  output: "export",
  trailingSlash: false,
};

export default nextConfig;
