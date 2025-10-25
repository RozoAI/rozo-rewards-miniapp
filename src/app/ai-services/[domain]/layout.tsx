import { RozoPayClientWrapper } from "@/components/RozoPayClientWrapper";
import { createMiniAppMetadata } from "@/lib/miniapp-embed";
import type { Metadata } from "next";
import data from "../../../../public/ai_commerce_catalog.json";

type CatalogItem = {
  domain: string;
  name: string;
  price_in_usd: number;
  original_value_usd: number;
  duration_months: number;
  destination: number;
  category: string;
  description: string;
  offer_description: string;
  logo_url: string;
  cashback_rate: number;
  discount_rate: number;
  savings_usd: number;
  source: string;
  sold_out?: boolean;
};

type CatalogResponse = CatalogItem[];

async function getService(domain: string): Promise<CatalogItem | null> {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  try {
    // const res = await fetch(`${base}/ai_commerce_catalog.json`, {
    //   next: { revalidate: 300 },
    // });
    // if (!res.ok) return null;
    // const data = (await res.json()) as CatalogResponse;
    if (!Array.isArray(data)) return null;
    return data.find((i) => i.domain === domain) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const service = await getService(domain);

  if (!service) {
    return createMiniAppMetadata(
      {
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
        buttonTitle: "✨ Discover AI Services",
        name: "AI Service Not Found",
        url: `${process.env.NEXT_PUBLIC_URL}/ai-services/${domain}`,
      },
      {
        title: "AI Service Not Found — Rozo AI",
        description:
          "The AI service you're looking for doesn't exist or has been removed.",
        alternates: {
          canonical: `/ai-services/${domain}`,
        },
      }
    );
  }

  // Enhanced title based on service type
  const title =
    service.original_value_usd > 0
      ? `${service.name} — Only $${service.price_in_usd} for ${service.duration_months} months`
      : `${service.name} — ${service.cashback_rate}% Cashback`;

  // Enhanced description with pricing details
  const bundleInfo =
    service.original_value_usd > 0
      ? ` Get it for just $${service.price_in_usd} (was $${service.original_value_usd}). Save $${service.savings_usd} with ${service.discount_rate}% off + ${service.cashback_rate}% cashback.`
      : ` Get ${service.cashback_rate}% cashback when you purchase through Rozo AI.`;

  const description = `${service.description}. ${bundleInfo}`;

  // Enhanced button title
  const buttonTitle =
    service.original_value_usd > 0
      ? `💰 Only $${service.price_in_usd} for ${service.name}`
      : `✨ Get ${service.cashback_rate}% Cashback on ${service.name}`;

  const urlPath = `/ai-services/${domain}`;
  const fullUrl = `${process.env.NEXT_PUBLIC_URL}${urlPath}`;

  return createMiniAppMetadata(
    {
      imageUrl:
        service.logo_url ||
        process.env.NEXT_PUBLIC_APP_HERO_IMAGE ||
        `${process.env.NEXT_PUBLIC_URL}/logo.png`,
      bannerUrl: `${process.env.NEXT_PUBLIC_URL}/banner.png`,
      buttonTitle,
      name: service.name,
      url: fullUrl,
    },
    {
      title,
      description,
      alternates: {
        canonical: urlPath,
      },
      openGraph: {
        title: service.name,
        description: service.description,
      },
      other: service
        ? {
            "service:name": service.name,
            "service:category": service.category,
            "service:domain": service.domain,
            "price:amount": service.price_in_usd.toString(),
            "price:currency": "USD",
            "price:original": service.original_value_usd.toString(),
            "cashback:rate": service.cashback_rate.toString(),
            "discount:rate": service.discount_rate.toString(),
            "savings:amount": service.savings_usd.toString(),
            "duration:months": service.duration_months.toString(),
          }
        : undefined,
    }
  );
}

export default function AIServiceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RozoPayClientWrapper>{children}</RozoPayClientWrapper>;
}
