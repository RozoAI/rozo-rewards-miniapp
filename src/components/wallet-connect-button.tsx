"use client";

import { useHasMounted } from "@/hooks/useHasMounted";
import { useRozoAPI } from "@/hooks/useRozoAPI";
import { formatAddress } from "@/lib/utils";
import { WalletProvider } from "@coinbase/onchainkit/wallet";
import sdk from "@farcaster/miniapp-sdk";
import { UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

function WalletComponentsInternal() {
  const { address, status } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { isAuthenticated } = useRozoAPI();
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  const displayAddress = address || "";

  useEffect(() => {
    const fetchPfpUrl = async () => {
      const context = await sdk.context;
      if (context && context.user.pfpUrl) {
        setPfpUrl(context.user.pfpUrl);
      }
    };
    fetchPfpUrl();
  }, []);

  return (
    <WalletProvider>
      {status === "disconnected" ? (
        <Button onClick={() => connect({ connector: connectors[0] })}>
          Connect Wallet
        </Button>
      ) : isPending ? (
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
                className="size-2 bg-green-500 rounded-full ml-1"
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

  if (!hasMounted) {
    return <Button disabled>Loading...</Button>;
  }

  return <WalletComponentsInternal />;
}
