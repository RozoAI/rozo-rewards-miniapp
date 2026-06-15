"use client";

import { useAppKitAccount } from "@reown/appkit/react";
import { DappContent, type DappContentProps } from "./dapp-content";

type DiscoveryDappContentProps = Omit<
  DappContentProps,
  "evmAddress" | "evmConnected"
>;

export function DiscoveryDappContent(props: DiscoveryDappContentProps) {
  const { address, isConnected } = useAppKitAccount();

  return (
    <DappContent {...props} evmAddress={address} evmConnected={isConnected} />
  );
}
