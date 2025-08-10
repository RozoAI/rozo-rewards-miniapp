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
    // Return test data directly for development (bypass all auth)
    console.log('🔧 Development mode: returning test cashback data');
    
    const testResponseData: CashbackBalanceData = {
      available_cashback_rozo: 1500,
      total_cashback_rozo: 2000,
      used_cashback_rozo: 500,
      available_cashback_usd: 15.0,
      total_cashback_usd: 20.0,
      used_cashback_usd: 5.0,
      current_tier: "silver",
      tier_multiplier: 1.2,
      conversion_rate: "1 ROZO = $0.01 USD",
      pending_cashback: {
        rozo: 250,
        usd: 2.5,
        count: 3
      }
    };

    console.log('📤 Returning test cashback response:', testResponseData);
    return createResponse({
      balance_summary: testResponseData
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