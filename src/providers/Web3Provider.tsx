"use client";

import { getDefaultConfig, RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";

const config = createConfig(
  getDefaultConfig({
    appName: "Rozo Rewards MiniApp",
    appIcon: "https://rozo.ai/rozo-logo.png",
  })
);

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider>{children}</RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
