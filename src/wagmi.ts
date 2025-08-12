"use client";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { getDefaultConfig } from "@rozoai/intent-pay";
import { useMemo } from "react";
import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

export function useWagmiConfig() {
  const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";
  if (!projectId) {
    const providerErrMessage =
      "To connect to all Wallets you need to provide a NEXT_PUBLIC_WC_PROJECT_ID env variable";
    throw new Error(providerErrMessage);
  }

  return useMemo(() => {
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Recommended Wallet",
          wallets: [coinbaseWallet],
        },
        {
          groupName: "Other Wallets",
          wallets: [rainbowWallet, metaMaskWallet],
        },
      ],
      {
        appName: "Rozo Rewards MiniApp",
        appIcon: "https://rozo.ai/rozo-logo.png",
        appDescription: "Rozo Rewards MiniApp",
        appUrl: "https://rewards.rozo.ai",
        projectId,
      }
    );

    const wagmiConfig = createConfig({
      ...getDefaultConfig({
        appName: "Rozo Rewards MiniApp",
        appIcon: "https://rozo.ai/rozo-logo.png",
        chains: [base, baseSepolia],
        additionalConnectors: connectors,
        // turn off injected provider discovery
        multiInjectedProviderDiscovery: false,
        ssr: true,
        transports: {
          [base.id]: http(),
          [baseSepolia.id]: http(),
        },
      }),
    });

    return wagmiConfig;
  }, [projectId]);
}
