import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors,
  getUserFromAuth 
} from "../_shared/utils.ts";

interface CashbackBalanceData {
  available_cashback_rozo: number;
  total_cashback_rozo: number;
  used_cashback_rozo: number;
  available_cashback_usd: number;
  total_cashback_usd: number;
  used_cashback_usd: number;
  current_tier: string;
  tier_multiplier: number;
  conversion_rate: string;
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
      "VALIDATION_ERROR",
      "Method not allowed",
      405
    );
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const { user, error: authError } = await getUserFromAuth(req.headers.get("authorization"));
    if (authError || !user) {
      return createErrorResponse(
        "AUTHENTICATION_ERROR",
        "Authentication required",
        401
      );
    }

    console.log(`🔍 Getting balance for wallet: ${user.wallet_address}`);
    
    // Use the new cb_hack function
    const { data: balanceData, error } = await supabaseClient.rpc(
      'cb_hack_get_user_balance',
      { p_wallet_address: user.wallet_address || user.id }
    );

    if (error) {
      console.error('Balance retrieval error:', error);
      return createErrorResponse('Failed to get user balance', 500);
    }

    console.log('✅ Balance retrieved from cb_hack database:', balanceData);
    return createResponse({
      balance_summary: balanceData
    });
  } catch (error) {
    console.error("Cashback balance error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      500
    );
  }
});