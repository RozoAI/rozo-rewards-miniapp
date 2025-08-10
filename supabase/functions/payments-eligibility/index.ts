// Simplified payments eligibility check
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors 
} from "../_shared/utils.ts";

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
    const requestData: CheckEligibilityRequest = await req.json();
    
    // Basic validation
    if (!requestData.amount_usd || requestData.amount_usd <= 0) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid amount_usd"
      );
    }

    // For now, return mock eligibility response
    const mockResponse: EligibilityResponse = {
      eligible: true,
      payment_method: requestData.is_using_credit ? 'rozo_credit' : 'direct_usdc',
      rozo_cost: requestData.is_using_credit ? Math.floor(requestData.amount_usd * 100) : 0,
      remaining_balance: 1000, // Mock balance
      allowance_remaining: 20.00, // Mock allowance
      recommendations: []
    };

    return createResponse(mockResponse);
  } catch (error) {
    console.error("Payments eligibility error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      500
    );
  }
});