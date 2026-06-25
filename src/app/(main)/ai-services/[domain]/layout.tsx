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
      title: "AI Service Not Found — Rozo AI",
      description: "The AI service you're looking for doesn't exist or has been removed.",
      alternates: { canonical: `/ai-services/${serviceId}` },
    };
  }

  const urlPath = `/ai-services/${serviceId}`;
  const hasDiscount =
    typeof service.price_usd === "number" &&
    typeof service.original_price_usd === "number" &&
    service.original_price_usd > service.price_usd;

  return {
    title: `${service.name} — Rozo Discovery`,
    description: service.long_description || service.description,
    alternates: { canonical: urlPath },
    openGraph: {
      title: service.name,
      description: service.description,
      images: service.logoUrl ? [service.logoUrl] : undefined,
    },
    other: {
      "service:id": service.id,
      "service:name": service.name,
      "price:amount": service.price_usd?.toString() ?? "N/A",
      "price:original": hasDiscount ? service.original_price_usd?.toString() ?? "" : "",
      "price:currency": "USD",
    },
  };
}

export default function AIServiceDetailLayout({ children }: { children: React.ReactNode }) {
  return <RozoPayClientWrapper>{children}</RozoPayClientWrapper>;
}
