// Product details API with cashback calculation preview
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  getUserFromAuth,
  getUserProfile,
  calculateCashbackRozo,
  supabaseAdmin,
  logError,
  ERROR_CODES
} from "../_shared/utils.ts";

interface ProductDetailsResponse {
  id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_category: string;
  merchant_logo_url?: string;
  sku: string;
  name: string;
  description?: string;
  price_usd: number;
  currency: string;
  cashback_rate: number;
  image_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  cashback_preview?: {
    user_tier: string;
    base_rate: number;
    tier_multiplier: number;
    final_rate: number;
    cashback_usd: number;
    cashback_rozo: number;
    conversion_rate: string;
  };
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET") {
    return createErrorResponse(
      ERROR_CODES.VALIDATION_ERROR,
      "Method not allowed",
      405
    );
  }

  try {
    // Get product ID from URL
    const url = new URL(req.url);
    const productId = url.pathname.split("/").pop();

    if (!productId) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Product ID is required"
      );
    }

    // Get product with merchant details
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select(`
        *,
        merchant:merchants!inner(
          id,
          name,
          category,
          logo_url,
          is_active
        )
      `)
      .eq("id", productId)
      .eq("is_active", true)
      .eq("merchant.is_active", true)
      .single();

    if (productError || !product) {
      logError("fetch-product-details", productError, { product_id: productId });
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Product not found or inactive"
      );
    }

    // Build base response
    const response: ProductDetailsResponse = {
      id: product.id,
      merchant_id: product.merchant_id,
      merchant_name: product.merchant.name,
      merchant_category: product.merchant.category,
      merchant_logo_url: product.merchant.logo_url,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price_usd: parseFloat(product.price_usd),
      currency: product.currency,
      cashback_rate: parseFloat(product.cashback_rate),
      image_url: product.image_url,
      metadata: product.metadata,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };

    // If user is authenticated, add cashback preview
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const { user } = await getUserFromAuth(authHeader);
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          const { cashbackUsd, cashbackRozo, finalRate } = calculateCashbackRozo(
            response.price_usd,
            response.cashback_rate,
            profile.tier
          );

          const tierMultiplier = {
            bronze: 1.0,
            silver: 1.2,
            gold: 1.5,
            platinum: 2.0,
          }[profile.tier] || 1.0;

          response.cashback_preview = {
            user_tier: profile.tier,
            base_rate: response.cashback_rate,
            tier_multiplier: tierMultiplier,
            final_rate: finalRate,
            cashback_usd: cashbackUsd,
            cashback_rozo: cashbackRozo,
            conversion_rate: "1 ROZO = $0.01 USD",
          };
        }
      }
    }

    return createResponse(response);

  } catch (error) {
    logError("product-details", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
