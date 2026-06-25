"use client";

import { Ethereum, Solana, Stellar } from "@/components/chain-logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  allowAllModules,
  FREIGHTER_ID,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
} from "@reown/appkit/react";
import {
  CheckCircle,
  Crown,
  Diamond,
  Gem,
  LogOut,
  MedalIcon,
  Sprout,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── constants ────────────────────────────────────────────────────────────────

const MEMBER_BENEFITS = [
  "Earn 1 point per $1 spent",
  "Earn 1 point per daily check-in",
  "10% invitation reward",
  "Earn points from consumption",
];

const TIERS = [
  {
    key: "member",
    label: "Member",
    icon: <Crown className="size-4" />,
    requirements: ["Obtained automatically through consumption"],
    benefits: MEMBER_BENEFITS,
  },
  {
    key: "silver",
    label: "Silver",
    icon: <Star className="size-4" />,
    requirements: [
      "Spend $500 in the current year, or",
      "Spend $200 in one day",
    ],
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
    icon: <MedalIcon className="size-4" />,
    requirements: [
      "Spend $2,000 in the current year, or",
      "Spend $500 in one day",
    ],
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
    icon: <Diamond className="size-4" />,
    requirements: [
      "Spend $10,000 in the current year, or",
      "Spend $2,000 in one day",
    ],
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
    icon: <Gem className="size-4" />,
    requirements: [
      "Spend $50,000 in the current year, or",
      "Spend $10,000 in one day",
    ],
    benefits: [
      "All Platinum benefits",
      "Earn 50 points per daily check-in",
      "Invitations to ROZO events",
      "Highest campaign multipliers",
    ],
  },
];

const SPEND_YEAR = 320;
const SILVER_THRESHOLD = 500;
const SPEND_PCT = Math.min(100, (SPEND_YEAR / SILVER_THRESHOLD) * 100);
const REMAIN = Math.max(0, SILVER_THRESHOLD - SPEND_YEAR);

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dec: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtPoints(n: number) {
  return n < 1 && n > 0 ? fmt(n, 3) : fmt(n, 0);
}

async function fetchPointsEvm(address: string): Promise<number | null> {
  const res = await fetch(
    `https://auth0.rozo.ai/functions/v1/cashback?evm_address=${address.toLowerCase()}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.balance?.points ?? null;
}

async function fetchPointsStellar(address: string): Promise<number | null> {
  const res = await fetch(
    `https://auth0.rozo.ai/functions/v1/cashback?stellar_address=${address}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.balance?.points ?? null;
}

interface StellarRewards {
  seeds: number;
  totalVolumeUsdc: number;
  totalVolumeEurc: number;
}

async function fetchStellarRewards(
  address: string,
): Promise<StellarRewards | null> {
  const res = await fetch(
    `https://intentapiv4.rozo.ai/functions/v1/payment-api/rewards/${address}`,
  );
  if (!res.ok) return null;
  return res.json();
}

// ─── SWK — initialized at module load ─────────────────────────────────────────

const kit =
  typeof window !== "undefined"
    ? new StellarWalletsKit({
        network: WalletNetwork.PUBLIC,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      })
    : null;

// ─── wallet type chooser ──────────────────────────────────────────────────────

type WalletType = "evm" | "stellar" | "solana";

function WalletChooser({
  open,
  onChoose,
  onClose,
}: {
  open: boolean;
  onChoose: (type: WalletType) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs rounded-3xl">
        <DialogHeader>
          <DialogTitle>Choose network</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 mt-1">
          <button
            onClick={() => onChoose("stellar")}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <Stellar width={28} height={28} className="bg-transparent" />
            <span className="text-xs font-semibold">Stellar</span>
          </button>
          <button
            onClick={() => onChoose("evm")}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-1">
              <Ethereum width={28} height={28} className="rounded-full" />
            </div>
            <span className="text-xs font-semibold">Ethereum</span>
          </button>
          <button
            onClick={() => onChoose("solana")}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-1">
              <Solana width={28} height={28} />
            </div>
            <span className="text-xs font-semibold">Solana</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  // EVM (AppKit)
  const { open: openAppKit } = useAppKit();
  const { address: evmAddress, isConnected: evmConnected } = useAppKitAccount();
  const { address: solanaAddress, isConnected: solanaConnected } =
    useAppKitAccount({ namespace: "solana" });
  const { disconnect: disconnectAppKit } = useDisconnect();

  // Stellar (SWK)
  const [stellarAddress, setStellarAddress] = useState<string | null>(null);

  // Shared state
  const [chooser, setChooser] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [stellarRewards, setStellarRewards] = useState<StellarRewards | null>(
    null,
  );
  const [stellarRewardsLoading, setStellarRewardsLoading] = useState(false);

  const isConnected =
    (walletType === "evm" && evmConnected) ||
    (walletType === "solana" && solanaConnected) ||
    (walletType === "stellar" && !!stellarAddress);

  const displayAddress =
    walletType === "evm"
      ? (evmAddress ?? null)
      : walletType === "solana"
        ? (solanaAddress ?? null)
        : stellarAddress;

  const shortAddress = displayAddress
    ? walletType === "evm"
      ? `${displayAddress.slice(0, 6)}…${displayAddress.slice(-4)}`
      : `${displayAddress.slice(0, 4)}…${displayAddress.slice(-4)}`
    : null;

  // Fetch points when connected
  useEffect(() => {
    if (!isConnected || !displayAddress) {
      setPoints(null);
      return;
    }
    setPointsLoading(true);
    const fetcher =
      walletType === "stellar"
        ? fetchPointsStellar(displayAddress)
        : fetchPointsEvm(displayAddress);
    fetcher.then(setPoints).finally(() => setPointsLoading(false));
  }, [isConnected, displayAddress, walletType]);

  // Fetch stellar rewards (Seeds) when stellar connected
  useEffect(() => {
    if (walletType !== "stellar" || !stellarAddress) {
      setStellarRewards(null);
      return;
    }
    setStellarRewardsLoading(true);
    fetchStellarRewards(stellarAddress)
      .then(setStellarRewards)
      .finally(() => setStellarRewardsLoading(false));
  }, [walletType, stellarAddress]);

  // Reset when EVM disconnects
  useEffect(() => {
    if (walletType === "evm" && !evmConnected) {
      setWalletType(null);
      setPoints(null);
    }
  }, [evmConnected, walletType]);

  // Reset when Solana disconnects
  useEffect(() => {
    if (walletType === "solana" && !solanaConnected) {
      setWalletType(null);
      setPoints(null);
    }
  }, [solanaConnected, walletType]);

  function handleConnectClick() {
    setChooser(true);
  }

  async function handleChoose(type: WalletType) {
    setChooser(false);
    setWalletType(type);
    if (type === "evm") {
      openAppKit({ view: "Connect", namespace: "eip155" });
    } else if (type === "solana") {
      openAppKit({ view: "Connect", namespace: "solana" });
    } else if (kit) {
      await kit.openModal({
        onWalletSelected: async (option: { id: string }) => {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          setStellarAddress(address);
        },
      });
    }
  }

  function handleDisconnect() {
    if (walletType === "evm") {
      disconnectAppKit({ namespace: "eip155" });
    } else if (walletType === "solana") {
      disconnectAppKit({ namespace: "solana" });
    } else {
      setStellarAddress(null);
    }
    setWalletType(null);
    setPoints(null);
    setStellarRewards(null);
  }

  return (
    <>
      <WalletChooser
        open={chooser}
        onChoose={handleChoose}
        onClose={() => setChooser(false)}
      />

      <div className="relative w-full py-6">
        {/* App Bar */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Rewards</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Points and Seeds, in one place
            </p>
          </div>

          {isConnected && shortAddress ? (
            <div className="flex items-center gap-2">
              {/* Wallet Info */}
              <button
                className="flex items-center gap-1.5 h-9 px-3 border border-border rounded-full bg-card hover:bg-accent transition-colors"
                onClick={() =>
                  (walletType === "evm" || walletType === "solana") &&
                  openAppKit({ view: "Account" })
                }
              >
                {walletType === "stellar" ? (
                  <Stellar width={16} height={16} />
                ) : walletType === "solana" ? (
                  <Solana width={16} height={16} />
                ) : (
                  <Ethereum width={16} height={16} />
                )}
                <span className="font-mono text-xs font-medium text-foreground">
                  {shortAddress}
                </span>
              </button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-full"
                onClick={handleDisconnect}
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              onClick={handleConnectClick}
            >
              Connect wallet
            </Button>
          )}
        </div>

        <div className="flex-1 px-4 space-y-3">
          {isConnected ? (
            <>
              {/* Points Hero */}
              <Card className="bg-primary text-primary-foreground border-0 rounded-3xl">
                <CardContent className="p-5 py-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-widest text-primary-foreground/55 uppercase">
                        Total points
                      </p>
                      <div className="flex items-baseline gap-2 mt-2.5">
                        {pointsLoading || points === null ? (
                          <div className="h-12 w-32 rounded-lg bg-primary-foreground/15 animate-pulse" />
                        ) : (
                          <>
                            <span className="text-5xl font-bold tracking-tight tabular-nums leading-none">
                              {fmtPoints(points)}
                            </span>
                            <span className="text-sm font-medium text-primary-foreground/60">
                              pts
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-primary-foreground/10 text-primary-foreground border-0 gap-1.5 hover:bg-primary-foreground/15">
                      <TrendingUp className="size-3" />
                      Member
                    </Badge>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-primary-foreground/60">
                        Spend this year
                      </span>
                      <span className="text-xs font-semibold text-primary-foreground">
                        Silver at $500
                      </span>
                    </div>
                    <Progress
                      value={SPEND_PCT}
                      className="h-1.5 bg-primary-foreground/15 [&>div]:bg-primary-foreground"
                    />
                    <p className="text-xs text-primary-foreground/60 mt-2">
                      Spend{" "}
                      <span className="text-primary-foreground font-semibold">
                        ${fmt(REMAIN, 0)}
                      </span>{" "}
                      more this year to reach Silver
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Seeds Card — only when Stellar connected */}
              {walletType === "stellar" && (
                <Card className="rounded-3xl">
                  <CardContent className="p-5 py-0">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Seeds
                        </p>
                        {stellarRewardsLoading || stellarRewards === null ? (
                          <div className="h-10 w-28 rounded-lg bg-muted animate-pulse mt-1" />
                        ) : (
                          <p className="text-4xl font-bold tracking-tight tabular-nums leading-tight">
                            {fmt(stellarRewards.seeds, 2)}
                          </p>
                        )}
                      </div>
                    </div>
                    {stellarRewards && (
                      <>
                        <p className="text-sm leading-relaxed text-muted-foreground mt-4">
                          Rewards for bridging and depositing USDC, used in
                          campaigns and future rewards. Separate from Points —
                          they never convert into tier.
                        </p>
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Volume
                          </span>
                          <Badge
                            variant="outline"
                            className="rounded-full text-xs font-semibold"
                          >
                            USDC ${fmt(stellarRewards.totalVolumeUsdc, 2)}
                          </Badge>
                          {stellarRewards.totalVolumeEurc > 0 && (
                            <Badge
                              variant="outline"
                              className="rounded-full text-xs font-semibold"
                            >
                              EURC ${fmt(stellarRewards.totalVolumeEurc, 2)}
                            </Badge>
                          )}
                        </div>
                        <Separator className="mt-4" />
                        <div className="mt-4">
                          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                            Earn by
                          </p>
                          <div className="flex gap-2">
                            {["Bridge", "Deposit", "Hold"].map((label) => (
                              <Badge
                                key={label}
                                variant="secondary"
                                className="rounded-lg font-medium"
                              >
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Current Tier Benefits */}
              <Card>
                <CardContent className="p-5 py-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold tracking-tight">
                      Current tier benefits
                    </h2>
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold tracking-wide uppercase"
                    >
                      Member
                    </Badge>
                  </div>
                  <ul className="space-y-2.5">
                    {MEMBER_BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2.5">
                        <CheckCircle className="size-4 shrink-0 mt-0.5 text-foreground" />
                        <span className="text-sm leading-snug text-foreground">
                          {b}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Teaser Hero */
            <Card className="bg-primary text-primary-foreground border-0 rounded-3xl">
              <CardContent className="p-6 py-0">
                <p className="text-xs font-semibold tracking-widest text-primary-foreground/50 uppercase">
                  ROZO Rewards
                </p>
                <h2 className="text-2xl font-bold tracking-tight leading-snug mt-2.5">
                  Earn as you spend,
                  <br />
                  and as you bridge.
                </h2>

                <div className="mt-5 bg-primary-foreground/[0.08] rounded-2xl overflow-hidden divide-y divide-primary-foreground/[0.08]">
                  <div className="flex gap-3 p-4">
                    <div className="size-9 shrink-0 rounded-xl bg-primary-foreground/[0.12] flex items-center justify-center">
                      <TrendingUp className="size-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Points</p>
                      <p className="text-xs leading-relaxed text-primary-foreground/65 mt-0.5">
                        Earned when you spend, check in, or invite. They set
                        your membership tier.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-4">
                    <div className="size-9 shrink-0 rounded-xl bg-primary-foreground/[0.12] flex items-center justify-center">
                      <Sprout className="size-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Seeds</p>
                      <p className="text-xs leading-relaxed text-primary-foreground/65 mt-0.5">
                        Earned when you bridge or deposit USDC on Stellar. They
                        power campaigns.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mt-4 bg-background text-foreground hover:bg-background/90 rounded-xl h-12 text-sm font-semibold gap-2"
                  onClick={handleConnectClick}
                >
                  <Wallet className="size-4" />
                  Connect wallet to start
                </Button>
                <p className="text-xs text-primary-foreground/45 text-center mt-3">
                  Browse tiers below — no wallet needed
                </p>
              </CardContent>
            </Card>
          )}

          {/* Membership Tiers — always shown */}
          <div className="mt-4">
            <h2 className="text-base font-bold tracking-tight mb-3 px-1">
              Membership tiers
            </h2>
            <Card className="p-0 gap-0 overflow-hidden">
              <Accordion type="single" collapsible>
                {TIERS.map((tier) => (
                  <AccordionItem
                    key={tier.key}
                    value={tier.key}
                    className="border-b last:border-b-0 px-4"
                  >
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground shrink-0">
                          {tier.icon}
                        </div>
                        <span className="text-sm font-semibold">
                          {tier.label}
                        </span>
                        {isConnected && tier.key === "member" && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold tracking-wide uppercase"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                          Requirements
                        </p>
                        <ul className="space-y-1 mb-4">
                          {tier.requirements.map((r) => (
                            <li
                              key={r}
                              className="flex gap-2 items-start text-sm text-muted-foreground"
                            >
                              <span className="mt-2 size-1 rounded-full bg-muted-foreground/50 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                          Benefits
                        </p>
                        <ul className="space-y-2">
                          {tier.benefits.map((b) => (
                            <li
                              key={b}
                              className="flex gap-2 items-start text-sm text-foreground"
                            >
                              <CheckCircle className="size-4 shrink-0 mt-0.5" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
            <p className="text-xs text-muted-foreground text-center mt-3 px-2 leading-relaxed">
              Tiers are set by spend. Gold, Platinum and Diamond thresholds are
              placeholders.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
