"use client";

import { useHasMounted } from "@/hooks/useHasMounted";
import { useRozoAPI } from "@/hooks/useRozoAPI";
import { formatAddress } from "@/lib/utils";
import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { WalletProvider } from "@coinbase/onchainkit/wallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

// Internal component that contains wagmi hooks - only rendered after hydration
function WalletComponentsInternal() {
  const { address: accountAddress, status } = useAccount();
  const { status: connectStatus } = useConnect();
  const { isAuthenticated } = useRozoAPI();
  const { openConnectModal } = useConnectModal();
  const { isPending } = useIsInMiniApp();

  // Ensure consistent rendering between server and client
  const displayAddress = accountAddress || "";

  if (isPending) {
    return (
      <WalletProvider>
        <Button disabled>Initializing...</Button>
      </WalletProvider>
    );
  }

  return (
    <WalletProvider>
      {status === "disconnected" && openConnectModal ? (
        <Button onClick={openConnectModal}>Connect Wallet</Button>
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
              <div
                className="w-2 h-2 bg-green-500 rounded-full ml-1"
                title="Rozo Authenticated"
              />
            )}
          </Link>
        </Button>
      )}
    </WalletProvider>
  );
}

export function WalletComponents() {
  const hasMounted = useHasMounted();

  // Show loading state until mounted to prevent hydration mismatch
  if (!hasMounted) {
    return (
      <WalletProvider>
        <Button disabled>Loading...</Button>
      </WalletProvider>
    );
  }

  // Render the internal component only after mounting
  return <WalletComponentsInternal />;
}
