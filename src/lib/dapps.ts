export type DappItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl?: string;
  url: string;
  visibleOs?: string[];
};

// In-app dApps surfaced on the Discover page. `url` values are opened in the
// Rozo Wallet in-app browser (or a new tab on the web).
export const DAPPS: DappItem[] = [
  {
    id: "rozo-checkout",
    name: "ROZO POS Checkout",
    description: "Payments",
    category: "Payments",
    logoUrl: "/rozo-square-black.png",
    url: "https://stellar.rozo.ai/stellar",
    visibleOs: ["ios", "android"],
  },
  {
    id: "rozo-pay-openrouter",
    name: "Pay OpenRouter",
    description: "Top up OpenRouter with more checkout options.",
    category: "Payments",
    logoUrl: "/openrouter.svg",
    url: "https://checkout.rozo.ai",
    visibleOs: ["android"],
  },
];
