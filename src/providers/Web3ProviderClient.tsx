"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// ssr:false prevents @rozoai/intent-pay → @reown/appkit-wallet →
// @walletconnect/logger@3.0.2 CJS/ESM crash during SSR.
// Next.js dynamic with ssr:false renders null for the shell on the server
// but children are passed as props — they render via client hydration.
// Wallet context (WagmiProvider/QueryClientProvider) is not needed for
// server-rendered content; pages that need it (payment UI) are already
// behind their own dynamic() boundaries.
const Web3Provider = dynamic(() => import("./Web3Provider"), { ssr: false });

export default function Web3ProviderClient({
  children,
}: {
  children: ReactNode;
}) {
  return <Web3Provider>{children}</Web3Provider>;
}
