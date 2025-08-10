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

    // Get user from JWT token
    const { user, error: authError } = await getUserFromAuth(
      req.headers.get("authorization")
    );
    
    if (authError || !user) {
      return createErrorResponse(authError || 'Authentication required', 401);
    }

    // First, try to create user profile if it doesn't exist
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingProfile) {
      // Create user profile
      const walletAddress = user.wallet_address || `0x${user.id.slice(-40)}`;
      
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          wallet_address: walletAddress,
          username: `User_${user.id.slice(-6)}`,
          referral_code: `ROZO${user.id.slice(-6).toUpperCase()}`,
          metadata: { created_via: 'api', auto_created: true }
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Continue anyway, might be a race condition
      }
    }

    // Get user's ROZO rewards (both available and pending)
    const { data: rewards, error: rewardsError } = await supabaseClient
      .from('rewards')
      .select('amount, status, type')
      .eq('user_id', user.id)
      .eq('currency', 'ROZO');

    if (rewardsError) {
      console.error('Rewards query error:', rewardsError);
      // Return zero balance if query fails
    }

    // Calculate balances
    const availableRewards = rewards?.filter(r => r.status === 'available') || [];
    const pendingRewards = rewards?.filter(r => r.status === 'pending') || [];
    const claimedRewards = rewards?.filter(r => r.status === 'claimed') || [];

    const available_rozo = availableRewards.reduce((sum, r) => sum + (r.amount || 0), 0);
    const pending_rozo = pendingRewards.reduce((sum, r) => sum + (r.amount || 0), 0);
    const used_rozo = claimedRewards.reduce((sum, r) => sum + (r.amount || 0), 0);
    const total_rozo = available_rozo + pending_rozo + used_rozo;

    // ROZO to USD conversion (1 ROZO = $0.01 USD)
    const conversion_rate = 0.01;

    const responseData: CashbackBalanceData = {
      available_cashback_rozo: available_rozo,
      total_cashback_rozo: total_rozo,
      used_cashback_rozo: used_rozo,
      available_cashback_usd: available_rozo * conversion_rate,
      total_cashback_usd: total_rozo * conversion_rate,
      used_cashback_usd: used_rozo * conversion_rate,
      current_tier: "bronze", // TODO: Get from profile
      tier_multiplier: 1.0,
      conversion_rate: "1 ROZO = $0.01 USD",
      pending_cashback: {
        rozo: pending_rozo,
        usd: pending_rozo * conversion_rate,
        count: pendingRewards.length
      }
    };

    return createResponse({
      balance_summary: responseData
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