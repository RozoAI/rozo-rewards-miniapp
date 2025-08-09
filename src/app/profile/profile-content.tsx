"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAddress } from "@/lib/utils";
import { Activity, Coins, Copy, LogOut, Wallet } from "lucide-react";
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
    <div className="container mx-auto px-4 py-6 max-w-2xl">
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
                <CardTitle className="text-xl">John Doe</CardTitle>
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
              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Rewards Stats */}
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Coins className="h-5 w-5 text-yellow-500" />
              Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Rozo
                </span>
                <span className="font-bold text-lg">1,247</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  This Month
                </span>
                <span className="font-semibold text-green-600">+234</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Rank</span>
                <span className="font-semibold text-blue-600">#127</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Level</span>
                <span className="font-semibold text-yellow-600">Gold</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="gap-4">
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
        </Card>
      </div>
    </div>
  );
}
