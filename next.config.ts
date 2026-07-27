import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static export: zero serverless cost on Vercel, maximum SEO performance.
  output: "export",
  trailingSlash: false,
  images: {
    // Static export cannot use the image optimization server; GitHub avatars are
    // already CDN-served and sized via URL params.
    unoptimized: true,
  },
};

export default nextConfig;
