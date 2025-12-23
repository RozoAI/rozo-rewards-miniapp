"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WalletComponents } from "@/components/wallet-connect-button";
import { formatAddress } from "@/lib/utils";
import { useAppKitAccount } from "@reown/appkit/react";
import { type DeeplinkData } from "@rozoai/deeplink-core";
import { ScanQr } from "@rozoai/deeplink-react";
import {
  getChainById,
  getChainName,
  rozoSolana,
  rozoStellar,
  supportedTokens,
} from "@rozoai/intent-common";
import { ArrowLeft, Check, QrCode, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ScanResult({
  data,
  onClear,
}: {
  data: DeeplinkData;
  onClear: () => void;
}) {
  // Check if this is a payment-related scan
  const isPaymentType =
    data.type === "stellar" ||
    data.type === "ethereum" ||
    data.type === "solana" ||
    data.type === "address";

  const paymentData = isPaymentType
    ? (data as Extract<
        DeeplinkData,
        { type: "stellar" | "ethereum" | "solana" | "address" }
      >)
    : null;

  const [amount, setAmount] = useState(paymentData?.amount || "");
  const [isProcessing, setIsProcessing] = useState(false);

  const destinationAddress = paymentData?.address;
  const destinationChain =
    paymentData?.asset?.code ||
    (paymentData?.chain_id ? getChainName(Number(paymentData.chain_id)) : null);
  const hasAmount = !!paymentData?.amount;
  const canConfirm =
    hasAmount ||
    (amount.trim().length > 0 && !isNaN(Number(amount)) && Number(amount) > 0);

  const availableChains = () => {
    if (data.type === "ethereum") {
      return Array.from(supportedTokens)
        .filter(([chainId, tokens]) => getChainById(chainId).type == "evm")
        .map(([chainId, tokens]) => getChainById(chainId));
    } else if (data.type === "solana") {
      return [rozoSolana];
    } else if (data.type === "stellar") {
      return [rozoStellar];
    }
    return [];
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setIsProcessing(true);
    try {
      // TODO: Implement actual payment logic here
      const paymentAmount = amount || paymentData?.amount;
      console.log("Confirming payment:", {
        destinationAddress,
        destinationChain,
        amount: paymentAmount,
        data,
      });

      toast.success("Payment confirmed!", {
        description: `Sending ${paymentAmount} ${destinationChain} to ${destinationAddress?.slice(
          0,
          8
        )}...`,
      });

      // Clear after successful payment
      setTimeout(() => {
        onClear();
      }, 2000);
    } catch (error) {
      toast.error("Payment failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isPaymentType || !destinationAddress) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Scan Result</h3>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <ArrowLeft className="size-4 mr-2" />
            Clear
          </Button>
        </div>
        <div className="text-center py-4">
          <p className="text-gray-600">This QR code is not a payment request</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Payment Details</h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <ArrowLeft className="size-4 mr-2" />
          Clear
        </Button>
      </div>

      <div className="space-y-4">
        {/* Destination Address */}
        <div>
          <Label className="text-sm font-medium text-gray-500">
            Destination Address
          </Label>
          <div className="mt-1 p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-mono break-all text-gray-900">
              {formatAddress(destinationAddress)}
            </p>
          </div>
        </div>

        {/* Asset */}
        {destinationChain ? (
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Destination Chain
            </Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {destinationChain}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-sm font-medium text-gray-500">
              Choose Chain
            </Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select Chain" />
              </SelectTrigger>
              <SelectContent>
                {availableChains().map((chain) => (
                  <SelectItem
                    key={chain.chainId}
                    value={chain.chainId.toString()}
                  >
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Amount */}
        {hasAmount ? (
          <div>
            <Label className="text-sm font-medium text-gray-500">Amount</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-900">
                {paymentData?.amount}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <Label
              htmlFor="amount"
              className="text-sm font-medium text-gray-500"
            >
              Amount *
            </Label>
            <Input
              id="amount"
              type="number"
              step="any"
              min="0"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">Enter the amount</p>
          </div>
        )}

        {/* Confirm Button */}
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm || isProcessing}
          className="w-full"
          size="lg"
        >
          <Check className="size-5 mr-2" />
          {isProcessing ? "Processing..." : "Confirm Payment"}
        </Button>
      </div>
    </div>
  );
}

function PayPageContent() {
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState<DeeplinkData | null>(null);

  const handleScanSuccess = (data: DeeplinkData) => {
    console.log("Scanned data:", data);
    setScannedData(data);
    setScannerOpen(false);
    toast.success("QR code scanned successfully!");
  };

  const handleScanError = (error: Error) => {
    console.error("Scan error:", error);
    setScannerOpen(false);
    toast.error(`Failed to scan QR code: ${error.message}`);
  };

  const clearResult = () => {
    setScannedData(null);
  };

  return (
    <>
      <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <div className="w-full max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pay</h1>
            <p className="text-gray-600 mb-4">
              Scan QR codes to send payments accross any chains
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Scan Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => setScannerOpen(true)}
                size="lg"
                className="w-full max-w-xs h-16 text-base"
              >
                <QrCode className="size-6 mr-3" />
                Scan QR Code
              </Button>
            </div>

            {/* Scan Result */}
            {scannedData && (
              <div className="flex justify-center">
                <ScanResult data={scannedData} onClear={clearResult} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <Dialog open={isScannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Position the QR code within the scanner frame
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2">
            <ScanQr
              onScan={handleScanSuccess}
              onError={handleScanError}
              components={{
                finder: false,
              }}
              sound={false}
              constraints={{
                facingMode: "environment",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PayPage() {
  const { isConnected } = useAppKitAccount();

  if (!isConnected) {
    return (
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
          <Wallet className="size-10 text-gray-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Connect Wallet to Pay
          </h1>
          <p className="text-gray-600">
            You need to connect your wallet to access payment features and scan
            QR codes
          </p>
        </div>

        <div className="flex justify-center">
          <WalletComponents />
        </div>
      </div>
    );
  }

  return <PayPageContent />;
}
