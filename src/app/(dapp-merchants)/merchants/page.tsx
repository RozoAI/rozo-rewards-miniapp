import { DappContent } from "@/components/dapp/dapp-content";
import { getAllAiServices } from "@/lib/ai-services";
import { getAllRestaurants } from "@/lib/restaurants";
import { VISIBLE_HANDLES } from "@/shared";
import { Suspense } from "react";

export default function DappPage() {
  const restaurants = getAllRestaurants().filter((location) =>
    VISIBLE_HANDLES.includes(location.handle),
  );

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
      <DappContent
        isDapp={true}
        title="Merchants"
        restaurants={restaurants}
        aiServices={aiServices}
      />
    </Suspense>
  );
}
