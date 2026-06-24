import IntercomInitializer from "@/components/intercom";
import { BookmarkProvider } from "@/contexts/BookmarkContext";
import { generateOgMetadata } from "@/lib/og-image";
import Web3Provider from "@/providers/Web3Provider";
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
    robots: { index: false, follow: false },
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
        <Web3Provider>
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
        </Web3Provider>
      </body>
    </html>
  );
}
