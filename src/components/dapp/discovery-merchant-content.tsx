"use client";

import { capture, identifyUser } from "@/lib/analytics";
import { WALLET_EVENTS } from "@/lib/analytics/events";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import {
  MerchantContent,
  type MerchantContentProps,
} from "./merchant-content";

type DiscoveryMerchantContentProps = Omit<
  MerchantContentProps,
  "evmAddress" | "evmConnected"
>;

export function DiscoveryMerchantContent(props: DiscoveryMerchantContentProps) {
  const { address, isConnected } = useAccount();
  const prevConnected = useRef(false);

  useEffect(() => {
    if (isConnected && address && !prevConnected.current) {
      identifyUser(address);
      capture(WALLET_EVENTS.WALLET_CONNECTED, { chain: "evm", wallet_address: address.toLowerCase() });
    }
    prevConnected.current = isConnected;
  }, [isConnected, address]);

  return (
    <MerchantContent
      {...props}
      evmAddress={address}
      evmConnected={isConnected}
    />
  );
}
