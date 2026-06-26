import { DiscoveryDappContent } from "@/components/dapp/discovery-dapp-content";
import { getAllAiServices } from "@/lib/ai-services";
import { getAllRestaurants } from "@/lib/restaurants";
import { Binoculars } from "lucide-react";
import { Suspense } from "react";

export default function AiServicesPage() {
  const restaurants = getAllRestaurants();

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
      <DiscoveryDappContent
        title="Discovery"
        icon={<Binoculars className="size-6" />}
        restaurants={restaurants}
        aiServices={aiServices}
      />
    </Suspense>
  );
}
