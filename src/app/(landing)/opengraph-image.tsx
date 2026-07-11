import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Social share image for the landing / root URL. Centered layout matching
// partners.rozo.ai's opengraph-image (logo plate + title + subtitle on white)
// so Rozo's share cards read as one consistent brand across sites.
//
// Host-aware: ns.rozo.ai is the Network School community domain and gets its
// own title, while every other host (rewards.rozo.ai, dev.rozo.ai) shows the
// default Rozo Rewards card. OG scrapers don't run JS, so this server-rendered
// route is what they read — a standalone metadata route, so headers() here
// makes only /opengraph-image dynamic, never the statically-rendered pages.
export const alt = "Rozo Rewards";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read a /public asset and inline it as a data URI (satori can't fetch files).
function publicPng(file: string): string {
  const buf = readFileSync(join(process.cwd(), "public", file));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function isNetworkSchoolHost(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(":")[0].toLowerCase();
  return host === "ns.rozo.ai" || host.startsWith("ns.");
}

export default async function OpengraphImage() {
  const h = await headers();
  const isNs = isNetworkSchoolHost(h.get("host"));

  const logo = publicPng("rozo-square-black.png");
  const title = isNs ? "Network School NS Community" : "Rozo Rewards";
  const subtitle = isNs
    ? "Pay with stablecoins at NS. Earn cashback."
    : "Pay with stablecoins. Earn cashback.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 168,
            height: 168,
            borderRadius: 36,
            background: "#ffffff",
            border: "1px solid #ececec",
            marginBottom: 48,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt="Rozo"
            width={120}
            height={120}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div
          style={{
            fontSize: isNs ? 58 : 68,
            fontWeight: 700,
            color: "#0a0a0a",
            letterSpacing: "-0.02em",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#5a5a5a",
            marginTop: 20,
            maxWidth: 840,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  );
}
