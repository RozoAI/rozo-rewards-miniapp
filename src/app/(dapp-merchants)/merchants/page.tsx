import { DiscoverContent } from "@/components/dapp/discover-content";
import { getAllAiServices } from "@/lib/ai-services";
import { Suspense } from "react";

export default function DiscoverPage() {
  const aiServices = getAllAiServices().map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price_usd: service.price_usd,
    original_price_usd: service.original_price_usd,
    logoUrl: service.logoUrl,
  }));

  return (
    <Suspense>
      <DiscoverContent aiServices={aiServices} />
    </Suspense>
  );
}
