import { LandingProviders } from "@/providers/landing-providers";
import { SITE_URL_OBJECT } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
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

const DEFAULT_TITLE = "Rozo Rewards";
const DEFAULT_DESCRIPTION = "Pay with stablecoins. Earn cashback.";
const NS_TITLE = "Network School NS Community | ROZO";
const NS_DESCRIPTION = "Pay with stablecoins at NS. Earn cashback.";

function isNetworkSchoolHost(hostHeader: string | null | undefined): boolean {
  if (!hostHeader) return false;
  const host = hostHeader.split(":")[0].toLowerCase();
  return host === "ns.rozo.ai" || host.startsWith("ns.");
}

// The root URL is served by THIS (landing) route group. Title/description are
// host-aware: ns.rozo.ai (the Network School community domain) gets its own
// branding, every other host shows the default Rozo Rewards. The OG image is
// provided by the sibling opengraph-image.tsx (host-aware centered card),
// which Next wires in automatically — so no images are set here. Using
// headers() opts this layout into dynamic rendering, acceptable for a light
// entry/redirect root.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const isNs = isNetworkSchoolHost(h.get("host"));
  const title = isNs ? NS_TITLE : DEFAULT_TITLE;
  const description = isNs ? NS_DESCRIPTION : DEFAULT_DESCRIPTION;

  return {
    metadataBase: SITE_URL_OBJECT,
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: "/" },
    other: {
      "base:app_id": "6a3ddd166c2d0cbe7329c3e7",
    },
  };
}

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
