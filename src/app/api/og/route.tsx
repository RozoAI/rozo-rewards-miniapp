import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(req: NextRequest) {
  try {
    const geistRegular = await readFile(
      join(process.cwd(), "public/Geist-Regular.ttf")
    );
    const geistSemiBold = await readFile(
      join(process.cwd(), "public/Geist-SemiBold.ttf")
    );
    const geistBold = await readFile(
      join(process.cwd(), "public/Geist-Bold.ttf")
    );
    const geistExtrabold = await readFile(
      join(process.cwd(), "public/Geist-Extrabold.ttf")
    );

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
            name: "Geist SemiBold",
            data: geistSemiBold,
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
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            fontSize: "48px",
            fontWeight: "bold",
          }}
        >
          Rozo Rewards
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }
}
