import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Default social card for every page that doesn't set its own image.
export const dynamic = "force-static";
export const alt = "RepoRadar: trending GitHub repositories, star history and daily reports";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0d1117",
          color: "#f0f6fc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, border: "6px solid #2f81f7", display: "flex" }} />
          RepoRadar
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>
            Trending GitHub repositories, explained
          </div>
          <div style={{ fontSize: 34, color: "#9198a1" }}>
            Star history, use cases, and daily reports for 1,100+ open-source projects
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#2f81f7" }}>{new URL(site.url).host}</div>
      </div>
    ),
    size
  );
}
