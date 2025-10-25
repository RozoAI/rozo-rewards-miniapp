"use client";

import { initializeAppKit, wagmiAdapter } from "@/lib/appkit";
import { AppKitProvider } from "@reown/appkit/react";
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

  const [appKitInstance, setAppKitInstance] = useState<any>(null);

  // Initialize AppKit only once when the component mounts
  useEffect(() => {
    const instance = initializeAppKit();
    if (instance) {
      setAppKitInstance(instance);
    }
  }, []);

  // Don't render children until AppKit is initialized
  if (!appKitInstance || !appKitInstance) {
    return null;
  }

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        <AppKitProvider {...appKitInstance}>{children}</AppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
