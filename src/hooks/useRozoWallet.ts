import { isRozoProviderError, isUserCancellation } from "@/lib/rozo-errors";
import { useEffect, useRef, useState } from "react";

// Cached after first import — subsequent transferUSDC calls skip the dynamic import cost
let stellarSdkPromise: Promise<[
  typeof import("@stellar/stellar-sdk"),
  typeof import("@stellar/stellar-sdk/rpc"),
]> | null = null;

function getStellarSdk() {
  if (!stellarSdkPromise) {
    stellarSdkPromise = Promise.all([
      import("@stellar/stellar-sdk"),
      import("@stellar/stellar-sdk/rpc"),
    ]);
  }
  return stellarSdkPromise;
}

function toStroops(amount: string): bigint {
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(7, "0").slice(0, 7);
  return BigInt(whole + paddedDecimal);
}

function fromStroops(stroops: string): string {
  const amount = BigInt(stroops);
  const whole = amount / BigInt(10_000_000);
  const decimal = amount % BigInt(10_000_000);
  const decimalStr = decimal.toString().padStart(7, "0");
  return `${whole}.${decimalStr}`.replace(/\.?0+$/, "");
}

type FiatCurrencyCode = "USD";

function formatCurrencyFloored(
  amount: number,
  currency: FiatCurrencyCode,
): string {
  const factor = 1e4;
  const floored = Math.floor(amount * factor) / factor;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(floored);
}

function balanceFromStroops(balanceStroops: string): {
  formatted: string;
  usdAmount: number;
} | null {
  const usdAmount = Number.parseFloat(fromStroops(balanceStroops));
  if (!Number.isFinite(usdAmount)) return null;
  return {
    usdAmount,
    formatted: formatCurrencyFloored(usdAmount, "USD"),
  };
}

/** Extract usdc stroops from getBalance response, falling back to legacy `balance` field. */
function extractUsdcStroops(
  res: { usdc: string; eurc: string; balance?: string } | { balance: string },
): string {
  if ("usdc" in res && res.usdc) return res.usdc;
  if ("balance" in res && res.balance) return res.balance;
  return "0";
}

interface TransferResult {
  hash: string;
  status: string;
  signedAuthEntry: string;
}

