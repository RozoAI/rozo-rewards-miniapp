import { DiscoveryDappContent } from "@/components/dapp/discovery-dapp-content";
import { getAllAiServices } from "@/lib/ai-services";
import { getAllRestaurants } from "@/lib/restaurants";
import { VISIBLE_HANDLES } from "@/shared";
import { Binoculars } from "lucide-react";

export default function AiServicesPage() {
  const restaurants = getAllRestaurants()
    .filter((location) => VISIBLE_HANDLES.includes(location.handle))
    .map((location) => ({
      _id: location._id,
      name: location.name,
      handle: location.handle,
      currency: location.currency,
      formatted: location.formatted,
      logo_url: location.logo_url,
      cashback_rate: location.cashback_rate,
      price: location.price ?? "",
    }));

  const aiServices = getAllAiServices().map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price_usd: service.price_usd,
    original_price_usd: service.original_price_usd,
    logoUrl: service.logoUrl,
  }));

  return (
    <DiscoveryDappContent
      title="Discovery"
      icon={<Binoculars className="size-6" />}
      restaurants={restaurants}
      aiServices={aiServices}
    />
  );
}
