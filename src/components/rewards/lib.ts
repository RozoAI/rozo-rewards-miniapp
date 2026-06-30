import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { Crown, Diamond, Gem, MedalIcon, Star } from "lucide-react";
import React from "react";

// ─── types ────────────────────────────────────────────────────────────────────

export type WalletType = "evm" | "stellar" | "solana";

export interface StellarRewards {
  seeds: number;
  totalVolumeUsdc: number;
  totalVolumeEurc: number;
}

// ─── constants ────────────────────────────────────────────────────────────────

export const SILVER_THRESHOLD = 500;

export const MEMBER_BENEFITS = [
  "Earn 1 point per $1 spent",
  "Earn 1 point per daily check-in",
  "10% invitation reward",
  "Earn points from consumption",
];

export const TIERS = [
  {
    key: "member",
    label: "Member",
    icon: React.createElement(Crown, { className: "size-4" }),
    requirements: ["Obtained automatically through consumption"],
    benefits: MEMBER_BENEFITS,
  },
  {
    key: "silver",
    label: "Silver",
    icon: React.createElement(Star, { className: "size-4" }),
    requirements: ["Spend $500 in the current year, or", "Spend $200 in one day"],
    benefits: [
      "All Member benefits",
      "Earn 5 points per daily check-in",
      "Can apply for ROZO ID (no approval or payment required)",
      "ROZO ID lets you receive gifted points from other users",
      "Purchase ROZO OG with 50% Cashback (limited to 1,000 units)",
    ],
  },
  {
    key: "gold",
    label: "Gold",
    icon: React.createElement(MedalIcon, { className: "size-4" }),
    requirements: ["Spend $2,000 in the current year, or", "Spend $500 in one day"],
    benefits: [
      "All Silver benefits",
      "Earn 10 points per daily check-in",
      "Priority access to campaigns",
      "Higher invitation reward",
    ],
  },
  {
    key: "platinum",
    label: "Platinum",
    icon: React.createElement(Diamond, { className: "size-4" }),
    requirements: ["Spend $10,000 in the current year, or", "Spend $2,000 in one day"],
    benefits: [
      "All Gold benefits",
      "Earn 20 points per daily check-in",
      "Dedicated support",
      "Early access to new chains",
    ],
  },
  {
    key: "diamond",
    label: "Diamond",
    icon: React.createElement(Gem, { className: "size-4" }),
    requirements: ["Spend $50,000 in the current year, or", "Spend $10,000 in one day"],
    benefits: [
      "All Platinum benefits",
      "Earn 50 points per daily check-in",
      "Invitations to ROZO events",
      "Highest campaign multipliers",
    ],
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

export function fmt(n: number, dec: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function fmtPoints(n: number) {
  return fmt(n, 2);
}

// ─── API ──────────────────────────────────────────────────────────────────────

const CASHBACK_PARAM: Record<WalletType, string> = {
  evm: "evm_address",
  stellar: "stellar_address",
  solana: "solana_address",
};

export async function fetchPoints(type: WalletType, address: string): Promise<number | null> {
  const param = CASHBACK_PARAM[type];
  const value = type === "evm" ? address.toLowerCase() : address;
  const res = await fetch(`https://auth0.rozo.ai/functions/v1/cashback?${param}=${value}`);
  if (!res.ok) return null;
  const data = await res.json();
  const points = data?.balance?.points;
  return points == null ? null : points * 100;
}

export async function fetchStellarRewards(address: string): Promise<StellarRewards | null> {
  const res = await fetch(
    `https://intentapiv4.rozo.ai/functions/v1/payment-api/rewards/${address}`,
  );
  if (!res.ok) return null;
  return res.json();
}

// ─── Stellar Wallets Kit ──────────────────────────────────────────────────────

export const kit =
  typeof window !== "undefined"
    ? new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      })
    : null;
