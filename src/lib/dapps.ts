export type DappItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl?: string;
  url: string;
};

// In-app dApps surfaced on the Discover page. `url` values are opened in the
// Rozo Wallet in-app browser (or a new tab on the web).
export const DAPPS: DappItem[] = [
  {
    id: "rozo-checkout",
    name: "ROZO Checkout",
    description: "Payments",
    category: "Payments",
    logoUrl: "/rozo-square-black.png",
    url: "https://stellar.rozo.ai/stellar",
  },
];
