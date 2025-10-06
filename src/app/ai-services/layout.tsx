import { FabActions } from "@/components/fab-actions";
import { createMiniAppMetadata, embedConfigs } from "@/lib/miniapp-embed";
import { Metadata } from "next";

export const metadata: Metadata = createMiniAppMetadata(
  {
    ...embedConfigs.aiServices,
    url: `${process.env.NEXT_PUBLIC_URL}/ai-services`,
    imageUrl: `${process.env.NEXT_PUBLIC_URL}/rozo-white.png`,
    bannerUrl: `${process.env.NEXT_PUBLIC_URL}/banner.png`,
  },
  {
    title: "Discovery | Rozo",
    description:
      "Discover AI-powered services and tools for enhanced experiences",
    robots: {
      index: false,
      follow: false,
    },
  }
);

export default function AiServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      {children}
      <FabActions className="fixed" />
    </div>
  );
}
