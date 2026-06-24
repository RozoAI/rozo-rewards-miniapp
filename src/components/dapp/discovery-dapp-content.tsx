"use client";

import { useAccount } from "wagmi";
import { DappContent, type DappContentProps } from "./dapp-content";

type DiscoveryDappContentProps = Omit<
  DappContentProps,
  "evmAddress" | "evmConnected"
>;

export function DiscoveryDappContent(props: DiscoveryDappContentProps) {
  const { address, isConnected } = useAccount();

  return (
    <DappContent {...props} evmAddress={address} evmConnected={isConnected} />
  );
}
