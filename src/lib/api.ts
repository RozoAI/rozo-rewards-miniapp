const INTENT_API_BASE = "https://intentapiv4.rozo.ai/functions/v1";

export interface MerchantPaymentRequest {
  appId: string;
  amount_local: string;
  currency_local: string;
  source?: { chainId: string; tokenSymbol: string };
}

export interface MerchantPaymentResponse {
  id: string;
  appId: string;
  orderId: string;
  status: string;
  errorCode: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  paymentLink: string;
  isMerchant: boolean;
  merchantStatus: string;
  merchant: {
    appId: string;
    name: string;
    logoUrl: string;
    description: string;
  };
  display: {
    title: string;
    description: string | null;
    currency: string;
  };
  source: {
    chainId: string;
    tokenSymbol: string;
    tokenAddress: string;
    amount: string;
    receiverAddress: string;
    receiverMemo: string | null;
    receiverAddressContract?: string;
    receiverMemoContract?: string;
    fee: string;
    senderAddress: string | null;
    txHash: string | null;
    amountReceived: string | null;
    confirmedAt: string | null;
  };
  destination: {
    chainId: string;
    receiverAddress: string;
    receiverMemo: string | null;
    tokenSymbol: string;
    tokenAddress: string;
    amount: string;
    txHash: string | null;
    confirmedAt: string | null;
  };
  metadata: {
    appId: string;
    intent: string;
    fx_rate: number;
    partner: string;
    fx_rate_at: string;
    amount_local: string;
    currency_local: string;
    merchant_order_id: string;
  };
}

export async function createMerchantPayment(
  params: MerchantPaymentRequest
): Promise<MerchantPaymentResponse> {
  const response = await fetch(
    `${INTENT_API_BASE}/payment-api/payments/merchant`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message ?? `Failed to create merchant payment: ${response.status}`
    );
  }

  return response.json();
}
