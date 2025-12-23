"use client";

import {
  Arbitrum,
  Base,
  BinanceSmartChain,
  Ethereum,
  Polygon,
  Solana,
  Stellar,
} from "@/components/chainLogo";
import ChainsStacked from "@/components/ChainStacked";
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
  arbitrum,
  base,
  bsc,
  ethereum,
  getChainById,
  getChainName,
  getKnownToken,
  polygon,
  rozoSolana,
  rozoStellar,
  rozoStellarUSDC,
  solana,
  supportedPayoutTokens,
  Token,
  TokenSymbol,
} from "@rozoai/intent-common";
import { RozoPayButton, useRozoPayUI } from "@rozoai/intent-pay";
import { ArrowLeft, QrCode, ScanLine, Wallet } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatUnits } from "viem";

const chainToLogo = {
  [arbitrum.chainId]: <Arbitrum width={12} height={12} />,
  [base.chainId]: <Base width={12} height={12} />,
  [bsc.chainId]: <BinanceSmartChain width={12} height={12} />,
  [ethereum.chainId]: (
    <Ethereum width={12} height={12} className="rounded-full" />
  ),
  [polygon.chainId]: <Polygon width={12} height={12} />,
  [rozoSolana.chainId]: <Solana width={12} height={12} />,
  [rozoStellar.chainId]: (
    <Stellar width={12} height={12} className="rounded-full" />
  ),
};

