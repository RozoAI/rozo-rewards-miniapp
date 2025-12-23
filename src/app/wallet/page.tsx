"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { AlertCircle, CheckCircle2, Copy, Send, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// USDC Contract addresses
const USDC_CONTRACTS = {
  TESTNET: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  PUBLIC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
};

export default function WalletPage() {
  const {
    address,
    isConnected,
    isLoading,
    isAvailable,
    signTransaction,
    signAuthEntry,
    signMessage,
    getNetworkDetails,
    provider,
  } = useRozoWallet();

  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  const handleSignMessage = async () => {
    if (!isAvailable || !isConnected) {
      toast.error("Wallet not available or not connected");
      return;
    }

    try {
      setSigning(true);
      const message = `Test message from Rozo Wallet - ${Date.now()}`;
      const result = await signMessage(message);
      toast.success("Message signed successfully");
      console.log("Signed message:", result);
    } catch (error: any) {
      toast.error(error.message || "Failed to sign message");
      console.error("Sign message error:", error);
    } finally {
      setSigning(false);
    }
  };

  const handleSignTransaction = async () => {
    if (!isAvailable || !isConnected) {
      toast.error("Wallet not available or not connected");
      return;
    }

    try {
      setSigning(true);
      // Example XDR - in production, this would come from your transaction builder
      const exampleXdr = "YOUR_XDR"; // Placeholder
      const result = await signTransaction(exampleXdr);
      toast.success("Transaction signed successfully");
      console.log("Signed transaction:", result);
    } catch (error: any) {
      toast.error(error.message || "Failed to sign transaction");
      console.error("Sign transaction error:", error);
    } finally {
      setSigning(false);
    }
  };

  const handleTransferUSDC = async () => {
    if (!isAvailable || !isConnected || !provider) {
      toast.error("Wallet not available or not connected");
      return;
    }

    try {
      setTransferring(true);

      // Test recipient address and amount
      const recipientAddress =
        "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3UBSIB3GN5QA";
      const amount = "0.10";

      // 1. Check wallet connection
      const { isConnected: connected } = await provider.isConnected();
      if (!connected) {
        throw new Error("Wallet not connected");
      }

      // 2. Get wallet address and network details
      const { address: walletAddress } = await provider.getAddress();
      const networkDetails = await getNetworkDetails();

      console.log("Wallet:", walletAddress);
      console.log("Network:", networkDetails.network);

      // 3. Setup RPC and contract
      const server = new Server(networkDetails.sorobanRpcUrl);
      const usdcContractId =
        networkDetails.network === "PUBLIC"
          ? USDC_CONTRACTS.PUBLIC
          : USDC_CONTRACTS.TESTNET;
      const usdcContract = new Contract(usdcContractId);

      // 4. Convert amount to stroops (7 decimal places)
      const amountInStroops = BigInt(
        Math.floor(parseFloat(amount) * 10_000_000)
      );

      // 5. Build the transfer operation
      const fromAddress = new Address(walletAddress);
      const toAddress = new Address(recipientAddress);

      const hostFunction = usdcContract.call(
        "transfer",
        fromAddress.toScVal(),
        toAddress.toScVal(),
        nativeToScVal(amountInStroops, { type: "i128" })
      );

      // 6. Create dummy source for simulation (Launchtube will set the real source)
      const dummySource = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      );

      const tx = new TransactionBuilder(dummySource, {
        fee: "100",
        networkPassphrase: networkDetails.networkPassphrase,
      })
        .addOperation(hostFunction)
        .setTimeout(30)
        .build();

      // 7. Simulate to get auth entries
      console.log("Simulating transaction...");
      toast.loading("Simulating transaction...");
      const simulation = await server.simulateTransaction(tx);

      if ("error" in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      // 8. Extract auth entries and host function XDR
      const authEntries = simulation.result?.auth || [];
      if (authEntries.length === 0) {
        throw new Error("No auth entries found");
      }

      const txXdr = tx.toEnvelope().v1().tx();
      const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
      const funcXdr = opXdr.hostFunction().toXDR("base64");

      console.log("Auth entries to sign:", authEntries.length);

      // 9. Sign and submit via Launchtube (wallet handles fee sponsorship!)
      const authEntryXdr =
        typeof authEntries[0] === "string"
          ? authEntries[0]
          : authEntries[0].toXDR("base64");

      toast.loading("Signing and submitting transaction...");
      const result = await signAuthEntry(authEntryXdr, {
        func: funcXdr, // Host function for Launchtube
        submit: true, // Submit via Launchtube (gasless!)
      });

      console.log("Transaction submitted:", result.hash);
      console.log("Status:", result.status);

      toast.success(
        `USDC transfer submitted! Hash: ${result.hash?.slice(0, 8)}...`
      );
      return {
        hash: result.hash,
        status: result.status,
        signedAuthEntry: result.signedAuthEntry,
      };
    } catch (error: any) {
      toast.error(error.message || "Failed to transfer USDC");
      console.error("Transfer USDC error:", error);
      throw error;
    } finally {
      setTransferring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-4 mt-4">
        <PageHeader title="Rozo Wallet" icon={<Wallet className="size-6" />} />
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading wallet...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="w-full flex flex-col gap-4 mt-4">
        <PageHeader title="Rozo Wallet" icon={<Wallet className="size-6" />} />
        <div className="px-4 sm:px-0">
          <div className="rounded-md border bg-card p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-foreground">
                  Rozo Wallet Not Available
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please open this page in the Rozo app to access wallet
                  features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="w-full flex flex-col gap-4 mt-4">
        <PageHeader title="Rozo Wallet" icon={<Wallet className="size-6" />} />
        <div className="px-4 sm:px-0">
          <div className="rounded-md border bg-card p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-foreground">
                  Wallet Not Connected
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please connect your wallet in the Rozo app.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 mt-4">
      <PageHeader title="Rozo Wallet" icon={<Wallet className="size-6" />} />

      <div className="px-4 sm:px-0 space-y-4">
        {/* Connection Status */}
        <div className="rounded-md border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-5 text-green-600" />
            <h3 className="font-semibold text-foreground">Connected</h3>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-muted px-2 py-1.5 rounded break-all">
                  {address}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyAddress}
                  className="shrink-0 h-8 w-8"
                >
                  {copied ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-md border bg-card p-4">
          <h3 className="font-semibold text-foreground mb-4">Actions</h3>
          <div className="space-y-2">
            <Button
              onClick={handleSignMessage}
              disabled={signing || transferring}
              className="w-full"
              variant="outline"
            >
              {signing ? "Signing..." : "Sign Message"}
            </Button>
            <Button
              onClick={handleSignTransaction}
              disabled={signing || transferring}
              className="w-full"
              variant="outline"
            >
              {signing ? "Signing..." : "Sign Transaction"}
            </Button>
            <Button
              onClick={handleTransferUSDC}
              disabled={signing || transferring}
              className="w-full"
              variant="default"
            >
              {transferring ? (
                "Transferring..."
              ) : (
                <>
                  <Send className="size-4 mr-2" />
                  Transfer USDC (Test)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
