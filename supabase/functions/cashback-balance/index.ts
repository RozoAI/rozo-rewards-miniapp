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
    // Check if authorization header is present
    const authHeader = req.headers.get('authorization');
    console.log('🔍 Authorization header present:', !!authHeader);
    
    // For development mode - return test data directly
    console.log('🔧 Development mode - returning test cashback balance');
    
    const testResponse: CashbackBalanceData = {
      available_cashback_rozo: 0,
      total_cashback_rozo: 0,
      used_cashback_rozo: 0,
      available_cashback_usd: 0,
      total_cashback_usd: 0,
      used_cashback_usd: 0,
      current_tier: 'bronze',
      tier_multiplier: 1.0,
      conversion_rate: '1.0',
      pending_cashback: {
        rozo: 0,
        usd: 0,
        count: 0
      }
    };

    console.log('📤 Returning test cashback balance:', testResponse);
    return createResponse({ balance_summary: testResponse });

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