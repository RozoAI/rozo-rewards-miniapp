import { LandingProviders } from "@/providers/landing-providers";
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

export const metadata: Metadata = {
  title: "Rozo Rewards",
  description: "Pay with stablecoins. Earn cashback.",
  robots: { index: false, follow: false },
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
