import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import IntercomInitializer from "@/components/intercom";
import { ThemeProvider } from "next-themes";
import { FabActions } from "@/components/fab-actions";
import { Toaster } from "sonner";
import { BottomNavbar } from "@/components/bottom-navbar";
import { MiniKitContextProvider } from "@/providers/MiniKitProvider";

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
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
          action: {
            type: "launch_frame",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
            splashBackgroundColor:
              process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MiniKitContextProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <main className="flex min-h-screen flex-col justify-between gap-4 md:min-h-screen md:items-center md:justify-center relative">
              {children}
              <IntercomInitializer
                appId={process.env.INTERCOM_APP_ID as string}
              />
              <Toaster position="top-center" />
              <FabActions />
              <BottomNavbar />
            </main>
          </ThemeProvider>
        </MiniKitContextProvider>
      </body>
    </html>
  );
}
