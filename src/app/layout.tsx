import { BottomNavbar } from "@/components/bottom-navbar";
import IntercomInitializer from "@/components/intercom";
import { MiniappPrompt } from "@/components/MiniappPrompt";
import { CreditProvider } from "@/contexts/CreditContext";
import { MiniKitContextProvider } from "@/providers/MiniKitProvider";
import Web3Provider from "@/providers/Web3Provider";
// import "@coinbase/onchainkit/styles.css";
import { generateOgMetadata } from "@/lib/og-image";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;

  const embedConfig = {
    version: "1", // Fixed: was "next", should be "1" per Farcaster spec
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    button: {
      title: `Launch ${
        process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Rozo Rewards"
      }`,
      action: {
        type: "launch_frame",
        name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Rozo Rewards",
        url: URL,
        splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE || "/logo.png",
        splashBackgroundColor:
          process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || "#f5f0ec",
      },
    },
  };

  const ogMetadata = generateOgMetadata({
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Rozo Rewards",
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      "Earn rewards at your favorite restaurants",
    ogImageParams: {
      type: "homepage",
      title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Rozo Rewards",
      subtitle:
        process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
        "Earn rewards at your favorite restaurants",
      image: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    },
  });

  return {
    robots: {
      index: false,
      follow: false,
    },
    other: {
      "fc:miniapp": JSON.stringify(embedConfig),
      "fc:frame": JSON.stringify(embedConfig), // For backward compatibility
    },
    ...ogMetadata,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased !pr-0 relative`}
        suppressHydrationWarning={true}
      >
        <Web3Provider>
          <MiniKitContextProvider>
            <CreditProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
              >
                <main className="flex min-h-screen flex-col justify-between md:min-h-screen md:items-center md:justify-center relative">
                  <NextTopLoader showSpinner={false} />
                  <MiniappPrompt />
                  {children}
                  <IntercomInitializer
                    appId={process.env.INTERCOM_APP_ID as string}
                  />
                  <Toaster position="top-center" />
                  <BottomNavbar />
                </main>
              </ThemeProvider>
            </CreditProvider>
          </MiniKitContextProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
