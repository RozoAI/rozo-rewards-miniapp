"use client";

import { FabActions } from "@/components/fab-actions";
import RozoMembershipRewards from "@/components/RozoMembershipRewards";
// Badge component not available, using span instead
import { WalletComponents } from "@/components/wallet-connect-button";
import { useCredit } from "@/contexts/CreditContext";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useRozoPointAPI } from "@/hooks/useRozoPointAPI";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAppKitAccount } from "@reown/appkit/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConnect, useDisconnect } from "wagmi";

export default function ProfilePageContent({ isBeta }: { isBeta: boolean }) {
  const hasMounted = useHasMounted();

  // Show loading state until hydration is complete
  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      </div>
    );
  }

  return <ProfilePageContentInternal isBeta={isBeta} />;
}

function ProfilePageContentInternal({ isBeta }: { isBeta: boolean }) {
  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { connectors, connect } = useConnect();
  const router = useRouter();
  const [rozoBalance, setRozoBalance] = useState<number>(0);
  const [showNSCafe, setShowNSCafe] = useState(false);
  const { availableCredit, setAvailableCredit, deductCredit } = useCredit();
  const { getPoints, isLoading } = useRozoPointAPI();
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  const { usdcBalance, isLoading: usdcLoading } = useUSDCBalance();
  const [pointsLoading, setPointsLoading] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!address || pointsLoading) return;

      setPointsLoading(true);
      const points = await getPoints(address);
      console.log("points", points);
      setPoints(points);
      setPointsLoading(false);

      const context = await sdk.context;
      if (context && context.user.pfpUrl) {
        setPfpUrl(context.user.pfpUrl);
      }
    };

    fetchPoints();
  }, [isConnected, address]);

  const handleDisconnect = () => {
    connectors.map((connector) => disconnect({ connector }));
    toast.success("Wallet disconnected");
    // router.push("/lifestyle");
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const handleAuthorizationComplete = (data: any) => {
    toast.success("Payment authorization successfully set up!");
    console.log("Authorization complete:", data);
  };

  const handleBalanceUpdate = (balance: number) => {
    setRozoBalance(balance);
  };

  const handleCreditUpdate = (credit: number) => {
    // setAvailableCredit(credit); // This line was removed as per the edit hint
  };

  const handlePaymentSuccess = (data: any) => {
    toast.success(`Payment successful! Earned ${data.cashback_earned} ROZO!`);

    // Deduct the payment amount from available credit
    if (data.amount_paid_usd) {
      // deductCredit(data.amount_paid_usd); // This line was removed as per the edit hint
    }

    // Refresh balance display
    setTimeout(() => {
      window.location.reload(); // Simple refresh for now
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl relative">
      {status === "connected" ? (
        /* Combined Profile & Membership Rewards - Only show when connected */
        <div className="mb-14">
          <RozoMembershipRewards
            userPoints={points}
            usdcBalance={usdcBalance || 0}
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
          <div className="text-center py-12 flex flex-col items-center justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Connect your wallet to view your ROZO membership rewards and
                points
              </p>
            </div>
            <WalletComponents />
          </div>
        </div>
      )}

      <FabActions />
    </div>
  );
}
