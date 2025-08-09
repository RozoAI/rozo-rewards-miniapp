// Claim ROZO cashback from completed purchases
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  validateRequiredFields,
  getUserFromAuth,
  getUserProfile,
  supabaseAdmin,
  logError,
  calculateCashbackRozo,
  ERROR_CODES
} from "../_shared/utils.ts";
import { Cashback } from "../_shared/types.ts";

interface ClaimCashbackRequest {
  transaction_id: string;
  product_id: string;
  amount_usd: number;
}

interface ClaimCashbackResponse {
  cashback: Cashback;
  amount_rozo: number;
  amount_usd: number;
  base_rate: number;
  tier_multiplier: number;
  final_rate: number;
  user_tier: string;
  conversion_rate: string;
}

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

    const body: ClaimCashbackRequest = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, [
      "transaction_id",
      "product_id", 
      "amount_usd"
    ]);

    if (validationError) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationError
      );
    }

    // Validate amount
    if (body.amount_usd <= 0) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Amount must be greater than 0"
      );
    }

    // Get user profile
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "User profile not found"
      );
    }

    // Verify transaction belongs to user and is confirmed
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", body.transaction_id)
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .single();

    if (txError || !transaction) {
      logError("fetch-transaction", txError, { 
        transaction_id: body.transaction_id, 
        user_id: user.id 
      });
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Transaction not found or not confirmed"
      );
    }

    // Check if cashback already claimed for this transaction
    const { data: existingCashback } = await supabaseAdmin
      .from("cashback")
      .select("id")
      .eq("user_id", user.id)
      .eq("transaction_id", body.transaction_id)
      .eq("type", "purchase_cashback")
      .single();

    if (existingCashback) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Cashback already claimed for this transaction"
      );
    }

    // Get product details and cashback rate
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", body.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      logError("fetch-product", productError, { product_id: body.product_id });
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Product not found or inactive"
      );
    }

    // Calculate cashback using the product's specific cashback rate
    const { cashbackUsd, cashbackRozo, finalRate } = calculateCashbackRozo(
      body.amount_usd,
      product.cashback_rate, // Use product-specific rate instead of merchant rate
      profile.tier
    );

    // Get tier multiplier for response
    const tierMultiplier = {
      bronze: 1.0,
      silver: 1.2,
      gold: 1.5,
      platinum: 2.0,
    }[profile.tier] || 1.0;

    // Create cashback record
    const { data: cashback, error: cashbackError } = await supabaseAdmin
      .from("cashback")
      .insert({
        user_id: user.id,
        transaction_id: body.transaction_id,
        type: "purchase_cashback",
        amount_rozo: cashbackRozo,
        amount_usd: cashbackUsd,
        currency: "ROZO",
        status: "available",
        metadata: {
          product_id: body.product_id,
          product_name: product.name,
          product_sku: product.sku,
          merchant_id: product.merchant_id,
          base_cashback_rate: product.cashback_rate,
          tier_multiplier: tierMultiplier,
          final_cashback_rate: finalRate,
          purchase_amount_usd: body.amount_usd,
        },
      })
      .select("*")
      .single();

    if (cashbackError) {
      logError("create-cashback", cashbackError, {
        user_id: user.id,
        transaction_id: body.transaction_id,
      });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create cashback record"
      );
    }

    const response: ClaimCashbackResponse = {
      cashback,
      amount_rozo: cashbackRozo,
      amount_usd: cashbackUsd,
      base_rate: product.cashback_rate,
      tier_multiplier: tierMultiplier,
      final_rate: finalRate,
      user_tier: profile.tier,
      conversion_rate: "1 ROZO = $0.01 USD",
    };

    return createResponse(response);

  } catch (error) {
    logError("claim-cashback", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
