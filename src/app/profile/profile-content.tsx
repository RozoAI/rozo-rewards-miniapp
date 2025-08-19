"use client";

import { FabActions } from "@/components/fab-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Badge component not available, using span instead
import { WalletComponents } from "@/components/wallet-connect-button";
import { useCredit } from "@/contexts/CreditContext";
import { formatAddress } from "@/lib/utils";
import { Coins, Copy, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRozoPoints } from "@/hooks/useRozoPoints";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";

export default function ProfilePageContent() {
  const [mounted, setMounted] = useState(false);
  const [hydrationComplete, setHydrationComplete] = useState(false);

  // Prevent hydration issues - mount first, then load wagmi hooks
  useEffect(() => {
    setMounted(true);
    // Add delay to ensure wagmi hydration is complete
    const timer = setTimeout(() => {
      setHydrationComplete(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading state until hydration is complete
  if (!mounted || !hydrationComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return <ProfilePageContentInternal />;
}

function ProfilePageContentInternal() {
  const { address, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors } = useConnect();
  const router = useRouter();
  const [rozoBalance, setRozoBalance] = useState<number>(0);
  const [showNSCafe, setShowNSCafe] = useState(false);
  const { availableCredit, setAvailableCredit, deductCredit } = useCredit();
  const { points, isLoading: pointsLoading, purchaseWithUSDC, redeemUsingPoints, isConnected: walletConnected, isOnBaseChain, switchToBase, isSwitching, debug } = useRozoPoints();
  const { usdcBalance, isLoading: usdcLoading, refreshBalance } = useUSDCBalance();

  const handleDisconnect = () => {
    connectors.map((connector) => disconnect({ connector }));
    toast.success("Wallet disconnected");
    router.push("/lifestyle");
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
    setAvailableCredit(credit);
  };

  const handlePaymentSuccess = (data: any) => {
    toast.success(`Payment successful! Earned ${data.cashback_earned} ROZO!`);

    // Deduct the payment amount from available credit
    if (data.amount_paid_usd) {
      deductCredit(data.amount_paid_usd);
    }

    // Refresh balance display
    setTimeout(() => {
      window.location.reload(); // Simple refresh for now
    }, 2000);
  };

  // Show loading state while checking connection
  if (status === "reconnecting" || !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl relative">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardHeader className="gap-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={`https://avatar.tobi.sh/${address}`}
                  alt="Profile"
                />
                <AvatarFallback className="text-lg">
                  {address ? address.slice(2, 4).toUpperCase() : "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                {status === "connected" ? (
                  <>
                    <CardTitle className="text-xl flex items-center gap-2">
                      {formatAddress(address)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyAddress}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </CardTitle>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnect}
                      className="w-fit"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <WalletComponents />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ROZO Points Display */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* ROZO Balance Card */}
        <Card className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-blue-500" />
              ROZO Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Network Warning */}
              {walletConnected && !isOnBaseChain && (
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                        Switch to Base Network
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        ROZO Points are only available on Base network
                      </p>
                    </div>
                    <Button
                      onClick={switchToBase}
                      disabled={isSwitching}
                      variant="outline"
                      size="sm"
                      className="border-orange-300 text-orange-700 hover:bg-orange-100"
                    >
                      {isSwitching ? "Switching..." : "Switch to Base"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Balances */}
              <div className="grid grid-cols-2 gap-4">
                {/* USDC Balance */}
                <div className="flex flex-col p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    USDC Balance
                  </span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {walletConnected && isOnBaseChain && !usdcLoading ? usdcBalance.toFixed(2) : "0.00"} USDC
                  </span>
                </div>

                {/* ROZO Points Balance */}
                <div className="flex flex-col p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    ROZO Points
                  </span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {walletConnected && isOnBaseChain && !pointsLoading ? points : "0"} Points
                  </span>
                </div>
              </div>






              {/* Points Info */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
                  {walletConnected 
                    ? "Spend Crypto. Earn Cashback."
                    : "Connect your wallet to view your ROZO points balance"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authorization & Payment Components */}
        {/* <SpendAuthorization
            onAuthorizationComplete={handleAuthorizationComplete}
            onBalanceUpdate={handleBalanceUpdate}
            onCreditUpdate={handleCreditUpdate}
          /> */}
      </div>

      <FabActions />
    </div>
  );
}
