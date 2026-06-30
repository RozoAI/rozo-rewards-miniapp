"use client";

import { Ethereum, Solana, Stellar } from "@/components/chain-logo";
import {
  fetchPoints,
  fetchStellarRewards,
  kit,
  StellarRewards,
  WalletType,
} from "@/components/rewards/lib";
import { PointsCard } from "@/components/rewards/points-card";
import { SeedsCard } from "@/components/rewards/seeds-card";
import { TeaserCard } from "@/components/rewards/teaser-card";
import { WalletChooser } from "@/components/rewards/wallet-chooser";
import { Button } from "@/components/ui/button";
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
} from "@reown/appkit/react";
import {
  isValidEvmAddress,
  isValidSolanaAddress,
  isValidStellarAddress,
} from "@rozoai/intent-common";
import { LogOut } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function detectAddressType(addr: string): WalletType | null {
  if (isValidStellarAddress(addr)) return "stellar";
  if (isValidEvmAddress(addr)) return "evm";
  if (isValidSolanaAddress(addr)) return "solana";
  return null;
}

export default function RewardsPage() {
  const searchParams = useSearchParams();
  const queryAddress = searchParams.get("address") ?? "";
  const queryAddressType = queryAddress
    ? detectAddressType(queryAddress)
    : null;
  const hasQueryAddress = !!queryAddressType;

  const { open: openAppKit } = useAppKit();
  const { address: evmAddress, isConnected: evmConnected } = useAppKitAccount();
  const { address: solanaAddress, isConnected: solanaConnected } =
    useAppKitAccount({ namespace: "solana" });
  const { disconnect: disconnectAppKit } = useDisconnect();

  const [stellarAddress, setStellarAddress] = useState<string | null>(null);
  const [chooser, setChooser] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [stellarRewards, setStellarRewards] = useState<StellarRewards | null>(
    null,
  );
  const [stellarRewardsLoading, setStellarRewardsLoading] = useState(false);
  const disconnecting = useRef(false);

  // Auto-detect wallet type from AppKit connection state
  useEffect(() => {
    if (walletType === null && !disconnecting.current) {
      if (evmConnected) setWalletType("evm");
      else if (solanaConnected) setWalletType("solana");
    }
  }, [evmConnected, solanaConnected, walletType]);

  const isConnected =
    hasQueryAddress ||
    (walletType === "evm" && evmConnected) ||
    (walletType === "solana" && solanaConnected) ||
    (walletType === "stellar" && !!stellarAddress);

  const activeWalletType = hasQueryAddress ? queryAddressType : walletType;

  const displayAddress = hasQueryAddress
    ? queryAddress
    : walletType === "evm"
      ? (evmAddress ?? null)
      : walletType === "solana"
        ? (solanaAddress ?? null)
        : stellarAddress;

  const shortAddress = displayAddress
    ? activeWalletType === "evm"
      ? `${displayAddress.slice(0, 6)}…${displayAddress.slice(-4)}`
      : `${displayAddress.slice(0, 4)}…${displayAddress.slice(-4)}`
    : null;

  useEffect(() => {
    if (!isConnected || !displayAddress || !activeWalletType) {
      setPoints(null);
      return;
    }
    setPointsLoading(true);
    fetchPoints(activeWalletType, displayAddress)
      .then(setPoints)
      .finally(() => setPointsLoading(false));
  }, [isConnected, displayAddress, activeWalletType]);

  useEffect(() => {
    const addr =
      hasQueryAddress && queryAddressType === "stellar"
        ? queryAddress
        : walletType === "stellar"
          ? stellarAddress
          : null;
    if (!addr) {
      setStellarRewards(null);
      return;
    }
    setStellarRewardsLoading(true);
    fetchStellarRewards(addr)
      .then(setStellarRewards)
      .finally(() => setStellarRewardsLoading(false));
  }, [
    walletType,
    stellarAddress,
    hasQueryAddress,
    queryAddressType,
    queryAddress,
  ]);

  useEffect(() => {
    if (walletType === "evm" && !evmConnected) {
      setWalletType(null);
      setPoints(null);
      disconnecting.current = false;
    }
  }, [evmConnected, walletType]);

  useEffect(() => {
    if (walletType === "solana" && !solanaConnected) {
      setWalletType(null);
      setPoints(null);
      disconnecting.current = false;
    }
  }, [solanaConnected, walletType]);

  async function handleChoose(type: WalletType) {
    setChooser(false);
    setWalletType(type);
    if (type === "evm") openAppKit({ view: "Connect", namespace: "eip155" });
    else if (type === "solana")
      openAppKit({ view: "Connect", namespace: "solana" });
    else if (kit) {
      const swk = kit;
      await swk.openModal({
        onWalletSelected: async (option: { id: string }) => {
          swk.setWallet(option.id);
          const { address } = await swk.getAddress();
          setStellarAddress(address);
        },
      });
    }
  }

  function handleDisconnect() {
    disconnecting.current = true;
    if (walletType === "evm" || walletType === "solana") {
      disconnectAppKit();
    } else {
      setStellarAddress(null);
      setWalletType(null);
      setPoints(null);
      setStellarRewards(null);
      disconnecting.current = false;
    }
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
          </div>

          {isConnected && shortAddress ? (
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 h-9 px-3 border border-border rounded-full bg-card hover:bg-accent transition-colors"
                onClick={() =>
                  !hasQueryAddress &&
                  (walletType === "evm" || walletType === "solana") &&
                  openAppKit({ view: "Account" })
                }
              >
                {activeWalletType === "stellar" ? (
                  <Stellar width={16} height={16} />
                ) : activeWalletType === "solana" ? (
                  <Solana width={16} height={16} />
                ) : (
                  <Ethereum width={16} height={16} />
                )}
                <span className="font-mono text-xs font-medium text-foreground">
                  {shortAddress}
                </span>
              </button>
              {!hasQueryAddress && (
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-full"
                  onClick={handleDisconnect}
                >
                  <LogOut className="size-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              className="rounded-full"
              onClick={() => setChooser(true)}
            >
              Connect wallet
            </Button>
          )}
        </div>

        <div className="flex-1 px-4 space-y-3">
          {isConnected ? (
            <>
              <PointsCard
                points={points}
                pointsLoading={pointsLoading}
                walletType={activeWalletType!}
                stellarRewards={stellarRewards}
                stellarRewardsLoading={stellarRewardsLoading}
              />
              {activeWalletType === "stellar" && (
                <SeedsCard
                  stellarRewards={stellarRewards}
                  stellarRewardsLoading={stellarRewardsLoading}
                />
              )}
              {/* <TierBenefitsCard /> */}
            </>
          ) : (
            <TeaserCard onConnect={() => setChooser(true)} />
          )}

          {/* <TiersAccordion isConnected={!!isConnected} /> */}
        </div>
      </div>
    </>
  );
}
