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

    // Simple image validation - exclude icons
    const rawImage = searchParams.get("image") || "";
    const isValidImage =
      rawImage &&
      (rawImage.includes(".jpg") ||
        rawImage.includes(".png") ||
        rawImage.includes(".webp")) &&
      !rawImage.includes("icon") &&
      !rawImage.includes("favicon");
    const finalImage = isValidImage ? rawImage : `${baseUrl}/rozo-white.png`;

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
                {title}
              </h1>
              <p
                style={{
                  fontSize: "20px",
                  fontFamily: "Arial, sans-serif",
                  color: "#374151",
                  marginBottom: "32px",
                  maxWidth: "384px",
                }}
              >
                {subtitle}
              </p>

              {/* Pricing */}
              {(price || originalPrice) && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    marginBottom: "32px",
                  }}
                >
                  {price && (
                    <span
                      style={{
                        fontSize: "60px",
                        fontWeight: 900,
                        fontFamily: "Arial Black, Arial, sans-serif",
                        color: "#000000",
                        marginRight: "12px",
                      }}
                    >
                      ${price}
                    </span>
                  )}
                  {originalPrice && (
                    <span
                      style={{
                        fontSize: "24px",
                        fontFamily: "Arial, sans-serif",
                        color: "#6b7280",
                        textDecoration: "line-through",
                      }}
                    >
                      ${originalPrice}
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
                  fontSize: "16px",
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
