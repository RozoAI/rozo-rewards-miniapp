import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

// Use Edge Runtime for faster cold starts
export const runtime = "edge";

// Define our supported page types
type PageType = "homepage" | "lifestyle";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    // Extract parameters with defaults
    const type = (searchParams.get("type") as PageType) || "homepage";
    const title = searchParams.get("title") || "Welcome";
    const subtitle = searchParams.get("subtitle") || "";

    // Define styles based on page type
    const getTypeStyles = (pageType: PageType) => {
      const baseStyles = {
        homepage: {
          bg: "#0a0a0a",
          badge: "🏠 Homepage",
        },
        lifestyle: {
          bg: "#0a0a0a",
          badge: "🍽️ Lifestyle",
        },
      };
      return baseStyles[pageType] || baseStyles.homepage;
    };

    const styles = getTypeStyles(type);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: styles.bg,
            backgroundSize: "cover",
            backgroundPosition: "center",
            padding: "60px",
            // fontFamily: '"Inter", system-ui, sans-serif',
          }}
        >
          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", zIndex: 1 }}>
            {/* Badge */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                borderRadius: "25px",
                padding: "12px 24px",
                fontSize: "24px",
                fontWeight: "600",
                color: "white",
                marginBottom: "40px",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              {styles.badge}
            </div>

            {/* Main Title */}
            <div
              style={{
                fontSize: title.length > 50 ? "56px" : "72px",
                fontWeight: "800",
                color: "white",
                lineHeight: "1.1",
                textShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
                marginBottom: subtitle ? "20px" : "0",
                maxWidth: "1000px",
              }}
            >
              {title}
            </div>

            {/* Subtitle */}
            {subtitle && (
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "400",
                  color: "rgba(255, 255, 255, 0.9)",
                  lineHeight: "1.3",
                  maxWidth: "900px",
                  textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Bottom branding/domain */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.8)",
              zIndex: 1,
            }}
          >
            <img
              src={`${process.env.NEXT_PUBLIC_URL}/logo-white.png`}
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
      ),
      {
        width: 1200,
        height: 630,
        // Add fonts for better typography (optional but recommended)
        // fonts: [
        //   {
        //     name: "Inter",
        //     data: await fetch(
        //       new URL(
        //         "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap"
        //       )
        //     ).then((res) => res.arrayBuffer()),
        //     style: "normal",
        //     weight: 400,
        //   },
        // ],
      }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);

    // Return a fallback image on error
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
