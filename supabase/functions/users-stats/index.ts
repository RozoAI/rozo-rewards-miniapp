// User statistics API for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  getUserFromAuth,
  getUserProfile,
  getUserTier,
  supabaseAdmin,
  logError,
  ERROR_CODES
} from "../_shared/utils.ts";

interface UserStats {
  total_transactions: number;
  total_spent: number;
  total_cashback_earned: number;
  total_cashback_claimed: number;
  pending_cashback: number;
  tier: string;
  tier_progress: {
    current_points: number;
    next_tier_points: number;
    progress_percentage: number;
  };
}

// Tier thresholds (based on total cashback earned)
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2500,
  platinum: 10000,
};

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

    // Get user profile
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "User profile not found"
      );
    }

    // Get transaction statistics
    const { data: transactionStats, error: statsError } = await supabaseAdmin
      .from("transactions")
      .select("amount, status")
      .eq("user_id", user.id);

    if (statsError) {
      logError("fetch-transaction-stats", statsError, { user_id: user.id });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch transaction statistics"
      );
    }

    // Calculate totals
    const confirmedTransactions = transactionStats?.filter(t => t.status === "confirmed") || [];
    const totalTransactions = confirmedTransactions.length;
    const totalSpent = confirmedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Get reward statistics
    const { data: rewardStats, error: rewardError } = await supabaseAdmin
      .from("rewards")
      .select("amount, status, type")
      .eq("user_id", user.id);

    if (rewardError) {
      logError("fetch-reward-stats", rewardError, { user_id: user.id });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch reward statistics"
      );
    }

    const totalCashbackEarned = parseFloat(profile.total_cashback_earned);
    const totalCashbackClaimed = parseFloat(profile.total_cashback_claimed);
    
    // Calculate pending cashback
    const pendingRewards = rewardStats?.filter(r => 
      r.status === "available" || r.status === "pending"
    ) || [];
    const pendingCashback = pendingRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    // Calculate tier progress
    const currentTier = profile.tier;
    const currentPoints = totalCashbackEarned;
    
    let nextTier: string;
    let nextTierPoints: number;
    
    switch (currentTier) {
      case "bronze":
        nextTier = "silver";
        nextTierPoints = TIER_THRESHOLDS.silver;
        break;
      case "silver":
        nextTier = "gold";
        nextTierPoints = TIER_THRESHOLDS.gold;
        break;
      case "gold":
        nextTier = "platinum";
        nextTierPoints = TIER_THRESHOLDS.platinum;
        break;
      case "platinum":
        nextTier = "platinum";
        nextTierPoints = TIER_THRESHOLDS.platinum;
        break;
      default:
        nextTier = "silver";
        nextTierPoints = TIER_THRESHOLDS.silver;
    }

    const progressPercentage = currentTier === "platinum" 
      ? 100 
      : Math.min((currentPoints / nextTierPoints) * 100, 100);

    const stats: UserStats = {
      total_transactions: totalTransactions,
      total_spent: Math.round(totalSpent * 100) / 100,
      total_cashback_earned: Math.round(totalCashbackEarned * 100) / 100,
      total_cashback_claimed: Math.round(totalCashbackClaimed * 100) / 100,
      pending_cashback: Math.round(pendingCashback * 100) / 100,
      tier: currentTier,
      tier_progress: {
        current_points: Math.round(currentPoints * 100) / 100,
        next_tier_points: nextTierPoints,
        progress_percentage: Math.round(progressPercentage * 100) / 100,
      },
    };

    return createResponse(stats);

  } catch (error) {
    logError("user-stats", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
