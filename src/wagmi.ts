"use client";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { getDefaultConfig } from "@rozoai/intent-pay";
import { useMemo } from "react";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";

export function useWagmiConfig() {
  if (!process.env.NEXT_PUBLIC_WC_PROJECT_ID) {
    throw new Error("Require Environment NEXT_PUBLIC_WC_PROJECT_ID");
  }

  return useMemo(() => {
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Recommended",
          wallets: [metaMaskWallet, coinbaseWallet, phantomWallet],
        },
      ],
      {
        appName: "Rozo Rewards",
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID as string,
      }
    );

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
        connectors: [miniAppConnector(), baseAccount(), ...connectors],
      }),
    });

    return wagmiConfig;
  }, []);
}
