// Simplified cashback balance function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors 
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
    // For now, return mock data to test CORS
    const mockData: CashbackBalanceData = {
      available_cashback_rozo: 0,
      total_cashback_rozo: 0,
      used_cashback_rozo: 0,
      available_cashback_usd: 0,
      total_cashback_usd: 0,
      used_cashback_usd: 0,
      current_tier: "bronze",
      tier_multiplier: 1.0,
      conversion_rate: "1 ROZO = $0.01 USD",
      pending_cashback: {
        rozo: 0,
        usd: 0,
        count: 0
      }
    };

    return createResponse(mockData);
  } catch (error) {
    console.error("Cashback balance error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Internal server error",
      500
    );
  }
});