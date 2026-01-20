import { useEffect, useState } from "react";

/**
 * Convert USDC amount to Stellar stroops (7 decimals)
 * Example: "10.50" -> 105000000n
 */
function toStroops(amount: string): bigint {
  const [whole, decimal = ""] = amount.split(".");
  const paddedDecimal = decimal.padEnd(7, "0").slice(0, 7);
  return BigInt(whole + paddedDecimal);
}

/**
 * Convert Stellar stroops to USDC display format
 * Example: "105000000" -> "10.50"
 */
function fromStroops(stroops: string): string {
  const amount = BigInt(stroops);
  const whole = amount / BigInt(10_000_000);
  const decimal = amount % BigInt(10_000_000);
  const decimalStr = decimal.toString().padStart(7, "0");
  return `${whole}.${decimalStr}`.replace(/\.?0+$/, "");
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
  const [isLoading, setIsLoading] = useState(false);

  // Check if window.rozo is available and connected
  useEffect(() => {
    async function checkRozoWallet() {
      // Wait for window.rozo to be injected
      if (typeof window === "undefined") return;

      if (!window.rozo) {
        // Wait for rozo:ready event
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          window.addEventListener(
            "rozo:ready",
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true }
          );
        });
      }

      if (!window.rozo) {
        setIsAvailable(false);
        return;
      }

      setIsAvailable(true);

      try {
        // Check connection
        const { isConnected: connected } = await window.rozo.isConnected();
        setIsConnected(connected);

        if (connected) {
          // Get wallet info
          const { address } = await window.rozo.getAddress();
          setWalletAddress(address);

          // Get balance
          const { balance: balanceStroops } = await window.rozo.getBalance();
          setBalance(fromStroops(balanceStroops));
        }
      } catch (error) {
        console.error("Failed to check Rozo Wallet:", error);
        setIsAvailable(false);
      }
    }

    checkRozoWallet();
  }, []);

  /**
   * Refresh wallet data (address and balance)
   */
  const refreshData = async () => {
    if (!window.rozo || !isConnected) return;

    try {
      const { address } = await window.rozo.getAddress();
      setWalletAddress(address);

      const { balance: balanceStroops } = await window.rozo.getBalance();
      setBalance(fromStroops(balanceStroops));
    } catch (error) {
      console.error("Failed to refresh Rozo Wallet data:", error);
    }
  };

  /**
   * Transfer USDC using Rozo Wallet
   * @param amount - Amount in USD (e.g., "10.50")
   * @returns Transaction result with hash
   */
  const transferUSDC = async (
    amount: string,
    toAddress: string,
    memo: string
  ): Promise<TransferResult> => {
    if (!window.rozo) {
      throw new Error("Rozo Wallet not available");
    }

    if (!isConnected) {
      throw new Error("Rozo Wallet not connected");
    }

    setIsLoading(true);

    try {
      // Dynamically import Stellar SDK (to avoid SSR issues)
      const [
        { Account, Address, Contract, nativeToScVal, TransactionBuilder },
        { Server },
      ] = await Promise.all([
        import("@stellar/stellar-sdk"),
        import("@stellar/stellar-sdk/rpc"),
      ]);

      // Get wallet and network info
      const { address: fromAddress } = await window.rozo.getAddress();
      const { sorobanRpcUrl, networkPassphrase } =
        await window.rozo.getNetworkDetails();

      // Setup RPC and contract
      const server = new Server(sorobanRpcUrl);
      // Contract ID for pay function
      const payContractId = "CCRLTS3CMJHYHFD7MYRBJPNW6R3LCXNDO2B6TK6AS6FSXAHR6GBMGLRE";
      const payContract = new Contract(payContractId);

      // Convert amount to stroops (7 decimals)
      const amountStroops = toStroops(amount);

      // Build pay function call: pay(env, from: Address, amount: i128, memo: String)
      const hostFunction = payContract.call(
        "pay",
        new Address(fromAddress).toScVal(),
        nativeToScVal(amountStroops, { type: "i128" }),
        nativeToScVal(memo, { type: "string" })
      );

      // Create dummy source for simulation (Relayer will set the real source)
      const dummySource = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      );

      // Build transaction
      const tx = new TransactionBuilder(dummySource, {
        fee: "100",
        networkPassphrase,
      })
        .addOperation(hostFunction)
        .setTimeout(30)
        .build();

      // Simulate transaction to get auth entries
      console.log("Simulating transaction...");
      const simulation = await server.simulateTransaction(tx);

      if ("error" in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // Extract auth entries
      const authEntries = simulation.result?.auth || [];
      if (authEntries.length === 0) {
        throw new Error("No auth entries found");
      }

      const authEntryXdr =
        typeof authEntries[0] === "string"
          ? authEntries[0]
          : authEntries[0].toXDR("base64");

      // Extract host function XDR
      const txXdr = tx.toEnvelope().v1().tx();
      const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
      const funcXdr = opXdr.hostFunction().toXDR("base64");

      console.log("Auth entries:", authEntries.length);
      console.log("Calling window.rozo.signAuthEntry...");

      // Sign and submit via window.rozo (gasless!)
      const result = await window.rozo.signAuthEntry(authEntryXdr, {
        func: funcXdr,
        submit: true, // Submit via OpenZeppelin Relayer (gasless!)
        message: `Pay ${amount} USDC`,
      });

      if (!result.hash) {
        throw new Error("Transaction submission failed");
      }

      console.log("Success!");
      console.log("Hash:", result.hash);
      console.log("Status:", result.status);

      // Refresh balance after successful payment
      await refreshData();

      return result;
    } catch (error: any) {
      console.error("Transfer error:", error);

      // Re-throw with user-friendly message
      if (error.message.includes("User rejected")) {
        throw new Error("User rejected");
      } else if (error.message.includes("Insufficient balance")) {
        throw new Error("Insufficient balance");
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAvailable,
    isConnected,
    walletAddress,
    balance,
    isLoading,
    transferUSDC,
    refreshData,
  };
}
