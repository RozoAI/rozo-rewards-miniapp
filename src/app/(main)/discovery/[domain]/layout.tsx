import { RozoPayClientWrapper } from "@/components/rozo-pay-client-wrapper";
import { getAiServiceById } from "@/lib/ai-services";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain: serviceId } = await params;
  const service = getAiServiceById(serviceId);

  if (!service) {
    return {
      title: "Merchants & AI Services — Rozo",
      description: "Discover merchants and AI services for enhanced experiences",
      alternates: { canonical: `/discovery/${serviceId}` },
    };
  }

  return {
    title: `${service.name} — Rozo Discovery`,
    description: service.long_description || service.description,
    alternates: { canonical: `/discovery/${serviceId}` },
    openGraph: {
      title: service.name,
      description: service.description,
      images: service.logoUrl ? [service.logoUrl] : undefined,
    },
    other: {
      "service:id": service.id,
      "service:name": service.name,
      "price:amount": service.price_usd?.toString() ?? "N/A",
      "price:currency": "USD",
    },
  };
}

export default function AIServiceDetailLayout({ children }: { children: React.ReactNode }) {
  return <RozoPayClientWrapper>{children}</RozoPayClientWrapper>;
}
