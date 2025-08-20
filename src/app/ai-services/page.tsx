import { AiServicesContent } from "@/components/ai-services/ai-services-content";
import FarcasterFrame from "@/components/FarcasterFrame";
import { PageHeader } from "@/components/page-header";
import { createMiniAppMetadata, embedConfigs } from "@/lib/miniapp-embed";
import { Binoculars } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = createMiniAppMetadata(
  {
    ...embedConfigs.aiServices,
    url: `${process.env.NEXT_PUBLIC_URL}/ai-services`,
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

export default function AiServicesPage() {
  return (
    <FarcasterFrame>
      <div className="w-full mb-16 flex flex-col gap-4 mt-4">
        <PageHeader
          title="Discovery"
          icon={<Binoculars className="size-6" />}
        />
        <AiServicesContent />
      </div>
    </FarcasterFrame>
  );
}
