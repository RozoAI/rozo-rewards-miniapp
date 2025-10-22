"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  Crown,
  Diamond,
  Gem,
  LogOut,
  Star,
  Zap,
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
    color: "bg-gray-100 text-black border-gray-300",
    icon: <Crown className="h-5 w-5" />,
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
    color: "bg-gray-200 text-black border-gray-400",
    icon: <Star className="h-5 w-5" />,
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
    color: "bg-gray-300 text-black border-gray-500",
    icon: <Gem className="h-5 w-5" />,
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
    color: "bg-gray-400 text-black border-gray-600",
    icon: <Diamond className="h-5 w-5" />,
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
    color: "bg-black text-white border-gray-800",
    icon: <Diamond className="h-5 w-5" />,
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

const specialTiers = [
  {
    name: "OG Label",
    color: "bg-gray-100 text-black border-gray-300",
    icon: <Zap className="h-5 w-5" />,
    benefits: ["Receive airdrops from partner projects and free subscriptions"],
  },
  {
    name: "Black Card",
    color: "bg-black text-white border-gray-600",
    icon: <Crown className="h-5 w-5" />,
    benefits: ["Invitation only"],
  },
];

const pointsStages = [
  { stage: 0, gdp: 0, pointsEarned: 1, redemptionValue: 1 },
  { stage: 1, gdp: 1, pointsEarned: 0.1, redemptionValue: 2 },
  { stage: 2, gdp: 10, pointsEarned: 0.01, redemptionValue: 4 },
  { stage: 3, gdp: 100, pointsEarned: 0.001, redemptionValue: 8 },
  { stage: 4, gdp: 10000, pointsEarned: 0.0001, redemptionValue: 16 },
];

interface RozoMembershipRewardsProps {
  userPoints: number;
  usdcBalance: number;
  address: string | undefined;
  pfpUrl: string | null;
  isLoading: boolean;
  showProfileActions?: boolean;
  onCopyAddress?: () => void;
  onDisconnect?: () => void;
  isConnected?: boolean;
}

export default function RozoMembershipRewards({
  userPoints,
  usdcBalance,
  address,
  pfpUrl,
  isLoading,
  showProfileActions = false,
  onCopyAddress,
  onDisconnect,
  isConnected = false,
}: RozoMembershipRewardsProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const [showPointsDetails, setShowPointsDetails] = useState(false);

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

  return (
    <div className="space-y-4">
      {/* User Info Header */}
      <Card className="bg-black text-white p-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black font-bold text-lg mb-auto">
                {address ? address.slice(2, 4).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    {address
                      ? `${address.slice(0, 6)}...${address.slice(-4)}`
                      : "User"}
                  </h3>
                  {showProfileActions && isConnected && onCopyAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCopyAddress}
                      className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-300">
                  {address
                    ? `${address.slice(0, 6)}...${address.slice(-4)}`
                    : "Not connected"}
                </p>
                {showProfileActions && isConnected && onDisconnect && (
                  <Button variant="outline" size="sm" onClick={onDisconnect}>
                    <LogOut className="h-3 w-3 mr-1" />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary">{currentTier}</Badge>
              <Badge variant="outline">OG</Badge>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-300 mb-1">TOTAL POINTS</p>
            <p className="text-3xl font-bold">
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-600 rounded animate-pulse"></div>
              ) : (
                userPoints.toLocaleString()
              )}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">EXP to Next Level</span>
              <span className="text-sm text-gray-300">
                {expToNext.current}/{expToNext.required}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(expToNext.current / expToNext.required) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-in */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Daily Check-in
              </h4>
              <p className="text-sm text-gray-500">
                This tier does not provide check-in EXP
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Check-in
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Tier Benefits */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">CURRENT TIER BENEFITS</CardTitle>
            <Badge variant="secondary" className="bg-black text-white">
              {currentTier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-black mt-0.5 shrink-0" />
              <span>
                Upgrade by spending $10,000 in the current year or $5,000 in one
                day
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-black mt-0.5 shrink-0" />
              <span>Points can be gifted to other ROZO users</span>
            </li>
            <li className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-black mt-0.5 shrink-0" />
              <span>Member gifts: Free coffee/merchandise/AI services</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* All Tier Benefits - Compact List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ALL TIER BENEFITS</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {membershipTiers.map((tier, index) => (
              <div key={tier.name}>
                <div
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => toggleTier(tier.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${tier.color}`}>
                      {tier.icon}
                    </div>
                    <span className="font-medium">{tier.name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>

                {expandedTier === tier.name && (
                  <div className="px-4 pb-4 border-t bg-gray-50 dark:bg-gray-800">
                    <div className="pt-4 space-y-3">
                      <div>
                        <h5 className="font-medium text-sm mb-2">
                          Requirements:
                        </h5>
                        <ul className="space-y-1">
                          {tier.requirements.map((req, reqIndex) => (
                            <li
                              key={reqIndex}
                              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                            >
                              <span className="text-gray-400">•</span>
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
                              className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
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
                  <div className="border-b border-gray-200 dark:border-gray-700" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">RECENT ACTIVITY</CardTitle>
            <Button variant="ghost" size="sm" className="text-black">
              See All
            </Button>
          </div>
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
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                    <div>
                      <p className="font-medium text-sm">{activity.action}</p>
                      <p className="text-xs text-gray-500">
                        {activity.location}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{activity.points}</p>
                  </div>
                </div>
                {index < 3 && (
                  <div className="border-b border-gray-200 dark:border-gray-700" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
