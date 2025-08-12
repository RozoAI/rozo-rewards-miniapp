"use client";

import { useWagmiConfig } from "@/wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wagmiConfig = useWagmiConfig();
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider>
          <RainbowKitProvider>{children}</RainbowKitProvider>
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
