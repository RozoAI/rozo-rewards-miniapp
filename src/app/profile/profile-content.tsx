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
              {/* Current Balance */}
              <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Available Points
                </span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {status === "connected" ? "10" : "0"} ROZO
                </span>
              </div>

              {/* Activity History */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Recent Activity
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        New User Registration
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Welcome bonus earned
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{status === "connected" ? "10" : "0"} ROZO
                    </span>
                  </div>
                </div>
              </div>

              {/* Points Info */}
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
                  Earn more ROZO by making purchases at participating merchants
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
