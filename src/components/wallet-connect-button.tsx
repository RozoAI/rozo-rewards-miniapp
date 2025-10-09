"use client";

import { useHasMounted } from "@/hooks/useHasMounted";
import { useRozoAPI } from "@/hooks/useRozoAPI";
import { formatAddress } from "@/lib/utils";
import { WalletProvider } from "@coinbase/onchainkit/wallet";
import sdk from "@farcaster/miniapp-sdk";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

// Internal component that contains wagmi hooks - only rendered after hydration
function WalletComponentsInternal() {
  const { address: accountAddress, status } = useAppKitAccount();
  const { status: connectStatus } = useConnect();
  const { isAuthenticated } = useRozoAPI();
  const { open: openConnectModal } = useAppKit();
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  // Ensure consistent rendering between server and client
  const displayAddress = accountAddress || "";

  useEffect(() => {
    const fetchPfpUrl = async () => {
      const context = await sdk.context;
      if (context && context.user.pfpUrl) {
        setPfpUrl(context.user.pfpUrl);
      }
    };
    fetchPfpUrl();
  }, []);

  console.log({ status, connectStatus, isAuthenticated, accountAddress });

  return (
    <WalletProvider>
      {status === "disconnected" && openConnectModal ? (
        <Button onClick={() => openConnectModal()}>Connect Wallet</Button>
      ) : connectStatus === "pending" ? (
        <Button disabled>Connecting...</Button>
      ) : (
        <Button asChild variant="secondary">
          <Link href={`/profile`}>
            <Avatar className="size-4">
              <AvatarImage
                src={pfpUrl || `https://avatar.tobi.sh/${displayAddress}`}
              />
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
      // <WalletProvider>
      <Button disabled>Loading...</Button>
      // </WalletProvider>
    );
  }

  // Render the internal component only after mounting
  // return <WalletComponentsInternal />;
  return <appkit-button balance="hide" label="Connect Wallet" />;
}
