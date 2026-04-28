import { RozoPayClientWrapper } from "@/components/rozo-pay-client-wrapper";
import { getAiServiceById } from "@/lib/ai-services";
import { createMiniAppMetadata } from "@/lib/miniapp-embed";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain: serviceId } = await params;
  const service = getAiServiceById(serviceId);

  if (!service) {
    return createMiniAppMetadata(
      {
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
        buttonTitle: "✨ Discover AI Services",
        name: "AI Service",
        url: `${process.env.NEXT_PUBLIC_URL}/ai-services/${serviceId}`,
      },
      {
        title: "AI Service Not Found — Rozo AI",
        description:
          "The AI service you're looking for doesn't exist or has been removed.",
        alternates: {
          canonical: `/ai-services/${serviceId}`,
        },
      },
    );
  }

  const urlPath = `/ai-services/${serviceId}`;
  const fullUrl = `${process.env.NEXT_PUBLIC_URL}${urlPath}`;
  const priceLabel =
    service.price_usd === null
      ? "Price unavailable"
      : `Only $${service.price_usd}`;

  return createMiniAppMetadata(
    {
      imageUrl:
        service.logoUrl ||
        process.env.NEXT_PUBLIC_APP_HERO_IMAGE ||
        `${process.env.NEXT_PUBLIC_URL}/logo.png`,
      bannerUrl: `${process.env.NEXT_PUBLIC_URL}/banner.png`,
      buttonTitle: `✨ ${priceLabel} for ${service.name}`,
      name: service.name,
      url: fullUrl,
    },
    {
      title: `${service.name} — Rozo Discovery`,
      description: service.long_description || service.description,
      alternates: {
        canonical: urlPath,
      },
      openGraph: {
        title: service.name,
        description: service.description,
      },
      other: {
        "service:id": service.id,
        "service:name": service.name,
        "price:amount": service.price_usd?.toString() ?? "N/A",
        "price:currency": "USD",
      },
    },
  );
}

export default function AIServiceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RozoPayClientWrapper>{children}</RozoPayClientWrapper>;
}
