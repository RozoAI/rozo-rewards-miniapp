"use client";

import { FabActions } from "@/components/fab-actions";
import RozoMembershipRewards from "@/components/rozo-membership-rewards";
// Badge component not available, using span instead
import { WalletComponents } from "@/components/wallet-connect-button";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { GLOBAL_EVENTS, REWARDS_EVENTS } from "@/lib/analytics/events";
import { capture, identifyUser, resetUser } from "@/lib/analytics/index";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAppKitAccount } from "@reown/appkit/react";
import { Loader2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConnect, useDisconnect } from "wagmi";

export default function ProfilePageContent({ isBeta }: { isBeta: boolean }) {
  const hasMounted = useHasMounted();

  // Show loading state until hydration is complete
  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin" />
        </div>
      </div>
    );
  }

  return <ProfilePageContentInternal isBeta={isBeta} />;
}

function ProfilePageContentInternal({ isBeta }: { isBeta: boolean }) {
  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { connectors } = useConnect();
  const { getPoints } = useRozoPointAPI();
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  const { isLoading: usdcLoading } = useUSDCBalance();
  const [pointsLoading, setPointsLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const identifiedAddressRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!address || pointsLoading) return;

      setPointsLoading(true);
      const points = await getPoints(address);
      console.log("points", points);
      setPoints(points);
      setPointsLoading(false);
      capture(REWARDS_EVENTS.WALLET_BALANCE_VIEWED, {
        rozo_balance: String(points),
      });

      const context = await sdk.context;
      if (context && context.user.pfpUrl) {
        setPfpUrl(context.user.pfpUrl);
      }

      if (identifiedAddressRef.current !== address) {
        identifiedAddressRef.current = address;
        identifyUser(address, {
          rozo_balance: String(points),
          fid: context?.user?.fid ?? null,
        });
        capture(GLOBAL_EVENTS.USER_IDENTIFIED, {
          rozo_balance: String(points),
          fid: context?.user?.fid ?? null,
        });
      }
    };

    fetchPoints();
  }, [isConnected, address]);

  const handleDisconnect = () => {
    connectors.map((connector) => disconnect({ connector }));
    toast.success("Wallet disconnected");
    capture(GLOBAL_EVENTS.USER_RESET);
    resetUser();
    identifiedAddressRef.current = null;
    // router.push("/lifestyle");
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl relative">
      {status === "connected" ? (
        /* Combined Profile & Membership Rewards - Only show when connected */
        <div className="mb-14">
          <RozoMembershipRewards
            userPoints={points}
            address={address}
            pfpUrl={pfpUrl}
            isLoading={pointsLoading || usdcLoading}
            showProfileActions={true}
            onCopyAddress={copyAddress}
            onDisconnect={handleDisconnect}
            isConnected={true}
            isBeta={isBeta}
          />
        </div>
      ) : (
        /* Wallet Connection Prompt - Show when not connected */
        <div className="mb-14">
          <div className="text-center py-12 flex flex-col items-center justify-center space-y-6">
            <div className="mx-auto size-20 bg-muted rounded-full flex items-center justify-center">
              <User className="size-10 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Connect Your Wallet
              </h1>
              <p className="text-muted-foreground">
                Connect your wallet to view your ROZO membership rewards and
                points
              </p>
            </div>

            <div className="flex justify-center">
              <WalletComponents />
            </div>
          </div>
        </div>
      )}

      <FabActions />
    </div>
  );
}
