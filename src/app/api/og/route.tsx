import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const fetchGeistRegular = await fetch(
      new URL("/Geist-Regular.ttf", process.env.NEXT_PUBLIC_URL)
    );
    const fetchGeistBold = await fetch(
      new URL("/Geist-Bold.ttf", process.env.NEXT_PUBLIC_URL)
    );
    const fetchGeistExtraBold = await fetch(
      new URL("/Geist-ExtraBold.ttf", process.env.NEXT_PUBLIC_URL)
    );

    const geistBold = await fetchGeistBold.arrayBuffer();
    const geistRegular = await fetchGeistRegular.arrayBuffer();
    const geistExtrabold = await fetchGeistExtraBold.arrayBuffer();

    const { searchParams } = req.nextUrl;

    // Extract parameters with defaults
    const title = searchParams.get("title") || "Rozo Rewards";
    const subtitle = searchParams.get("subtitle") || "";
    const price = searchParams.get("price") || "";
    const originalPrice = searchParams.get("originalPrice") || "";
    const image = searchParams.get("image") || "";
    const cashbackRate = searchParams.get("cashbackRate") || "";

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
            fontFamily: "Geist Regular",
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
                  fontFamily: "Geist Bold",
                  color: "#333",
                  marginBottom: "16px",
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: "20px",
                  fontFamily: "Geist Regular",
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
                        fontFamily: "Geist Extrabold",
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
                        fontFamily: "Geist Regular",
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
                    fontFamily: "Geist Bold",
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
                  src={`${process.env.NEXT_PUBLIC_URL}/logo.png`}
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
                src={image}
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
        fonts: [
          {
            name: "Geist Regular",
            data: geistRegular,
            style: "normal",
          },
          {
            name: "Geist Bold",
            data: geistBold,
            style: "normal",
          },
          {
            name: "Geist Extrabold",
            data: geistExtrabold,
            style: "normal",
          },
        ],
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
            fontFamily: "Geist Regular",
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
                  fontFamily: "Geist Bold",
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
                  src={`${process.env.NEXT_PUBLIC_URL}/logo.png`}
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
                src={`${process.env.NEXT_PUBLIC_URL}/rozo-white.png`}
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
