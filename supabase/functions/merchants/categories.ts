// Merchant categories API for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  supabaseAdmin,
  logError,
  ERROR_CODES
} from "../_shared/utils.ts";

interface CategoryInfo {
  name: string;
  display_name: string;
  count: number;
}

interface CategoriesResponse {
  categories: CategoryInfo[];
}

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  AI: "AI Services",
  CRYPTO: "Cryptocurrency",
  COMMERCE: "E-Commerce",
  DOMAIN: "Domain & Hosting",
  MARKETING: "Marketing & Social",
  GAMING: "Gaming & Entertainment",
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
    // Get category counts
    const { data: categoryCounts, error } = await supabaseAdmin
      .from("merchants")
      .select("category")
      .eq("is_active", true);

    if (error) {
      logError("fetch-categories", error);
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch categories"
      );
    }

    // Count merchants by category
    const counts: Record<string, number> = {};
    categoryCounts?.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    // Build response
    const categories: CategoryInfo[] = Object.entries(counts).map(([name, count]) => ({
      name,
      display_name: CATEGORY_DISPLAY_NAMES[name] || name,
      count,
    }));

    // Sort by count descending
    categories.sort((a, b) => b.count - a.count);

    const response: CategoriesResponse = {
      categories,
    };

    return createResponse(response);

  } catch (error) {
    logError("categories-api", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
