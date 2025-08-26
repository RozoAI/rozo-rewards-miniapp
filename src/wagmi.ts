"use client";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { getDefaultConfig } from "@rozoai/intent-pay";
import { useMemo } from "react";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";

export function useWagmiConfig() {
  return useMemo(() => {
    const wagmiConfig = createConfig({
      ...getDefaultConfig({
        appName: "Rozo Rewards",
        appIcon: "https://rozo.ai/rozo-logo.png",
        appDescription: "Rozo Rewards MiniApp",
        appUrl: "https://rewards.rozo.ai",
        chains: [base],
        ssr: true,
        transports: {
          [base.id]: http(),
        },
        connectors: [miniAppConnector()],
      }),
    });

    return wagmiConfig;
  }, []);
}
