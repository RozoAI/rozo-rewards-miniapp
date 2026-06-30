"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import type { State } from "wagmi";

// ssr:false prevents @rozoai/intent-pay → @reown/appkit-wallet →
// @walletconnect/logger@3.0.2 CJS/ESM crash during SSR.
// Next.js dynamic with ssr:false renders null for the shell on the server
// but children are passed as props — they render via client hydration.
// Wallet context (WagmiProvider/QueryClientProvider) is not needed for
// server-rendered content; pages that need it (payment UI) are already
// behind their own dynamic() boundaries.
//
// initialState is still threaded through (cookie -> layout -> here) so that
// when ssr:false is eventually lifted, wagmi hydrates from the connected
// wallet's cookie state immediately instead of flashing the picker.
const Web3Provider = dynamic(() => import("./Web3Provider"), { ssr: false });

export default function Web3ProviderClient({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  return <Web3Provider initialState={initialState}>{children}</Web3Provider>;
}
