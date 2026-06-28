"use client";

import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  type AppKitNetwork,
  arbitrum,
  base,
  bsc,
  hyperEvm,
  mainnet,
  polygon,
  solana,
} from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";

// Clear any persisted WalletConnect/AppKit session so the modal never
// auto-opens on page load. Users must press "Connect wallet" intentionally.
// if (typeof window !== "undefined") {
//   for (let i = localStorage.length - 1; i >= 0; i--) {
//     const key = localStorage.key(i);
//     if (
//       key &&
//       (key.startsWith("wc@") ||
//         key.startsWith("@appkit") ||
//         key.startsWith("W3M") ||
//         key.startsWith("wagmi."))
//     ) {
//       localStorage.removeItem(key);
//     }
//   }
// }

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "b56e18d47c72ab683b10814fe9495694";

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  base,
  bsc,
  polygon,
  hyperEvm,
  mainnet,
  arbitrum,
  solana,
];

const wagmiAdapter = new WagmiAdapter({
  networks: networks,
  projectId,
});

const solanaWeb3JsAdapter = new SolanaAdapter();

createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  networks: networks,
  projectId,
  metadata: {
    name: "Rozo Rewards",
    description: "Earn rewards at your favorite restaurants",
    url: "https://rewards.rozo.ai",
    icons: ["/logo.png"],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    onramp: false,
    send: false,
    pay: false,
    receive: false,
    swaps: false,
    history: false,
  },
  themeMode: "light",
  defaultNetwork: mainnet,
  manualWCControl: false,
});

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
