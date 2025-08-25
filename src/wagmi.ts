"use client";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { getDefaultConfig } from "@rozoai/intent-pay";
import { useMemo } from "react";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

export function useWagmiConfig() {
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";
  if (!projectId) {
    const providerErrMessage =
      "To connect to all Wallets you need to provide a NEXT_PUBLIC_WC_PROJECT_ID env variable";
    throw new Error(providerErrMessage);
  }

  return useMemo(() => {
    const wagmiConfig = createConfig({
      ...getDefaultConfig({
        appName: "Rozo Rewards",
        appIcon: "https://rozo.ai/rozo-logo.png",
        appDescription: "Rozo Rewards MiniApp",
        appUrl: "https://rewards.rozo.ai",
        chains: [base],
        multiInjectedProviderDiscovery: false,
        ssr: true,
        transports: {
          [base.id]: http(),
        },
        connectors: [miniAppConnector()],
        syncConnectedChain: true,
      }),
    });

    return wagmiConfig;
  }, [projectId]);
}
