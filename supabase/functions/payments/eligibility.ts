import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";

interface CheckEligibilityRequest {
  amount_usd: number;
  is_using_credit: boolean;
}

interface EligibilityResponse {
  eligible: boolean;
  reason?: string;
  payment_method?: 'direct_usdc' | 'rozo_credit';
  rozo_cost?: number;
  remaining_balance?: number;
  allowance_remaining?: number;
  required?: number;
  available?: number;
  allowance?: number;
  recommendations?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse('Missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return createErrorResponse('Invalid token', 401);
    }

    // Parse request body
    const { amount_usd, is_using_credit }: CheckEligibilityRequest = await req.json();

    // Validate input
    if (typeof amount_usd !== 'number' || amount_usd <= 0) {
      return createErrorResponse('Invalid amount_usd', 400);
    }

    if (typeof is_using_credit !== 'boolean') {
      return createErrorResponse('Invalid is_using_credit', 400);
    }

    // Check payment eligibility using database function
    const { data: eligibilityResult, error: eligibilityError } = await supabaseClient.rpc(
      'check_payment_eligibility',
      {
        p_user_id: user.id,
        p_amount_usd: amount_usd,
        p_is_using_credit: is_using_credit
      }
    );

    if (eligibilityError) {
      console.error('Eligibility check error:', eligibilityError);
      return createErrorResponse('Failed to check payment eligibility', 500);
    }

    // Enhance response with recommendations
    const response: EligibilityResponse = {
      ...eligibilityResult,
      recommendations: generateRecommendations(eligibilityResult, amount_usd)
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Payment eligibility check error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});

function generateRecommendations(eligibility: any, amount_usd: number): string[] {
  const recommendations: string[] = [];

  if (!eligibility.eligible) {
    switch (eligibility.reason) {
      case 'Insufficient ROZO balance':
        recommendations.push('Use direct USDC payment instead of ROZO credits');
        if (eligibility.required && eligibility.available) {
          const shortfall = eligibility.required - eligibility.available;
          recommendations.push(`You need ${shortfall} more ROZO tokens. Make some purchases to earn more!`);
        }
        break;

      case 'CDP Spend Permission not authorized':
        recommendations.push('Please authorize CDP Spend Permissions in your wallet');
        recommendations.push('This will enable one-tap payments for future transactions');
        break;

      case 'CDP Spend Permission expired':
        recommendations.push('Your spend permission has expired. Please re-authorize in your wallet');
        break;

      case 'CDP Spend Permission allowance insufficient':
        recommendations.push('Your current spend allowance is too low for this payment');
        recommendations.push('Please increase your allowance or use ROZO credits if available');
        break;

      default:
        recommendations.push('Please check your account status and try again');
    }
  } else {
    // Payment is eligible - provide optimization tips
    if (eligibility.payment_method === 'rozo_credit') {
      const savings = amount_usd;
      recommendations.push(`Great choice! You'll save $${savings.toFixed(2)} using ROZO credits`);
    } else if (eligibility.payment_method === 'direct_usdc') {
      recommendations.push('Payment authorized via CDP Spend Permissions');
      recommendations.push('You\'ll earn ROZO cashback from this purchase');
    }
  }

  return recommendations;
}
