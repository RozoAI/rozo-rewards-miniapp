import IntercomInitializer from "@/components/intercom";
import { MiniappPrompt } from "@/components/miniapp-prompt";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import { CreditProvider } from "@/contexts/CreditContext";
import { MiniKitContextProvider } from "@/providers/MiniKitProvider";
import Web3Provider from "@/providers/Web3Provider";
// import "@coinbase/onchainkit/styles.css";
import { generateOgMetadata } from "@/lib/og-image";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased pr-0! relative`}
        suppressHydrationWarning={true}
      >
        <Web3Provider cookies={cookies}>
          <MiniKitContextProvider>
            <CreditProvider>
              <BookmarkProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="light"
                  forcedTheme="light"
                  enableSystem={false}
                  disableTransitionOnChange
                >
                  <main className="flex min-h-screen flex-col md:min-h-screen md:items-center relative">
                    <NextTopLoader showSpinner={false} />
                    <MiniappPrompt />
                    {children}
                    {process.env.INTERCOM_APP_ID && (
                      <IntercomInitializer
                        appId={process.env.INTERCOM_APP_ID as string}
                      />
                    )}
                    <Toaster position="top-center" />
                  </main>
                </ThemeProvider>
              </BookmarkProvider>
            </CreditProvider>
          </MiniKitContextProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