export function useRozoWallet() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null);
  const [activeCurrency, setActiveCurrency] = useState<"USDC" | "EURC" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  // Cached network details — network doesn't change mid-session
  const networkDetailsRef = useRef<{
    sorobanRpcUrl: string;
    networkPassphrase: string;
    network: "PUBLIC" | "TESTNET";
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    function applyState(detail: {
      isConnected?: boolean;
      address?: string | null;
      usdc?: string | null;
      eurc?: string | null;
      balance?: string | null;
    }): boolean {
      if (typeof detail.isConnected !== "boolean") return false;
      setIsConnected(detail.isConnected);
      if (detail.address) setWalletAddress(detail.address);
      const stroops = detail.usdc ?? detail.balance;
      if (stroops) {
        const parsed = balanceFromStroops(stroops);
        if (parsed) {
          setBalance(parsed.formatted);
          setBalanceUsd(parsed.usdAmount);
        }
      }
      // Prefetch SDK + network details once on first connect
      if (detail.isConnected && window.rozo && !networkDetailsRef.current) {
        getStellarSdk();
        window.rozo.getNetworkDetails().then((d) => {
          networkDetailsRef.current = d;
        }).catch(() => {});
      }
      return true;
    }

    async function fallbackBridgeCalls() {
      if (!window.rozo || cancelled) return;
      try {
        const { isConnected: connected } = await window.rozo.isConnected();
        if (cancelled) return;
        setIsConnected(connected);
        if (connected) {
          const [{ address }, balRes, { currency }] = await Promise.all([
            window.rozo.getAddress(),
            window.rozo.getBalance(),
            window.rozo.getActiveCurrency(),
          ]);
          if (cancelled) return;
          setWalletAddress(address);
          setActiveCurrency(currency);
          const stroops = extractUsdcStroops(balRes);
          const parsed = balanceFromStroops(stroops);
          if (parsed) {
            setBalance(parsed.formatted);
            setBalanceUsd(parsed.usdAmount);
          }
          // Prefetch SDK + network details in background so transferUSDC is instant
          getStellarSdk();
          window.rozo.getNetworkDetails().then((d) => {
            networkDetailsRef.current = d;
          }).catch(() => {});
        }
      } catch (error) {
        console.error("Failed to check Rozo Wallet:", error);
        setIsAvailable(false);
      }
    }

    async function init() {
      if (typeof window === "undefined") return;

      if (!window.rozo) {
        // Wait for rozo:ready — detail includes pre-fetched wallet state
        const detail = await new Promise<Parameters<typeof applyState>[0] | null>(
          (resolve) => {
            const t = setTimeout(() => resolve(null), 3000);
            window.addEventListener(
              "rozo:ready",
              (e) => {
                clearTimeout(t);
                resolve(e.detail);
              },
              { once: true },
            );
          },
        );

        if (cancelled) return;
        if (!window.rozo) {
          setIsAvailable(false);
          setIsChecking(false);
          return;
        }

        setIsAvailable(true);
        setIsLoading(true);
        // Use pushed state if available — zero bridge round-trips
        if (!detail || !applyState(detail)) {
          await fallbackBridgeCalls();
        }
        if (!cancelled) {
          setIsLoading(false);
          setIsChecking(false);
        }
        return;
      }

      // Provider already injected (page reload / already in WebView)
      setIsAvailable(true);
      setIsLoading(true);

      // rozo:state fires shortly after load with fresh state from native
      const stateReceived = await new Promise<boolean>((resolve) => {
        const t = setTimeout(() => resolve(false), 500);
        window.addEventListener(
          "rozo:state",
          (e) => {
            clearTimeout(t);
            resolve(applyState(e.detail));
          },
          { once: true },
        );
      });

      if (!cancelled) {
        if (!stateReceived) {
          await fallbackBridgeCalls();
        }
        setIsLoading(false);
        setIsChecking(false);
      }
    }

    // Subscribe to ongoing rozo:state pushes for live balance/connection updates
    function onRozoState(e: CustomEvent<Parameters<typeof applyState>[0]>) {
      if (!cancelled) applyState(e.detail);
    }
    window.addEventListener("rozo:state", onRozoState as EventListener);

    init().catch((err) => {
      console.error("useRozoWallet init failed:", err);
      if (!cancelled) {
        setIsAvailable(false);
        setIsChecking(false);
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("rozo:state", onRozoState as EventListener);
    };
  }, []);

  const refreshData = async () => {
    if (!window.rozo || !isConnected) return;
    try {
      const [balRes, { currency }] = await Promise.all([
        window.rozo.getBalance(),
        window.rozo.getActiveCurrency(),
      ]);
      setActiveCurrency(currency);
      const stroops = extractUsdcStroops(balRes);
      const parsed = balanceFromStroops(stroops);
      if (parsed) {
        setBalance(parsed.formatted);
        setBalanceUsd(parsed.usdAmount);
      } else {
        setBalance(null);
        setBalanceUsd(null);
      }
    } catch (error) {
      console.error("Failed to refresh Rozo Wallet data:", error);
    }
  };

  // Lightweight post-payment balance refresh — currency won't change mid-payment
  const refreshBalance = async () => {
    if (!window.rozo || !isConnected) return;
    try {
      const balRes = await window.rozo.getBalance();
      const stroops = extractUsdcStroops(balRes);
      const parsed = balanceFromStroops(stroops);
      if (parsed) {
        setBalance(parsed.formatted);
        setBalanceUsd(parsed.usdAmount);
      }
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  const transferUSDC = async (
    amount: string,
    receiverAddressContract?: string,
    receiverMemoContract?: string,
    paymentId?: string,
  ): Promise<TransferResult> => {
    if (!window.rozo) throw new Error("Rozo Wallet not available");
    if (!receiverAddressContract || !receiverMemoContract) {
      throw new Error("Receiver address and memo contract are required");
    }
    if (!isConnected) throw new Error("Rozo Wallet not connected");

    setIsLoading(true);

    try {
      // SDK cached at module level; network details cached in ref — both usually pre-warmed
      const [[{ Account, Address, Contract, nativeToScVal, TransactionBuilder }, { Server }], networkDetails] =
        await Promise.all([
          getStellarSdk(),
          networkDetailsRef.current
            ? Promise.resolve(networkDetailsRef.current)
            : window.rozo.getNetworkDetails().then((d) => { networkDetailsRef.current = d; return d; }),
        ]);

      const fromAddress = walletAddress ?? (await window.rozo.getAddress()).address;
      const { sorobanRpcUrl, networkPassphrase } = networkDetails;

      const server = new Server(sorobanRpcUrl);
      const payContract = new Contract(receiverAddressContract);
      const amountStroops = toStroops(amount);

      const hostFunction = payContract.call(
        "pay",
        new Address(fromAddress).toScVal(),
        nativeToScVal(amountStroops, { type: "i128" }),
        nativeToScVal(receiverMemoContract, { type: "string" }),
      );

      const dummySource = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0",
      );

      const tx = new TransactionBuilder(dummySource, {
        fee: "100",
        networkPassphrase,
      })
        .addOperation(hostFunction)
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);

      if ("error" in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const authEntries = simulation.result?.auth || [];
      if (authEntries.length === 0) {
        throw new Error("No auth entries found");
      }

      const authEntryXdr =
        typeof authEntries[0] === "string"
          ? authEntries[0]
          : authEntries[0].toXDR("base64");

      const txXdr = tx.toEnvelope().v1().tx();
      const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
      const funcXdr = opXdr.hostFunction().toXDR("base64");

      const result = await window.rozo.signAuthEntry(authEntryXdr, {
        func: funcXdr,
        submit: true,
        message: `Pay ${amount} USDC`,
        ...(paymentId && { paymentId }),
        ...(fromAddress && { fromAddress }),
      });

      if (!result.hash) {
        if (result.error) {
          throw new Error(`Payment failed: ${result.error}`);
        } else {
          throw new Error("Transaction submission failed. Please try again.");
        }
      }

      refreshBalance().catch(() => {});

      return result;
    } catch (error: unknown) {
      console.error("Transfer error:", error);
      if (isUserCancellation(error) || isRozoProviderError(error)) throw error;
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAvailable,
    isConnected,
    isChecking,
    walletAddress,
    balance,
    balanceUsd,
    activeCurrency,
    isLoading,
    transferUSDC,
    refreshData,
    refreshBalance,
  };
}
