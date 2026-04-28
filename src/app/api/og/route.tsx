import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const { searchParams } = req.nextUrl;

    // Extract parameters with defaults
    const title = searchParams.get("title") || "Rozo Rewards";
    const subtitle = searchParams.get("subtitle") || "";
    const price = searchParams.get("price") || "";
    const originalPrice = searchParams.get("originalPrice") || "";
    const rawImage = searchParams.get("image") || "";

    const resolveImageUrl = async (image: string): Promise<string> => {
      if (!image) return `${baseUrl}/rozo-white.png`;

      // Support absolute URLs and local asset paths (including .svg logos).
      const normalizedUrl = image.startsWith("/") ? `${baseUrl}${image}` : image;

      let resolvedUrl = normalizedUrl;
      try {
        resolvedUrl = new URL(normalizedUrl).toString();
      } catch {
        return `${baseUrl}/rozo-white.png`;
      }

      // Explicit SVG handling for better compatibility in OG renderer.
      if (resolvedUrl.toLowerCase().endsWith(".svg")) {
        try {
          const svgResponse = await fetch(resolvedUrl);
          if (!svgResponse.ok) return `${baseUrl}/rozo-white.png`;
          const svgText = await svgResponse.text();
          // Runtime-safe SVG embedding (works in Node and Edge).
          return `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
        } catch {
          return `${baseUrl}/rozo-white.png`;
        }
      }

      try {
        return new URL(resolvedUrl).toString();
      } catch {
        return `${baseUrl}/rozo-white.png`;
      }
    };

    const finalImage = await resolveImageUrl(rawImage);
    const parsedPrice = Number(price);
    const parsedOriginalPrice = Number(originalPrice);
    const hasValidPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
    const hasValidOriginalPrice =
      Number.isFinite(parsedOriginalPrice) &&
      parsedOriginalPrice > 0 &&
      parsedOriginalPrice > parsedPrice;
    const discountPercent = hasValidOriginalPrice
      ? Math.round(((parsedOriginalPrice - parsedPrice) / parsedOriginalPrice) * 100)
      : null;
    const discountAmount = hasValidOriginalPrice
      ? parsedOriginalPrice - parsedPrice
      : null;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            backgroundColor: "#f9fafb",
            backgroundImage:
              "linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)",
            padding: "32px",
            display: "flex",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
            }}
          >
            {/* Left Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "50%",
                height: "100%",
              }}
            >
              {/* Main Heading */}
              <h1
                style={{
                  fontSize: "64px",
                  fontWeight: 800,
                  fontFamily: "Arial Black, Arial, sans-serif",
                  color: "#333",
                  marginBottom: "12px",
                  lineHeight: 1.05,
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  fontFamily: "Arial, sans-serif",
                  color: "#374151",
                  marginBottom: "28px",
                  maxWidth: "420px",
                  lineHeight: 1.35,
                }}
              >
                {subtitle}
              </p>

              {/* Pricing */}
              {(hasValidPrice || hasValidOriginalPrice) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: "28px",
                  }}
                >
                  {hasValidOriginalPrice && (
                    <span
                      style={{
                        fontSize: "26px",
                        fontFamily: "Arial, sans-serif",
                        color: "#6b7280",
                        textDecoration: "line-through",
                        marginBottom: "4px",
                      }}
                    >
                      ${parsedOriginalPrice}
                    </span>
                  )}
                  {hasValidPrice && (
                    <span
                      style={{
                        fontSize: "58px",
                        fontWeight: 800,
                        fontFamily: "Arial Black, Arial, sans-serif",
                        color: "#000000",
                        lineHeight: 1,
                      }}
                    >
                      ${parsedPrice}
                    </span>
                  )}
                  {discountPercent !== null && discountAmount !== null && (
                    <span
                      style={{
                        marginTop: "8px",
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#065f46",
                      }}
                    >
                      Save ${discountAmount} ({discountPercent}% off)
                    </span>
                  )}
                </div>
              )}

              {/* Cashback Rate */}
              {/* {cashbackRate && (
                <div
                  style={{
                    display: "flex",
                    fontSize: "48px",
                    fontWeight: 900,
                    fontFamily: "Arial Black, Arial, sans-serif",
                    color: "#000000",
                    marginRight: "12px",
                  }}
                >
                  Cashback {cashbackRate}%
                </div>
              )} */}

              {/* Brand Logo */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "18px",
                  fontWeight: 600,
                  marginTop: "auto",
                }}
              >
                <img
                  src={`${baseUrl}/logo.png`}
                  alt="Rozo Rewards Logo"
                  style={{
                    width: "32px",
                    height: "32px",
                    marginRight: "12px",
                  }}
                />
                Rozo Rewards - rewards.rozo.ai
              </div>
            </div>

            {/* Right Content - Product Card */}
            <div
              style={{
                display: "flex",
                width: "50%",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={finalImage}
                alt="Offer image"
                width={320}
                height={320}
                style={{
                  width: "320px",
                  height: "320px",
                  objectFit: "contain",
                  backgroundColor: "#ffffff",
                  padding: "28px",
                  borderRadius: "24px",
                  transform: "rotate(12deg)",
                }}
              />
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        // No custom fonts - using system Arial for maximum speed
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            backgroundColor: "#f9fafb",
            backgroundImage:
              "linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)",
            padding: "32px",
            display: "flex",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
            }}
          >
            {/* Left Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "50%",
                height: "100%",
              }}
            >
              {/* Main Heading */}
              <h1
                style={{
                  fontSize: "76px",
                  fontWeight: 900,
                  fontFamily: "Arial Black, Arial, sans-serif",
                  color: "#333",
                  marginBottom: "16px",
                }}
              >
                Rozo Rewards
              </h1>

              {/* Brand Logo */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "16px",
                  marginTop: "auto",
                }}
              >
                <img
                  src={`${
                    process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
                  }/logo.png`}
                  alt="Rozo Rewards Logo"
                  style={{
                    width: "32px",
                    height: "32px",
                    marginRight: "12px",
                  }}
                />
                rewards.rozo.ai
              </div>
            </div>

            {/* Right Content - Product Card */}
            <div
              style={{
                display: "flex",
                width: "50%",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={`${
                  process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
                }/rozo-white.png`}
                alt="Rozo Rewards card"
                width={320}
                height={320}
                style={{
                  width: "320px",
                  height: "320px",
                  objectFit: "cover",
                  borderRadius: "24px",
                  transform: "rotate(12deg)",
                }}
              />
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
