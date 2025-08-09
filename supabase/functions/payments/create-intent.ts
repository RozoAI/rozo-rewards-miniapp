// Create payment intent for Rozo Rewards MiniApp
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
  calculateCashback,
  getPaymentIntentExpiration,
  isValidChainId,
  checkRateLimit,
  getRateLimitHeaders,
  ERROR_CODES
} from "../_shared/utils.ts";

interface CreatePaymentIntentRequest {
  merchant_id: string;
  product_id?: string; // Optional product ID for product-specific cashback rates
  amount: number; // Final amount after ROZO offset
  original_amount?: number; // Original amount before ROZO offset
  rozo_offset?: number; // ROZO tokens used as payment offset
  currency?: string;
  chain_id: number;
  metadata?: Record<string, any>;
}

interface CreatePaymentIntentResponse {
  payment_intent_id: string;
  to_address: string;
  amount: number; // Final amount after ROZO offset
  original_amount?: number; // Original amount before ROZO offset
  rozo_offset?: number; // ROZO tokens used as offset
  currency: string;
  chain_id: number;
  cashback_amount: number;
  cashback_percentage: number;
  expires_at: string;
  product_info?: {
    id: string;
    name: string;
    sku: string;
    cashback_rate: number;
  };
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Rate limiting
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const { user } = await getUserFromAuth(authHeader);
    if (user) {
      const rateLimitKey = `create-intent:${user.id}`;
      if (!checkRateLimit(rateLimitKey, 20, 60000)) { // 20 requests per minute
        const headers = getRateLimitHeaders(rateLimitKey, 20, 60000);
        return createErrorResponse(
          ERROR_CODES.RATE_LIMITED,
          "Too many payment intent requests. Please try again later.",
          429
        );
      }
    }
  }

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

    const body: CreatePaymentIntentRequest = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, [
      "merchant_id",
      "amount",
      "chain_id"
    ]);

    if (validationError) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationError
      );
    }

    // Validate amount
    if (body.amount <= 0) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Amount must be greater than 0"
      );
    }

    // Validate chain ID
    if (!isValidChainId(body.chain_id)) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Unsupported chain ID"
      );
    }

    // Get merchant details
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from("merchants")
      .select("*")
      .eq("id", body.merchant_id)
      .eq("is_active", true)
      .single();

    if (merchantError || !merchant) {
      logError("fetch-merchant", merchantError, { merchant_id: body.merchant_id });
      return createErrorResponse(
        ERROR_CODES.MERCHANT_NOT_FOUND,
        "Merchant not found or inactive"
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

    // Get product details for cashback rate if product_id is provided
    let cashbackRate = merchant.cashback_percentage; // Default to merchant rate
    let productInfo = null;

    if (body.product_id) {
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", body.product_id)
        .eq("merchant_id", body.merchant_id)
        .eq("is_active", true)
        .single();

      if (product) {
        cashbackRate = product.cashback_rate; // Use product-specific rate
        productInfo = product;
      } else if (productError) {
        logError("fetch-product-for-intent", productError, { product_id: body.product_id });
      }
    }

    // Calculate cashback using the appropriate rate
    const cashbackAmount = calculateCashback(
      body.original_amount || body.amount, // Use original amount for cashback calculation
      cashbackRate,
      profile.tier
    );

    // Set payment address (merchant's wallet or platform address)
    const toAddress = "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897"; // Platform address

    // Create payment intent
    const expiresAt = getPaymentIntentExpiration(15); // 15 minutes

    const { data: paymentIntent, error: createError } = await supabaseAdmin
      .from("payment_intents")
      .insert({
        user_id: user.id,
        merchant_id: body.merchant_id,
        amount: body.amount,
        currency: body.currency || "USDC",
        chain_id: body.chain_id,
        to_address: toAddress,
        cashback_amount: cashbackAmount,
        cashback_percentage: cashbackRate,
        expires_at: expiresAt.toISOString(),
        metadata: {
          ...body.metadata || {},
          product_id: body.product_id,
          original_amount: body.original_amount,
          rozo_offset: body.rozo_offset,
          product_name: productInfo?.name,
          product_sku: productInfo?.sku,
        },
      })
      .select("*")
      .single();

    if (createError) {
      logError("create-payment-intent", createError, { user_id: user.id, merchant_id: body.merchant_id });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to create payment intent"
      );
    }

    const response: CreatePaymentIntentResponse = {
      payment_intent_id: paymentIntent.id,
      to_address: toAddress,
      amount: body.amount,
      original_amount: body.original_amount,
      rozo_offset: body.rozo_offset,
      currency: body.currency || "USDC",
      chain_id: body.chain_id,
      cashback_amount: cashbackAmount,
      cashback_percentage: cashbackRate,
      expires_at: expiresAt.toISOString(),
      ...(productInfo && {
        product_info: {
          id: productInfo.id,
          name: productInfo.name,
          sku: productInfo.sku,
          cashback_rate: productInfo.cashback_rate,
        },
      }),
    };

    return createResponse(response);

  } catch (error) {
    logError("create-payment-intent", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
