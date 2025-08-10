"use client";

import { formatAddress } from "@/lib/utils";
import { WalletProvider } from "@coinbase/onchainkit/wallet";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { useRozoAPI } from "@/hooks/useRozoAPI";

// Internal component that contains wagmi hooks - only rendered after hydration
function WalletComponentsInternal() {
  const [wagmiReady, setWagmiReady] = useState(false);
  const { address: accountAddress, status } = useAccount();
  const { connectors, connect, status: connectStatus } = useConnect();
  const { isAuthenticated } = useRozoAPI();

  // Wait for wagmi to stabilize before showing full UI
  useEffect(() => {
    const timer = setTimeout(() => {
      setWagmiReady(true);
    }, 100); // Small delay to let wagmi settle
    
    return () => clearTimeout(timer);
  }, []);

  // Ensure consistent rendering between server and client
  const displayAddress = accountAddress || "";

  if (!wagmiReady) {
    return (
      <WalletProvider>
        <Button disabled>Initializing...</Button>
      </WalletProvider>
    );
  }

  return (
    <WalletProvider>
      {status === "disconnected" ? (
        <Button onClick={() => connect({ connector: connectors[0] })}>
          Connect Wallet
        </Button>
      ) : connectStatus === "pending" ? (
        <Button disabled>Connecting...</Button>
      ) : (
        <Button asChild variant="secondary">
          <Link href={`/profile`}>
            <Avatar className="size-4">
              <AvatarImage src={`https://avatar.tobi.sh/${displayAddress}`} />
              <AvatarFallback>
                <UserIcon className="size-4" />
              </AvatarFallback>
            </Avatar>

            <span className="text-sm">{formatAddress(displayAddress)}</span>
            {isAuthenticated && (
              <div className="w-2 h-2 bg-green-500 rounded-full ml-1" title="Rozo Authenticated" />
            )}
          </Link>
        </Button>
      )}
    </WalletProvider>
  );
}

export function WalletComponents() {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <WalletProvider>
        <Button disabled>Loading...</Button>
      </WalletProvider>
    );
  }

  // Render the internal component only after mounting
  return <WalletComponentsInternal />;
}
