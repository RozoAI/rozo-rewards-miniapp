export type DappItem = {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  url: string;
};

// In-app dApps surfaced on the Discover page. `url` values are opened in the
// Rozo Wallet in-app browser (or a new tab on the web).
export const DAPPS: DappItem[] = [
  {
    id: "pos-scan",
    name: "POS Scan",
    description: "Send USDC to EVM, Solana and Stellar",
    logoUrl: "/qr.png",
    url: "https://stellar.rozo.ai/stellar",
  },
  {
    id: "rozo-agent",
    name: "ROZO Agent",
    description: "Pay invoice with more payment options.",
    logoUrl: "/rozo-square-black.png",
    url: "https://checkout.rozo.ai",
  },
];
