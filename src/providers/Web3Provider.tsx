"use client";

import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { getDefaultConfig, RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider } from "wagmi";

const config = createConfig(
  getDefaultConfig({
    appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME as string,
    appIcon: process.env.NEXT_PUBLIC_ICON_URL as string,
    connectors: [miniAppConnector()],
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
