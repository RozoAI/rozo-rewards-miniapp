import type { Metadata } from "next";

type CatalogItem = {
  domain: string;
  name: string;
  category: string;
  description: string;
  logo_url?: string;
  source?: string;
};

type CatalogResponse = CatalogItem[];

export async function getService(domain: string): Promise<CatalogItem | null> {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/ai_commerce_catalog.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CatalogResponse;
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

  const title = service ? `${service.name} — AI Service` : "AI Service Details";
  const description = service
    ? service.description
    : "Discover AI service details and pay with crypto.";
  const urlPath = `/ai-services/${domain}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: urlPath,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: urlPath,
    },
  };
}

export default function AIServiceDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
