"use client";

import { FabActions } from "@/components/fab-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Badge component not available, using span instead
import { formatAddress } from "@/lib/utils";
import { Coins, Copy, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { SpendAuthorization } from "@/components/SpendAuthorization";
import { NSCafePayment } from "@/components/NSCafePayment";

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
  const [availableCredit, setAvailableCredit] = useState<number>(20); // Pre-set $20 credit

  // Redirect to home if not connected
  useEffect(() => {
    if (status === "disconnected") {
      router.push("/");
    }
  }, [isConnected, status, router]);

  const handleDisconnect = () => {
    connectors.map((connector) => disconnect({ connector }));
    toast.success("Wallet disconnected");
    router.push("/");
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const handleAuthorizationComplete = (data: any) => {
    toast.success("Spend Permission authorized for tap-to-pay!");
    console.log("Authorization complete:", data);
  };

  const handleBalanceUpdate = (balance: number) => {
    setRozoBalance(balance);
  };

  const handlePaymentSuccess = (data: any) => {
    toast.success(`Payment successful! Earned ${data.cashback_earned || 1} ROZO!`);
    
    // Deduct the payment amount from available credit  
    if (data.amount_paid_usd) {
      setAvailableCredit(prev => Math.max(0, prev - data.amount_paid_usd));
    }
    
    // Update ROZO balance
    setRozoBalance(prev => prev + (data.cashback_earned || 1));
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
        <CardHeader className="gap-3">
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
              <div>
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
                <div className="text-sm text-purple-600 font-medium mt-1">
                  💰 {rozoBalance} ROZO Balance
                </div>
                <div className="text-sm text-green-600 font-medium">
                  💳 ${availableCredit.toFixed(2)} Available Credit
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNSCafe(!showNSCafe)}
              className="flex items-center gap-2"
            >
              ☕ {showNSCafe ? 'Hide' : 'Show'} NS Cafe Payment
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid - Using main branch layout but with our functionality */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Rewards Stats */}
        <Card className="relative overflow-hidden gap-2">
          <CardHeader className="pb-3">
            <CardTitle>Rewards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Rozo - Featured */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Total Rozo
                  </span>
                  <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200 mt-1">
                    {rozoBalance}
                  </div>
                </div>
                <div className="bg-neutral-200 dark:bg-neutral-800 p-3 rounded-full">
                  <Coins className="h-6 w-6 text-neutral-700 dark:text-neutral-300" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Simplified Authorization & Payment Components */}
        <SpendAuthorization
          onAuthorizationComplete={handleAuthorizationComplete}
          onBalanceUpdate={handleBalanceUpdate}
          simpleMode={true}
        />
        
        {showNSCafe && (
          <NSCafePayment 
            onPaymentSuccess={handlePaymentSuccess}
            availableCredit={availableCredit}
          />
        )}
      </div>

      <FabActions />
    </div>
  );
}
