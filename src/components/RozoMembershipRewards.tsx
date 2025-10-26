"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  Crown,
  Diamond,
  Gem,
  LogOut,
  MedalIcon,
  Star,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

interface MembershipTier {
  name: string;
  color: string;
  icon: React.ReactNode;
  requirements: string[];
  benefits: string[];
  pointsPerCheckin: number;
  invitationReward: string;
  isUpgradeable?: boolean;
  upgradeBanner?: string;
}

const membershipTiers: MembershipTier[] = [
  {
    name: "Member Card",
    color: "bg-neutral-100 text-black border-neutral-300",
    icon: <Crown className="size-5" />,
    requirements: ["Obtained automatically through consumption"],
    benefits: [
      "Earn 1 experience point per $1 spent",
      "Earn 1 experience point per daily check-in",
      "10% invitation reward",
      "Earn points from consumption",
    ],
    pointsPerCheckin: 1,
    invitationReward: "10%",
    isUpgradeable: true,
    upgradeBanner:
      "Purchase ROZO OG to directly upgrade to Silver Card and enjoy exclusive benefits",
  },
  {
    name: "Silver Card",
    color: "bg-neutral-200 text-black border-neutral-400",
    icon: <Star className="size-5" />,
    requirements: [
      "Spend $500 in the current year, OR",
      "Spend $200 in one day",
    ],
    benefits: [
      "All Member Card benefits",
      "Earn 5 experience points per daily check-in",
      "Can apply for ROZO ID (no approval or payment required)",
      "ROZO ID allows you to receive gifted points from other users",
      "Can purchase ROZO OG with 50% Cashback (limited to 1000 units)",
    ],
    pointsPerCheckin: 5,
    invitationReward: "10%",
  },
  {
    name: "Gold Card",
    color: "bg-yellow-400 text-yellow-900 border-yellow-500",
    icon: <MedalIcon className="size-5" />,
    requirements: [
      "Spend $5,000 in the current year, OR",
      "Spend $2,000 in one day",
      "Requires 100 points to upgrade",
    ],
    benefits: [
      "All Silver Card benefits",
      "Member gift: Free AI service trial",
      "Earn 10 experience points per daily check-in",
      "15% invitation reward",
    ],
    pointsPerCheckin: 10,
    invitationReward: "15%",
  },
  {
    name: "Platinum Card",
    color: "bg-blue-500 text-white border-blue-700",
    icon: <Diamond className="size-5" />,
    requirements: [
      "Spend $10,000 in the current year, OR",
      "Spend $5,000 in one day",
    ],
    benefits: [
      "All Gold Card benefits",
      "Can gift points to other ROZO users",
      "Member gifts: Free coffee/merchandise/AI services",
    ],
    pointsPerCheckin: 10,
    invitationReward: "15%",
  },
  {
    name: "Diamond Card",
    color: "bg-purple-500 text-white border-purple-700",
    icon: <Gem className="size-5" />,
    requirements: ["Spend $100,000 in the current year"],
    benefits: [
      "2x points multiplier",
      "Access to exclusive community",
      "Invitations to offline events/dinners",
      "Member gifts: Free coffee/merchandise/AI services plus limited edition co-branded items",
    ],
    pointsPerCheckin: 10,
    invitationReward: "15%",
  },
];

interface RozoMembershipRewardsProps {
  userPoints: number;
  address: string | undefined;
  pfpUrl: string | null;
  isLoading: boolean;
  showProfileActions?: boolean;
  onCopyAddress?: () => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
  isBeta?: boolean;
}

