"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Badge component not available, using span instead
import { formatAddress } from "@/lib/utils";
import { Activity, Coins, Copy, LogOut, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { SpendAuthorization } from "@/components/SpendAuthorization";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { NSCafePayment } from "@/components/NSCafePayment";
import { useCredit } from "@/contexts/CreditContext";

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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
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
                <CardTitle className="text-xl">Rozo Rewards User</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatAddress(address)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
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
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Authorization & Balance */}
        <div className="space-y-6">
                            <SpendAuthorization
                    onAuthorizationComplete={handleAuthorizationComplete}
                    onBalanceUpdate={handleBalanceUpdate}
                    onCreditUpdate={handleCreditUpdate}
                  />
        </div>

        {/* Right Column - NS Cafe Payment */}
        <div className="space-y-6">
          {showNSCafe && (
            <NSCafePayment 
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
          
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-blue-500" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{rozoBalance}</p>
                  <p className="text-xs text-green-600">ROZO Earned</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-600">${availableCredit.toFixed(2)}</p>
                  <p className="text-xs text-blue-600">Available Credit</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xl font-bold text-purple-600">0</p>
                  <p className="text-xs text-purple-600">Payments Made</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration Status */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">🔗 Integration Demo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700">
              <div className="space-y-2">
                <p><strong>✅ Step 1:</strong> Set up $20 authorization above</p>
                <p><strong>✅ Step 2:</strong> Make $0.1 payment at NS Cafe (10% cashback)</p>
                <p><strong>✅ Step 3:</strong> See updated balance: $19.9 auth + 1 ROZO</p>
              </div>
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="font-medium text-blue-800">Expected Flow:</p>
                <p className="text-xs">
                  Authorize $20 → Pay $0.1 → Earn 1 ROZO → Remaining $19.9
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
