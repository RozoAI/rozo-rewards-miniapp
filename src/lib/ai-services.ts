import servicesData from "../../public/ai-services/services.json";

export type AiService = {
  id: string;
  name: string;
  description: string;
  price_usd: number | null;
  logoUrl: string;
  long_description: string;
  sold_out?: boolean;
};

export const aiServices = servicesData as AiService[];

export function getAiServiceById(id: string): AiService | null {
  return aiServices.find((service) => service.id === id) ?? null;
}
