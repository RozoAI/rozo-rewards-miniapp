import { SERVICES } from "./data";

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

const aiServices = SERVICES as AiService[];

export function getAiServiceById(id: string): AiService | null {
  return aiServices.find((service) => service.id === id) ?? null;
}

export function getAllAiServices(): AiService[] {
  return aiServices;
}

export type { AiService };
