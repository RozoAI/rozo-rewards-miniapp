"use client";

import { initializeAppKit, wagmiAdapter } from "@/lib/appkit";
import { AppKitProvider } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { base } from "viem/chains";
import { Config, cookieToInitialState, WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

export default function Web3Provider({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  const [appKitInstance] = useState(() =>
    typeof window !== "undefined" ? initializeAppKit() : null,
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {appKitInstance ? (
          <AppKitProvider {...appKitInstance} defaultNetwork={base}>
            {children}
          </AppKitProvider>
        ) : (
          children
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
