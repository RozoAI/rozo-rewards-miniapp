import { useState } from "react";

interface RozoPointsResponse {
  balance: {
    points: number;
  };
}

interface SpendPointsRequest {
  from_address: string;
  to_handle: string;
  amount_usd_cents: number;
  amount_local: number;
  currency_local: string;
  timestamp: number;
  order_id: string;
  about: string;
  signature?: string;
  message?: string;
}

interface SpendPointsResponse {
  status: string;
  message: string;
  data: {
    from_address: string;
    to_handle: string;
    amount_usd_cents: number;
    amount_local: number;
    currency_local: string;
    timestamp: number;
    order_id: string;
    about: string;
    signature: string;
  };
  isValidSignature: boolean;
}

export function useRozoPointAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPoints = async (address: string): Promise<number> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://auth0.rozo.ai/functions/v1/cashback?evm_address=${address}`
      );
      const data: RozoPointsResponse = await response.json();
      return (data.balance.points || 0) * 100;
    } catch (err) {
      setError("Failed to fetch points balance");
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  /*
    Amount: 1.00 USD
    From: 0xbbca2269b1ebbb859dd4e5f0b024a5b574151b57
    To: 0xab47828c07eeea1ecff55baa729da0eb3790f6fb
    Time: 2025-03-10T09:04:24.229Z
    Order ID: ORDER123
    About: Monitor rental for 1 day
  */

  // Function to generate the message
  function getSignMessage(
    fromAddress: string,
    toAddress: string,
    amountUsdCents: number,
    timestamp: number,
    orderId: string = "",
    about: string = ""
  ): string {
    const dollars = Math.floor(amountUsdCents / 100);
    const cents = amountUsdCents % 100;
    const amountStr = `${dollars}.${cents.toString().padStart(2, "0")}`;

    return `Amount: ${amountStr} USD
From: ${fromAddress.toLowerCase()}
To: ${toAddress.toLowerCase()}
Time: ${new Date(timestamp).toISOString()}
Order ID: ${orderId}
About: ${about}
    `;
  }

  const spendPoints = async (
    payload: SpendPointsRequest
  ): Promise<SpendPointsResponse | null> => {
    setIsLoading(true);
    setError(null);
    try {
      // Get the message to sign
      const message = getSignMessage(
        payload.from_address,
        payload.to_handle,
        payload.amount_usd_cents,
        payload.timestamp,
        payload.order_id,
        payload.about
      );

      const timestamp = Date.now();
      const body: SpendPointsRequest = {
        from_address: payload.from_address,
        to_handle: payload.to_handle,
        amount_usd_cents: Number(payload.amount_usd_cents.toFixed(2)),
        amount_local: Number(payload.amount_local.toFixed(2)),
        currency_local: payload.currency_local,
        timestamp,
        order_id: timestamp.toString(),
        about: payload.about,
        signature: message,
      };

      const response = await fetch("https://api.rozo.ai/v1/cashbacksign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data: SpendPointsResponse = await response.json();

      if (data.status !== "success") {
        throw new Error(data.message);
      }

      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to spend points";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getPoints,
    spendPoints,
    isLoading,
    error,
  };
}
