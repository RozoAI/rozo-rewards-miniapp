import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getRestaurantByHandle } from "@/lib/restaurants";

// Per-merchant share card, same centered style as the landing / partners OG
// images. Renders "<Merchant> @ Network School" so a shared /ns/<handle> link
// previews as a branded Rozo card instead of a bare merchant logo.
export const alt = "Network School merchant on Rozo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function publicPng(file: string): string {
  const buf = readFileSync(join(process.cwd(), "public", file));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const restaurant = getRestaurantByHandle(handle);
  const logo = publicPng("rozo-square-black.png");

  const name = restaurant?.name ?? "Network School";
  // Single string node — satori errors on a <div> with multiple text children
  // ("{name} @ Network School" would be two nodes) unless it's display:flex.
  const heading = `${name} @ Network School`;
  const cashback =
    restaurant?.cashback_rate && restaurant.cashback_rate > 0
      ? `${restaurant.cashback_rate}% cashback`
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
            fontSize: 62,
            fontWeight: 700,
            color: "#0a0a0a",
            letterSpacing: "-0.02em",
            textAlign: "center",
            maxWidth: 1040,
          }}
        >
          {heading}
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
          {cashback}
        </div>
      </div>
    ),
    { ...size },
  );
}
