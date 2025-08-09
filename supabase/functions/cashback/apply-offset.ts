// Apply ROZO cashback as payment offset
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
  usdToRozo,
  rozoToUsd,
  ERROR_CODES
} from "../_shared/utils.ts";

interface ApplyOffsetRequest {
  amount_usd: number; // Original payment amount in USD
  rozo_amount?: number; // Specific ROZO amount to use (optional, defaults to max available)
}

interface ApplyOffsetResponse {
  original_amount_usd: number;
  rozo_requested: number;
  rozo_available: number;
  rozo_to_use: number;
  usd_offset: number;
  final_amount_usd: number;
  conversion_rate: string;
  savings_percentage: number;
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

    const body: ApplyOffsetRequest = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, ["amount_usd"]);
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

    // Get user profile with ROZO balance
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "User profile not found"
      );
    }

    const availableRozo = profile.available_cashback_rozo || 0;

    // Calculate ROZO to use
    let rozoToUse: number;
    if (body.rozo_amount !== undefined) {
      // User specified specific amount
      if (body.rozo_amount < 0) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          "ROZO amount cannot be negative"
        );
      }
      if (body.rozo_amount > availableRozo) {
        return createErrorResponse(
          ERROR_CODES.INSUFFICIENT_BALANCE,
          `Insufficient ROZO balance. Available: ${availableRozo}, requested: ${body.rozo_amount}`
        );
      }
      rozoToUse = body.rozo_amount;
    } else {
      // Use maximum available ROZO up to the payment amount
      const maxRozoForAmount = usdToRozo(body.amount_usd);
      rozoToUse = Math.min(availableRozo, maxRozoForAmount);
    }

    // Calculate USD offset
    const usdOffset = rozoToUsd(rozoToUse);
    
    // Calculate final amount (cannot be negative)
    const finalAmount = Math.max(0, body.amount_usd - usdOffset);
    
    // Calculate savings percentage
    const savingsPercentage = body.amount_usd > 0 
      ? Math.round((usdOffset / body.amount_usd) * 10000) / 100 
      : 0;

    const response: ApplyOffsetResponse = {
      original_amount_usd: body.amount_usd,
      rozo_requested: body.rozo_amount || rozoToUse,
      rozo_available: availableRozo,
      rozo_to_use: rozoToUse,
      usd_offset: usdOffset,
      final_amount_usd: finalAmount,
      conversion_rate: "1 ROZO = $0.01 USD",
      savings_percentage: savingsPercentage,
    };

    return createResponse(response);

  } catch (error) {
    logError("apply-rozo-offset", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
