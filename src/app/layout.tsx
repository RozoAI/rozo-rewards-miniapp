import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import IntercomInitializer from "@/components/intercom";
import { ThemeProvider } from "next-themes";
import { FabActions } from "@/components/fab-actions";
import { Toaster } from "sonner";
import { BottomNavbar } from "@/components/bottom-navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rozo | One Tap to Pay",
  description: "Increase the GDP of Crypto",
};

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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <main className="flex min-h-screen flex-col justify-between gap-4 md:min-h-screen md:items-center md:justify-center md:max-w-xl md:mx-auto">
            {children}
            <IntercomInitializer
              appId={process.env.INTERCOM_APP_ID as string}
            />
            <Toaster position="top-center" />
            <FabActions />
            <BottomNavbar />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
