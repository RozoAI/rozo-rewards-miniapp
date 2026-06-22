"use client";

import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { wagmiAdapter } from "@/lib/appkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Config, cookieToInitialState, WagmiProvider } from "wagmi";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function Web3ProviderInner({
  children,
  cookies,
  isInMiniApp,
}: {
  children: ReactNode;
  cookies: string | null;
  isInMiniApp: boolean;
}) {
  const initialState = isInMiniApp
    ? cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)
    : undefined;

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default function Web3Provider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const { isInMiniApp } = useIsInMiniApp();

  return (
    <Web3ProviderInner cookies={cookies} isInMiniApp={isInMiniApp ?? false}>
      {children}
    </Web3ProviderInner>
  );
}
