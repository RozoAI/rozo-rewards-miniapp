import { ImageResponse } from "next/og";
import { getRestaurantByHandle } from "@/lib/restaurants";
import { ROZO_FLAG_DATA_URI } from "@/lib/og-logo";

// Per-merchant share card, same centered style as the landing / partners OG
// images. Renders "<Merchant> @ Network School" so a shared /ns/<handle> link
// previews as a branded Rozo card instead of a bare merchant logo.
export const alt = "Network School merchant on Rozo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const restaurant = getRestaurantByHandle(handle);
  const logo = ROZO_FLAG_DATA_URI;

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
