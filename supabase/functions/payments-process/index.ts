import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors,
  getUserFromAuth 
} from "../_shared/utils.ts";

interface ProcessPaymentRequest {
  receiver: string;
  amount: number;
  cashback_rate?: number;
  is_using_credit?: boolean;
  merchant_id?: string;
  merchant?: string;
}

interface PaymentResponse {
  success: boolean;
  transaction_hash: string;
  amount_paid_usd: number;
  cashback_earned: number;
  final_cashback_rate: number;
  message: string;
  balance_update: {
    available_cashback_rozo: number;
    total_cashback_rozo: number;
  };
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
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
    
    // For development mode - update real database state for testing
    console.log('🔧 Development mode - processing payment with state update');
    
    const requestData: ProcessPaymentRequest = await req.json();
    
    console.log('📝 Payment request:', {
      receiver: requestData.receiver,
      amount: requestData.amount,
      merchant: requestData.merchant
    });
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate cashback
    const amountUsd = requestData.amount || 0.1;
    const cashbackRozo = Math.floor(amountUsd * 10); // 10x multiplier for development
    
    // Get existing profile to accumulate totals
    let existingProfile = null;
    try {
      const { data } = await supabaseClient
        .from('cb_hack_profiles')
        .select('*')
        .eq('wallet_address', 'dev_user_8cb4')
        .single();
      existingProfile = data;
    } catch (error) {
      console.log('ℹ️ No existing profile found, creating new one');
    }
    
    // Calculate accumulated totals
    const currentCashback = existingProfile?.total_cashback_rozo || 0;
    const currentSpent = existingProfile?.total_spent_usd || 0;
    
    // Create/update user profile in cb_hack_profiles with accumulated data
    const mockProfile = {
      wallet_address: 'dev_user_8cb4', // From development token
      total_cashback_rozo: currentCashback + cashbackRozo, // Accumulate cashback
      available_cashback_rozo: currentCashback + cashbackRozo, // Accumulate available
      used_cashback_rozo: existingProfile?.used_cashback_rozo || 0,
      total_spent_usd: currentSpent + amountUsd, // Accumulate spending
      created_at: existingProfile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('🔄 Updating mock profile:', mockProfile);

    // Upsert the profile (insert or update)
    const { error: profileError } = await supabaseClient
      .from('cb_hack_profiles')
      .upsert(mockProfile, { 
        onConflict: 'wallet_address',
        ignoreDuplicates: false 
      });

    if (profileError) {
      console.warn('⚠️ Profile update failed (continuing with simulation):', profileError);
    } else {
      console.log('✅ Profile updated successfully');
    }

    // Mock successful payment response
    const testResponse = {
      success: true,
      transaction_hash: `0x${'development_payment_' + Date.now()}`,
      amount_paid_usd: amountUsd,
      cashback_earned: cashbackRozo,
      final_cashback_rate: 10.0,
      message: '🔧 Development mode: Payment simulation with state update',
      balance_update: {
        available_cashback_rozo: currentCashback + cashbackRozo,
        total_cashback_rozo: currentCashback + cashbackRozo
      }
    };
    
    console.log('✅ Returning development payment success with state update:', testResponse);
    return createResponse(testResponse);
    
  } catch (error) {
    console.error('❌ Error in payments-process:', error);
    return createErrorResponse(
      "PROCESSING_ERROR",
      error.message || "Payment processing failed",
      500
    );
  }
});