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
  const [transferStep, setTransferStep] = useState<string | null>(null);
  const [transferLogs, setTransferLogs] = useState<string[]>([]);

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

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setTransferLogs((prev) => [...prev, logMessage]);
  };

  const handleTransferUSDC = async () => {
    if (!isAvailable || !isConnected || !provider) {
      toast.error("Wallet not available or not connected");
      return;
    }

    try {
      setTransferring(true);
      setTransferStep(null);
      setTransferLogs([]);

      // Test recipient address and amount
      const recipientAddress =
        "GDATMUNQEPN4TPETV47LAKGJELK4DUHHDRPMGD3K5LOHUPXX2DI623KY";
      const amount = "0.10";

      addLog("🚀 Starting USDC transfer process");
      addLog(`📝 Recipient: ${recipientAddress}`);
      addLog(`💰 Amount: ${amount} USDC`);

      // Step 1: Check wallet connection
      setTransferStep("1. Checking wallet connection...");
      addLog("Step 1: Checking wallet connection");
      const { isConnected: connected } = await provider.isConnected();
      if (!connected) {
        throw new Error("Wallet not connected");
      }
      addLog("✅ Wallet is connected");

      // Step 2: Get wallet address and network details
      setTransferStep("2. Getting wallet address and network details...");
      addLog("Step 2: Getting wallet address and network details");
      const { address: walletAddress } = await provider.getAddress();
      const networkDetails = await getNetworkDetails();

      addLog(`📍 Wallet Address: ${walletAddress}`);
      addLog(`🌐 Network: ${networkDetails.network}`);
      addLog(`🔗 Network URL: ${networkDetails.networkUrl}`);
      addLog(`🔗 Soroban RPC URL: ${networkDetails.sorobanRpcUrl}`);
      addLog(`🔑 Network Passphrase: ${networkDetails.networkPassphrase}`);

      // Step 3: Setup RPC and contract
      setTransferStep("3. Setting up RPC server and USDC contract...");
      addLog("Step 3: Setting up RPC server and USDC contract");
      const server = new Server(networkDetails.sorobanRpcUrl);
      const usdcContractId =
        networkDetails.network === "PUBLIC"
          ? USDC_CONTRACTS.PUBLIC
          : USDC_CONTRACTS.TESTNET;
      const usdcContract = new Contract(usdcContractId);
      addLog(`📄 USDC Contract ID: ${usdcContractId}`);
      addLog(`📡 RPC Server initialized: ${networkDetails.sorobanRpcUrl}`);

      // Step 4: Convert amount to stroops
      setTransferStep("4. Converting amount to stroops...");
      addLog("Step 4: Converting amount to stroops (7 decimal places)");
      const amountInStroops = BigInt(
        Math.floor(parseFloat(amount) * 10_000_000)
      );
      addLog(`💵 Amount in stroops: ${amountInStroops.toString()}`);

      // Step 5: Build the transfer operation
      setTransferStep("5. Building transfer operation...");
      addLog("Step 5: Building transfer operation");
      const fromAddress = new Address(walletAddress);
      const toAddress = new Address(recipientAddress);
      addLog(`📤 From Address: ${fromAddress.toString()}`);
      addLog(`📥 To Address: ${toAddress.toString()}`);

      const hostFunction = usdcContract.call(
        "transfer",
        fromAddress.toScVal(),
        toAddress.toScVal(),
        nativeToScVal(amountInStroops, { type: "i128" })
      );
      addLog("✅ Host function created: transfer(from, to, amount)");

      // Step 6: Create transaction
      setTransferStep("6. Creating transaction...");
      addLog("Step 6: Creating transaction with dummy source account");
      const dummySource = new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      );
      addLog(`🔧 Dummy Source Account: ${dummySource.accountId()}`);

      const tx = new TransactionBuilder(dummySource, {
        fee: "100",
        networkPassphrase: networkDetails.networkPassphrase,
      })
        .addOperation(hostFunction)
        .setTimeout(30)
        .build();
      addLog("✅ Transaction built successfully");
      addLog(`⏱️  Timeout: 30 seconds`);

      // Step 7: Simulate transaction
      setTransferStep("7. Simulating transaction...");
      addLog("Step 7: Simulating transaction to get auth entries");
      toast.loading("Simulating transaction...");
      const simulation = await server.simulateTransaction(tx);
      addLog("📊 Simulation response received");

      if ("error" in simulation) {
        addLog(`❌ Simulation error: ${JSON.stringify(simulation.error)}`);
        throw new Error(`Simulation failed: ${simulation.error}`);
      }
      addLog("✅ Simulation successful");

      // Step 8: Extract auth entries and host function XDR
      setTransferStep("8. Extracting auth entries and function XDR...");
      addLog("Step 8: Extracting auth entries and host function XDR");
      const authEntries = simulation.result?.auth || [];
      if (authEntries.length === 0) {
        addLog("❌ No auth entries found in simulation result");
        throw new Error("No auth entries found");
      }
      addLog(`🔐 Found ${authEntries.length} auth entry/entries`);

      const txXdr = tx.toEnvelope().v1().tx();
      const opXdr = txXdr.operations()[0].body().invokeHostFunctionOp();
      const funcXdr = opXdr.hostFunction().toXDR("base64");
      addLog(`📦 Host function XDR extracted (length: ${funcXdr.length})`);

      // Step 9: Sign and submit
      setTransferStep("9. Signing auth entry and submitting via Launchtube...");
      addLog("Step 9: Signing auth entry and submitting via Launchtube");
      const authEntryXdr =
        typeof authEntries[0] === "string"
          ? authEntries[0]
          : authEntries[0].toXDR("base64");
      addLog(`✍️  Auth entry XDR prepared (length: ${authEntryXdr.length})`);
      addLog(`🚀 Submitting via Launchtube (gasless transaction)`);

      toast.loading("Signing and submitting transaction...");
      const result = await signAuthEntry(authEntryXdr, {
        func: funcXdr, // Host function for Launchtube
        submit: true, // Submit via Launchtube (gasless!)
      });

      addLog(`✅ Transaction signed successfully`);
      addLog(
        `📝 Signed Auth Entry: ${result.signedAuthEntry?.slice(0, 50)}...`
      );
      addLog(`🔗 Transaction Hash: ${result.hash || "Pending"}`);
      addLog(`📊 Status: ${result.status || "Unknown"}`);

      setTransferStep("✅ Transfer completed successfully!");
      toast.success(
        `USDC transfer submitted! Hash: ${result.hash?.slice(0, 8)}...`
      );
      addLog("🎉 USDC transfer process completed!");

      return {
        hash: result.hash,
        status: result.status,
        signedAuthEntry: result.signedAuthEntry,
      };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to transfer USDC";
      addLog(`❌ Error: ${errorMessage}`);
      setTransferStep(`❌ Error: ${errorMessage}`);
      toast.error(errorMessage);
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

        {/* Transfer Status */}
        {transferring && transferStep && (
          <div className="rounded-md border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-3">
              Transfer Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm text-foreground font-medium">
                  {transferStep}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Logs */}
        {transferLogs.length > 0 && (
          <div className="rounded-md border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Transfer Logs</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTransferLogs([])}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
            <div className="bg-muted rounded-md p-3 max-h-64 overflow-y-auto">
              <div className="space-y-1 font-mono text-xs">
                {transferLogs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
