import { LandingProviders } from "@/providers/landing-providers";
import { generateOgMetadata } from "@/lib/og-image";
import { SITE_URL_OBJECT } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const LANDING_TITLE = "Rozo Rewards";
const LANDING_DESCRIPTION = "Pay with stablecoins. Earn cashback.";

// The root URL (rewards.rozo.ai) is served by THIS (landing) route group — the
// full OG/Twitter setup previously lived only in (main), which the root never
// hits, so shared links had no preview image. Wire the dynamic /api/og card in
// here, set metadataBase so relative OG/canonical URLs resolve to the right
// origin, and open the site up to indexing (this is now a public rewards/
// discovery site, not a private mini-app).
export const metadata: Metadata = {
  // generateOgMetadata supplies title/description/openGraph/twitter; the fields
  // below add what it doesn't cover (base URL, canonical, base miniapp id).
  ...generateOgMetadata({
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    ogImageParams: {
      type: "homepage",
      title: LANDING_TITLE,
      subtitle: LANDING_DESCRIPTION,
      image: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    },
  }),
  metadataBase: SITE_URL_OBJECT,
  alternates: { canonical: "/" },
  other: {
    "base:app_id": "6a3ddd166c2d0cbe7329c3e7",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <LandingProviders>{children}</LandingProviders>
      </body>
    </html>
  );
}
