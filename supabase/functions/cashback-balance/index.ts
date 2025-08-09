// Fetch user's current ROZO cashback balance
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  getUserFromAuth,
  getUserProfile,
  supabaseAdmin,
  logError,
  rozoToUsd,
  ERROR_CODES
} from "../_shared/utils.ts";

interface CashbackBalance {
  total_cashback_rozo: number; // Total ROZO earned
  available_cashback_rozo: number; // Available ROZO balance for spending
  used_cashback_rozo: number; // Total ROZO used
  total_cashback_usd: number; // USD equivalent of total ROZO
  available_cashback_usd: number; // USD equivalent of available ROZO
  used_cashback_usd: number; // USD equivalent of used ROZO
  conversion_rate: string; // "1 ROZO = $0.01 USD"
  pending_cashback: {
    rozo: number;
    usd: number;
    count: number;
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

    // Get user profile with ROZO balances
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "User profile not found"
      );
    }

    // Get pending cashback
    const { data: pendingCashback, error: pendingError } = await supabaseAdmin
      .from("cashback")
      .select("amount_rozo, amount_usd")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (pendingError) {
      logError("fetch-pending-cashback", pendingError, { user_id: user.id });
    }

    const pendingRozo = pendingCashback?.reduce((sum, cb) => sum + cb.amount_rozo, 0) || 0;
    const pendingUsd = pendingCashback?.reduce((sum, cb) => sum + cb.amount_usd, 0) || 0;

    const balance: CashbackBalance = {
      total_cashback_rozo: profile.total_cashback_rozo || 0,
      available_cashback_rozo: profile.available_cashback_rozo || 0,
      used_cashback_rozo: profile.used_cashback_rozo || 0,
      total_cashback_usd: rozoToUsd(profile.total_cashback_rozo || 0),
      available_cashback_usd: rozoToUsd(profile.available_cashback_rozo || 0),
      used_cashback_usd: rozoToUsd(profile.used_cashback_rozo || 0),
      conversion_rate: "1 ROZO = $0.01 USD",
      pending_cashback: {
        rozo: pendingRozo,
        usd: pendingUsd,
        count: pendingCashback?.length || 0,
      },
    };

    return createResponse(balance);

  } catch (error) {
    logError("cashback-balance", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
