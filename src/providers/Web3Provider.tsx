"use client";

import { initializeAppKit, wagmiAdapter } from "@/lib/appkit";
import { RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

  const [appKitInitialized, setAppKitInitialized] = useState(false);

  // Initialize AppKit only once when the component mounts
  useEffect(() => {
    if (!appKitInitialized) {
      initializeAppKit();
      setAppKitInitialized(true);
    }
  }, [appKitInitialized]);

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider>{children}</RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
