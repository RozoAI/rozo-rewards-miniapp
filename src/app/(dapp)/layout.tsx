import { BookmarkProvider } from "@/contexts/BookmarkContext";
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Inter, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function DappRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased pr-0! relative`}
        suppressHydrationWarning={true}
      >
        <BookmarkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <main className="flex min-h-screen flex-col justify-between md:min-h-screen md:items-center md:justify-start relative">
              {children}
              <Toaster position="top-center" richColors />
            </main>
          </ThemeProvider>
        </BookmarkProvider>
      </body>
    </html>
  );
}
