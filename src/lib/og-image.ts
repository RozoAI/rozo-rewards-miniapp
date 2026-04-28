// Define supported page types
type PageType = "homepage" | "lifestyle";

interface OgImageParams {
  type?: PageType;
  title: string;
  subtitle?: string;
  image?: string;
  price?: string;
  originalPrice?: string;
  cashbackRate?: string;
}

/**
 * Generates a URL for dynamic OG image generation
 * @param params - Configuration for the OG image
 * @returns Complete URL for the OG image endpoint
 */
function getOgImageUrl({
  type = "homepage",
  title,
  subtitle,
  image,
  price,
  originalPrice,
  cashbackRate,
}: OgImageParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://rewards.rozo.ai";
  const endpoint = `${baseUrl}/api/og`;

  const params = new URLSearchParams({
    type: type.toString(),
    title: title.trim(),
    image: image?.trim() || "",
    price: price?.trim() || "",
    originalPrice: originalPrice?.trim() || "",
    cashbackRate: cashbackRate?.trim() || "",
  });

  if (subtitle?.trim()) {
    params.append("subtitle", subtitle.trim());
  }

  return `${endpoint}?${params.toString()}`;
}

/**
 * Utility to truncate text for better OG image display
 */
export function generateOgMetadata({
  title,
  description,
  ogImageParams,
}: {
  title: string;
  description: string;
  ogImageParams: OgImageParams;
}) {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: getOgImageUrl(ogImageParams),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [getOgImageUrl(ogImageParams)],
    },
  };
}
