import servicesData from "../../public/ai-services/services.json";

type AiService = {
  id: string;
  name: string;
  description: string;
  price_usd: number | null;
  original_price_usd?: number | null;
  logoUrl: string;
  long_description: string;
  sold_out?: boolean;
};

const aiServices = servicesData as AiService[];

export function getAiServiceById(id: string): AiService | null {
  return aiServices.find((service) => service.id === id) ?? null;
}
