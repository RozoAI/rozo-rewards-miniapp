"use client";

import { getDefaultConfig } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";

// One-time purge of stale wagmi/WalletConnect storage that can trigger
// unwanted reconnect popups. Runs at module load, before wagmi initializes.
// Preserves all Rozo-owned keys.
if (typeof window !== "undefined") {
  const ROZO_KEYS = new Set([
    "rozo_jwt_token",
    "rozo_jwt_expires",
    "rozo_rewards_bookmarks",
    "payment_receipts",
  ]);
  const PURGE_FLAG = "rozo_wc_purged_v1";
  if (!localStorage.getItem(PURGE_FLAG)) {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (ROZO_KEYS.has(key) || key.startsWith("miniapp-added")) continue;
      toDelete.push(key);
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(PURGE_FLAG, "1");
  }
}

const queryClient = new QueryClient();
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Rozo Rewards",
    // ponytail: "eoaOnly" prevents Coinbase Wallet from opening its keys.coinbase.com popup
    // on wagmi's auto-reconnect at page load when a wallet was previously connected.
    coinbaseWalletPreference: "eoaOnly",
  }),
);

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
