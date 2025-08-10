// Simplified payments processing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors 
} from "../_shared/utils.ts";

interface ProcessPaymentRequest {
  receiver: string;
  cashback_rate: number;
  amount: number;
  is_using_credit: boolean;
  product_id?: string;
  merchant_id?: string;
}

interface PaymentResponse {
  payment_id: string;
  status: 'completed' | 'pending' | 'failed';
  amount_paid_usd: number;
  cashback_earned_rozo: number;
  cashback_earned_usd: number;
  remaining_balance?: number;
  transaction_hash?: string;
  receipt_url?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Method not allowed",
      405
    );
  }

  try {
    const requestData: ProcessPaymentRequest = await req.json();
    
    // Basic validation
    if (!requestData.receiver || !requestData.amount || requestData.amount <= 0) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing required fields: receiver, amount"
      );
    }

    // Calculate cashback
    const cashbackRozo = Math.floor(requestData.amount * (requestData.cashback_rate / 100) * 100);
    const cashbackUsd = cashbackRozo / 100;

    // For now, return mock payment response
    const mockResponse: PaymentResponse = {
      payment_id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed',
      amount_paid_usd: requestData.amount,
      cashback_earned_rozo: cashbackRozo,
      cashback_earned_usd: cashbackUsd,
      remaining_balance: requestData.is_using_credit ? 1000 : undefined,
      transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      receipt_url: `https://etherscan.io/tx/0x${Math.random().toString(16).substr(2, 64)}`
    };

    return createResponse(mockResponse);
  } catch (error) {
    console.error("Payments process error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      500
    );
  }
});