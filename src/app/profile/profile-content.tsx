"use client";

import { FabActions } from "@/components/fab-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils";
import { Coins, Copy, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function ProfilePageContent() {
  const { address, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { connectors } = useConnect();
  const router = useRouter();

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
      <Card className="mb-4">
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
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        {/* Rewards Stats */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Coins className="h-5 w-5 text-yellow-600" />
              </div>
              Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Rozo - Featured */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Total Rozo
                  </span>
                  <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-1">
                    1,247
                  </div>
                </div>
                <div className="bg-yellow-200 dark:bg-yellow-800 p-3 rounded-full">
                  <Coins className="h-6 w-6 text-yellow-700 dark:text-yellow-300" />
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-lg font-bold text-green-700 dark:text-green-300">
                  +234
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  This Month
                </div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  #127
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Rank
                </div>
              </div>
              <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                  Silver
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  Level
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {/* <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center pb-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">Coffee Purchase</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +25 pts
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">Daily Check-in</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +10 pts
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-medium">Restaurant Review</p>
                  <p className="text-xs text-gray-500">3 days ago</p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +50 pts
                </span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <div>
                  <p className="text-sm font-medium">Friend Referral</p>
                  <p className="text-xs text-gray-500">1 week ago</p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +100 pts
                </span>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      <FabActions />
    </div>
  );
}