function ScanResult({
  data,
  onClear,
  onRescan,
}: {
  data: DeeplinkData;
  onClear: () => void;
  onRescan: () => void;
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

  const { resetPayment } = useRozoPayUI();

  const [amount, setAmount] = useState(paymentData?.amount || "");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [intentReady, setIntentReady] = useState(false);
  const [intentConfig, setIntentConfig] = useState<{
    toAddress: string;
    toChain: number;
    toToken: string;
    toUnits: string;
    intent: string;
  } | null>(null);
  const showDialogRef = useRef<(() => void) | null>(null);

  // Reset state when data changes (e.g., on re-scan)
  useEffect(() => {
    setAmount(paymentData?.amount || "");
    setSelectedToken(null);
    setConfirmed(false);
    setIntentReady(false);
    setIntentConfig(null);
    showDialogRef.current = null;
  }, [data, paymentData?.amount]);

  // Destination address
  const destinationAddress = paymentData?.address;
  const destinationTokenAddress = paymentData?.token_address || null;

  // Amount
  const hasAmount = !!paymentData?.amount;

  // Confrimation
  const canConfirm =
    hasAmount ||
    (amount.trim().length > 0 && !isNaN(Number(amount)) && Number(amount) > 0);

  const availableTokens = useMemo(() => {
    return Array.from(supportedPayoutTokens.entries())
      .filter(([chainId, tokens]) => {
        if (chainId === solana.chainId) return false;
        const chainType = getChainById(chainId).type;
        if (data.type === "ethereum" && chainType === "evm") return true;
        if (data.type === "stellar" && chainType === "stellar") return true;
        if (data.type === "solana" && chainType === "solana") return true;
        return false;
      })
      .map(([, tokens]) =>
        tokens.filter((token) => token.symbol === TokenSymbol.USDC)
      )
      .flat();
  }, [data.type]);

  const getDestinationToken = useMemo(() => {
    if (!paymentData?.chain_id) return null;

    if (data.type === "stellar") {
      if (data.asset?.code === "USDC") {
        return rozoStellarUSDC;
      }
    }

    if (!destinationTokenAddress) return null;

    return getKnownToken(
      Number(paymentData?.chain_id),
      destinationTokenAddress
    );
  }, [paymentData, destinationTokenAddress, data]);

  // Auto-select token if only one option is available
  useEffect(() => {
    if (
      !getDestinationToken &&
      availableTokens.length === 1 &&
      !selectedToken
    ) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, getDestinationToken, selectedToken]);

  const formattedAmount = useMemo(() => {
    if (!paymentData?.amount || !getDestinationToken) return "";
    return formatUnits(
      BigInt(paymentData.amount),
      Number(getDestinationToken.decimals)
    );
  }, [paymentData, getDestinationToken]);

  const finalAmount = useMemo(() => {
    return formattedAmount || amount;
  }, [formattedAmount, amount]);

  const isIntentReady = useMemo(() => {
    const hasValidAmount =
      !!formattedAmount ||
      (amount.trim().length > 0 &&
        !isNaN(Number(amount)) &&
        Number(amount) > 0);
    return (
      hasValidAmount &&
      !!destinationAddress &&
      (!!getDestinationToken || !!selectedToken)
    );
  }, [
    formattedAmount,
    amount,
    destinationAddress,
    getDestinationToken,
    selectedToken,
  ]);

  // Handle dialog opening with delay after confirmation
  useEffect(() => {
    if (confirmed && intentReady && intentConfig && showDialogRef.current) {
      // Add a small delay before opening the dialog for better UX
      const timer = setTimeout(() => {
        showDialogRef.current?.();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [confirmed, intentReady, intentConfig]);

  useEffect(() => {
    const preparing = async () => {
      // Determine the token to use (from scanned data or manually selected)
      const tokenToUse = getDestinationToken || selectedToken;

      // Determine the amount to use (from scanned data or manually entered)
      const amountToUse = formattedAmount || amount;

      // Check if we have all required fields
      const hasValidAmount =
        formattedAmount ||
        (amount.trim().length > 0 &&
          !isNaN(Number(amount)) &&
          Number(amount) > 0);

      if (hasValidAmount && !!tokenToUse && !!destinationAddress) {
        // Reset confirmation state when amount/token changes
        setConfirmed(false);
        setIntentReady(false);
        showDialogRef.current = null;

        const config = {
          toAddress: destinationAddress,
          toChain: Number(tokenToUse.chainId),
          toToken: tokenToUse.token,
          toUnits: amountToUse,
          intent: `Pay for $${amountToUse} to ${formatAddress(
            destinationAddress
          )}`,
        };

        setIntentConfig(config);

        await resetPayment(config);
        setIntentReady(true);
      }
    };

    preparing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amount,
    formattedAmount,
    selectedToken,
    getDestinationToken,
    destinationAddress,
  ]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirmed(true);
  };

  if (!isPaymentType || !destinationAddress) {
    return (
      <div className="w-full max-w-md mx-auto p-5 bg-card rounded-xl border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">
            Invalid QR Code
          </h3>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <ArrowLeft className="size-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-6">
          <p className="text-muted-foreground">
            This QR code is not a payment request
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Compact Payment Details */}
      <div className="bg-card rounded-xl border p-5 space-y-4">
        {/* Header with re-scan button */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-card-foreground">Payment</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onRescan}
            className="h-8 px-3"
          >
            <ScanLine className="size-3.5 mr-1.5" />
            Re-scan
          </Button>
        </div>

        {/* Compact Details Grid */}
        <div className="space-y-3">
          {/* Amount - Prominent */}
          {hasAmount && getDestinationToken && formattedAmount ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Amount</div>
              <div className="text-2xl font-bold text-card-foreground">
                {formattedAmount}
                <span className="text-base font-normal text-muted-foreground ml-2">
                  {getDestinationToken.name}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <Label
                htmlFor="amount"
                className="text-xs text-muted-foreground mb-1 block"
              >
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  let value = e.target.value
                    .replace(/[^\d.,]/g, "") // Remove all symbols except digits, dot, comma
                    .replace(/,/g, ".") // Replace all commas with dots
                    .split(".") // Split by dots
                    .slice(0, 2) // Keep only first two parts (before and after first dot)
                    .join("."); // Join back with single dot

                  // Prevent just a dot
                  if (value === ".") value = "0.";

                  setAmount(value);
                }}
                className="text-lg font-semibold h-10"
              />
            </div>
          )}

          {/* Token and Address - Side by side */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Token/Chain */}
            {getDestinationToken ? (
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">
                  Token
                </div>
                <div className="p-2.5 bg-muted/50 rounded-md">
                  <p className="text-xs font-medium text-card-foreground flex items-center gap-2">
                    {chainToLogo[Number(getDestinationToken.chainId)]}
                    {getDestinationToken.symbol} -{" "}
                    {getChainName(Number(getDestinationToken.chainId))}
                  </p>
                </div>
              </div>
            ) : availableTokens.length === 0 ? (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Token
                </Label>
                <div className="p-2.5 bg-muted/50 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    No tokens available for this chain type
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Token
                </Label>
                <Select
                  value={selectedToken?.token}
                  onValueChange={(value) =>
                    setSelectedToken(
                      availableTokens.find((token) => token.token === value) ||
                        null
                    )
                  }
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Select Token" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTokens.map((token) => (
                      <SelectItem
                        key={`${token.chainId}-${token.token}`}
                        value={token.token}
                        className="flex items-center gap-2"
                      >
                        {chainToLogo[Number(token.chainId)]} {token.symbol} -{" "}
                        {getChainName(Number(token.chainId))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Address - Compact */}
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">
                Address
              </div>
              <div className="p-2.5 bg-muted/50 rounded-md">
                <p className="text-xs font-mono break-all text-card-foreground">
                  {formatAddress(destinationAddress)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        {isIntentReady && intentConfig ? (
          <RozoPayButton.Custom
            appId={"rozoInvoice"}
            toAddress={intentConfig.toAddress}
            toChain={Number(intentConfig.toChain)}
            toToken={intentConfig.toToken}
            toUnits={finalAmount}
            intent={`Pay for $${finalAmount} to ${formatAddress(
              destinationAddress
            )}`}
            onPaymentCompleted={() => {
              toast.success("Payment completed successfully!");
              onClear();
            }}
            resetOnSuccess
            connectedWalletOnly
          >
            {({ show }) => {
              // Store the show function in ref for delayed opening
              showDialogRef.current = show;

              return !confirmed ? (
                <Button
                  variant="default"
                  className="w-full h-12 cursor-pointer font-semibold text-base"
                  onClick={handleConfirm}
                  size="lg"
                >
                  Confirm Payment
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="w-full h-12 cursor-pointer font-semibold text-base"
                  onClick={show}
                  size="lg"
                >
                  Pay Now
                </Button>
              );
            }}
          </RozoPayButton.Custom>
        ) : (
          <Button
            variant="default"
            className="w-full h-12 cursor-pointer font-semibold text-base"
            size="lg"
            disabled
          >
            Confirm Payment
          </Button>
        )}
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

  const handleRescan = () => {
    setScannerOpen(true);
  };

  return (
    <>
      <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <div className="w-full max-w-md mx-auto">
          {/* Show header and scan button only when no scan result */}
          {!scannedData && (
            <>
              <div className="text-center mb-8">
                {/* Supported Chains */}
                <div className="flex items-center justify-center gap-3 mt-6 mb-4">
                  <ChainsStacked />
                </div>

                <p className="text-muted-foreground mb-4 text-lg">
                  Scan QR codes to send payments across any chains
                </p>
              </div>

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
            </>
          )}

          {/* Show payment details when scanned */}
          {scannedData && (
            <div className="flex justify-center">
              <ScanResult
                data={scannedData}
                onClear={clearResult}
                onRescan={handleRescan}
              />
            </div>
          )}
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
      <div className="w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Wallet className="size-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Connect Wallet to Pay
          </h1>
          <p className="text-muted-foreground">
            You need to connect your wallet to access payment features
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
