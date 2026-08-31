export type DappItem = {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  url: string;
  visibleOs?: string[];
};

// In-app dApps surfaced on the Discover page. `url` values are opened in the
// Rozo Wallet in-app browser (or a new tab on the web).
export const DAPPS: DappItem[] = [
  {
    id: "pos-scan",
    name: "POS Scan",
    description: "Accept Stellar payments with a QR-powered point of sale.",
    logoUrl: "/qr.png",
    url: "https://stellar.rozo.ai/stellar",
    visibleOs: ["ios", "android"],
  },
  {
    id: "rozo-checkout",
    name: "ROZO Checkout",
    description: "Top up your OpenRouter credit with more payment options.",
    logoUrl: "/rozo-square-black.png",
    url: "https://checkout.rozo.ai",
    visibleOs: ["android"],
  },
];
