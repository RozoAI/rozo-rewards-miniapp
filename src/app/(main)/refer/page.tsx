"use client";

import { Ethereum, Solana, Stellar } from "@/components/chain-logo";
import {
  fetchStellarRewards,
  kit,
  StellarRewards,
  WalletType,
} from "@/components/rewards/lib";
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
import { capture, identifyUser } from "@/lib/analytics";
import { WALLET_EVENTS } from "@/lib/analytics/events";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function detectAddressType(addr: string): WalletType | null {
  if (isValidStellarAddress(addr)) return "stellar";
  if (isValidEvmAddress(addr)) return "evm";
  if (isValidSolanaAddress(addr)) return "solana";
  return null;
}

const DISCORD_URL = "https://discord.com/invite/EfWejgTbuU";

/**
 * Points earned before 2026 lived in a separate rewards backend that is being
 * retired: it had stopped recording new points months before this page stopped
 * reading it, so every balance it returned was zero. Seeds, above, are the live
 * figure. This note is here so that anyone who remembers a non-zero balance has
 * somewhere to say so rather than assuming the number is simply wrong.
 */
function RewardsHelpNote() {
  return (
    <p className="px-1 pt-1 text-xs leading-relaxed text-muted-foreground">
      Earlier points balances are no longer shown here. If something looks
      wrong, tell us on{" "}
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-2"
      >
        Discord
      </a>{" "}
      and we will sort it out.
    </p>
  );
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

  // Identify user and emit wallet_connected on first connection
  const prevAddress = useRef<string | null>(null);
  useEffect(() => {
    if (isConnected && displayAddress && !hasQueryAddress && displayAddress !== prevAddress.current) {
      identifyUser(displayAddress.toLowerCase());
      capture(WALLET_EVENTS.WALLET_CONNECTED, {
        chain: activeWalletType ?? "evm",
        wallet_address: displayAddress.toLowerCase(),
      });
      prevAddress.current = displayAddress;
    }
    if (!isConnected) prevAddress.current = null;
  }, [isConnected, displayAddress, activeWalletType, hasQueryAddress]);

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
      disconnecting.current = false;
    }
  }, [evmConnected, walletType]);

  useEffect(() => {
    if (walletType === "solana" && !solanaConnected) {
      setWalletType(null);
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
              {activeWalletType === "stellar" && (
                <SeedsCard
                  stellarRewards={stellarRewards}
                  stellarRewardsLoading={stellarRewardsLoading}
                />
              )}
              <RewardsHelpNote />
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
