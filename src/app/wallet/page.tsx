"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRozoWallet } from "@/hooks/useRozoWallet";
import { AlertCircle, CheckCircle2, Copy, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WalletPage() {
  const {
    address,
    isConnected,
    isLoading,
    isAvailable,
    signTransaction,
    signAuthEntry,
    signMessage,
  } = useRozoWallet();

  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);

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
              disabled={signing}
              className="w-full"
              variant="outline"
            >
              {signing ? "Signing..." : "Sign Message"}
            </Button>
            <Button
              onClick={handleSignTransaction}
              disabled={signing}
              className="w-full"
              variant="outline"
            >
              {signing ? "Signing..." : "Sign Transaction"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
