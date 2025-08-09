// Confirm payment for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createPublicClient, http } from "https://esm.sh/viem@2.21.1";
import { base, mainnet, polygon, optimism, arbitrum } from "https://esm.sh/viem@2.21.1/chains";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  validateRequiredFields,
  getUserFromAuth,
  isValidTxHash,
  supabaseAdmin,
  logError,
  isPaymentIntentExpired,
  ERROR_CODES
} from "../_shared/utils.ts";
import { Transaction, Reward } from "../_shared/types.ts";

interface ConfirmPaymentRequest {
  transaction_hash: string;
}

interface ConfirmPaymentResponse {
  transaction: Transaction;
  rewards: Reward[];
}

// Chain configuration
const CHAIN_CONFIG = {
  1: { chain: mainnet, rpcUrl: "https://eth.llamarpc.com" },
  8453: { chain: base, rpcUrl: "https://mainnet.base.org" },
  137: { chain: polygon, rpcUrl: "https://polygon.llamarpc.com" },
  10: { chain: optimism, rpcUrl: "https://mainnet.optimism.io" },
  42161: { chain: arbitrum, rpcUrl: "https://arb1.arbitrum.io/rpc" },
};

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      "Method not allowed",
      405
    );
  }

  try {
    // Authenticate user
    const { user, error: authError } = await getUserFromAuth(
      req.headers.get("authorization")
    );

    if (authError || !user) {
      return createErrorResponse(
        ERROR_CODES.UNAUTHORIZED,
        authError || "Authentication required"
      );
    }

    // Get payment intent ID from URL
    const url = new URL(req.url);
    const intentId = url.pathname.split("/")[2]; // /payments/{intent_id}/confirm

    if (!intentId) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Payment intent ID is required"
      );
    }

    const body: ConfirmPaymentRequest = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, ["transaction_hash"]);
    if (validationError) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationError
      );
    }

    // Validate transaction hash format
    if (!isValidTxHash(body.transaction_hash)) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid transaction hash format"
      );
    }

    // Get payment intent
    const { data: paymentIntent, error: intentError } = await supabaseAdmin
      .from("payment_intents")
      .select("*")
      .eq("id", intentId)
      .eq("user_id", user.id)
      .single();

    if (intentError || !paymentIntent) {
      logError("fetch-payment-intent", intentError, { intent_id: intentId, user_id: user.id });
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Payment intent not found"
      );
    }

    // Check if payment intent is expired
    if (isPaymentIntentExpired(paymentIntent.expires_at)) {
      return createErrorResponse(
        ERROR_CODES.PAYMENT_INTENT_EXPIRED,
        "Payment intent has expired"
      );
    }

    // Check if already confirmed
    if (paymentIntent.status === "confirmed") {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Payment intent already confirmed"
      );
    }

    // Get chain configuration
    const chainConfig = CHAIN_CONFIG[paymentIntent.chain_id as keyof typeof CHAIN_CONFIG];
    if (!chainConfig) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Unsupported chain"
      );
    }

    // Verify transaction on blockchain
    let transactionReceipt;
    try {
      const client = createPublicClient({
        chain: chainConfig.chain,
        transport: http(chainConfig.rpcUrl),
      });

      transactionReceipt = await client.getTransactionReceipt({
        hash: body.transaction_hash as `0x${string}`,
      });

      // Verify transaction details
      if (transactionReceipt.status !== "success") {
        return createErrorResponse(
          ERROR_CODES.TRANSACTION_FAILED,
          "Transaction failed on blockchain"
        );
      }

      // Additional verification could be added here:
      // - Check to_address matches payment intent
      // - Check amount matches payment intent
      // - Check from_address matches user's wallet

    } catch (error) {
      logError("verify-transaction", error, { 
        tx_hash: body.transaction_hash, 
        chain_id: paymentIntent.chain_id 
      });
      return createErrorResponse(
        ERROR_CODES.TRANSACTION_FAILED,
        "Failed to verify transaction on blockchain"
      );
    }

    // Start transaction to create transaction record and rewards
    const { data: result, error: transactionError } = await supabaseAdmin.rpc(
      'confirm_payment_with_rewards',
      {
        p_intent_id: intentId,
        p_transaction_hash: body.transaction_hash,
        p_block_number: Number(transactionReceipt.blockNumber),
        p_gas_used: Number(transactionReceipt.gasUsed),
        p_from_address: transactionReceipt.from,
      }
    );

    if (transactionError) {
      logError("confirm-payment-transaction", transactionError, { intent_id: intentId });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to confirm payment"
      );
    }

    // If stored procedure doesn't exist, do it manually
    if (!result) {
      // Create transaction record
      const { data: transaction, error: createTxError } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: user.id,
          merchant_id: paymentIntent.merchant_id,
          transaction_hash: body.transaction_hash,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          cashback_amount: paymentIntent.cashback_amount,
          cashback_percentage: paymentIntent.cashback_percentage,
          status: "confirmed",
          to_address: paymentIntent.to_address,
          from_address: transactionReceipt.from,
          chain_id: paymentIntent.chain_id,
          block_number: Number(transactionReceipt.blockNumber),
          gas_used: Number(transactionReceipt.gasUsed),
        })
        .select("*")
        .single();

      if (createTxError) {
        logError("create-transaction", createTxError);
        return createErrorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to create transaction record"
        );
      }

      // Create cashback reward
      const { data: reward, error: rewardError } = await supabaseAdmin
        .from("rewards")
        .insert({
          user_id: user.id,
          transaction_id: transaction.id,
          type: "cashback",
          amount: paymentIntent.cashback_amount,
          currency: paymentIntent.currency,
          status: "available",
        })
        .select("*")
        .single();

      if (rewardError) {
        logError("create-reward", rewardError);
        return createErrorResponse(
          ERROR_CODES.INTERNAL_ERROR,
          "Failed to create reward"
        );
      }

      // Update payment intent status
      await supabaseAdmin
        .from("payment_intents")
        .update({ 
          status: "confirmed", 
          transaction_id: transaction.id 
        })
        .eq("id", intentId);

      const response: ConfirmPaymentResponse = {
        transaction,
        rewards: [reward],
      };

      return createResponse(response);
    }

    // Return result from stored procedure
    return createResponse(result);

  } catch (error) {
    logError("confirm-payment", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