export default function RozoMembershipRewards({
  userPoints,
  address,
  pfpUrl,
  isLoading,
  showProfileActions = false,
  onCopyAddress,
  onDisconnect,
  isConnected = false,
  isBeta = false,
}: RozoMembershipRewardsProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const toggleTier = (tierName: string) => {
    setExpandedTier(expandedTier === tierName ? null : tierName);
  };

  // Determine current tier based on spending (mock logic - replace with real API)
  const getCurrentTier = (points: number) => {
    if (points >= 100000) return "DIAMOND";
    if (points >= 10000) return "PLATINUM";
    if (points >= 5000) return "GOLD";
    if (points >= 500) return "SILVER";
    return "MEMBER";
  };

  const currentTier = getCurrentTier(userPoints);
  const expToNext = { current: 320, required: 500 }; // Mock data - replace with real calculation

  // Get membership description based on current tier
  const getMembershipDescription = (tier: string) => {
    const tierMap: { [key: string]: string } = {
      MEMBER: "Member Card",
      SILVER: "Silver Card",
      GOLD: "Gold Card",
      PLATINUM: "Platinum Card",
      DIAMOND: "Diamond Card",
    };

    const tierName = tierMap[tier] || "Member Card";
    const tierData = membershipTiers.find((t) => t.name === tierName);

    return tierData || membershipTiers[0]; // fallback to first tier
  };

  const currentTierData = getMembershipDescription(currentTier);

  return (
    <div className="space-y-4">
      {/* User Info Header */}
      <Card className="bg-black dark:bg-card text-white p-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 mb-auto">
                <AvatarImage
                  src={pfpUrl || `https://avatar.tobi.sh/${address}`}
                />
                <AvatarFallback>
                  <UserIcon className="size-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : "User"}
                  </h3>
                  {showProfileActions && isConnected && onCopyAddress && (
                    <Button variant="ghost" size="icon" onClick={onCopyAddress}>
                      <Copy className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {showProfileActions && isConnected && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDisconnect}
                className="mb-auto"
              >
                <LogOut className="size-4 mr-1" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2">
            <div>
              <p className="text-sm text-neutral-300 mb-1">Total Points</p>
              <p className="text-3xl font-bold">
                {isLoading ? (
                  <div className="h-8 w-24 bg-neutral-600 rounded animate-pulse"></div>
                ) : (
                  userPoints.toLocaleString()
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-neutral-300 mb-1">Current Tier</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-neutral-600 rounded animate-pulse"></div>
              ) : (
                <Badge className={currentTierData.color}>{currentTier}</Badge>
              )}
            </div>
          </div>

          {isBeta && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-300">
                  EXP to Next Level
                </span>
                <span className="text-sm text-neutral-300">
                  {expToNext.current}/{expToNext.required}
                </span>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(expToNext.current / expToNext.required) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Tier Benefits */}
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Current Tier Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {currentTierData.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="size-4 mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* All Tier Benefits - Compact List */}
      <Card className="pb-0 gap-0">
        <CardHeader className="border-b">
          <CardTitle>All Tier Benefits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {membershipTiers.map((tier, index) => (
              <div key={tier.name}>
                <div
                  className={cn(
                    "flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors",
                    index === membershipTiers.length - 1 && "rounded-b-xl",
                    tier.name === expandedTier && "rounded-b-none"
                  )}
                  onClick={() => toggleTier(tier.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${tier.color}`}>
                      {tier.icon}
                    </div>
                    <span className="font-medium">{tier.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-neutral-400" />
                </div>

                {expandedTier === tier.name && (
                  <div className="px-4 pb-4 border-t bg-neutral-50 dark:bg-neutral-800">
                    <div className="pt-4 space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-2">
                          Requirements:
                        </h5>
                        <ul className="space-y-1">
                          {tier.requirements.map((req, reqIndex) => (
                            <li
                              key={reqIndex}
                              className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start gap-2"
                            >
                              <span className="text-neutral-400">•</span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-2">Benefits:</h5>
                        <ul className="space-y-1">
                          {tier.benefits.map((benefit, benefitIndex) => (
                            <li
                              key={benefitIndex}
                              className="text-sm text-neutral-600 dark:text-neutral-400 flex items-start gap-2"
                            >
                              <span className="text-green-500">✓</span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {index < membershipTiers.length - 1 && (
                  <div className="border-b border-neutral-200 dark:border-neutral-700" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {isBeta && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {[
                {
                  action: "Coffee purchase",
                  points: "-500 pts",
                  location: "NS Café",
                },
                {
                  action: "10% Off redeemed",
                  points: "-1000 pts",
                  location: "ROZO Banana",
                },
                {
                  action: "Invite reward",
                  points: "+150 pts",
                  location: "0xA1...B9C",
                },
                {
                  action: "Check-in",
                  points: "+5 pts",
                  location: "Daily Check-in",
                },
              ].map((activity, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-neutral-500">
                          {activity.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.points}</p>
                    </div>
                  </div>
                  {index < 3 && (
                    <div className="border-b border-neutral-200 dark:border-neutral-700" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
