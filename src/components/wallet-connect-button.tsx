"use client";

import { formatAddress } from "@/lib/utils";
import { WalletProvider } from "@coinbase/onchainkit/wallet";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAccount, useConnect } from "wagmi";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";

export function WalletComponents() {
  const { address: accountAddress, status } = useAccount();
  const { connectors, connect, status: connectStatus } = useConnect();

  useEffect(() => {
    if (accountAddress) {
      toast.success(`Connected to ${accountAddress}`);
    }
  }, [accountAddress]);

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
              <AvatarImage src={`https://avatar.tobi.sh/${accountAddress}`} />
              <AvatarFallback>
                {(accountAddress ?? "").slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <span className="text-sm">{formatAddress(accountAddress)}</span>
          </Link>
        </Button>
      )}
    </WalletProvider>
  );
}
