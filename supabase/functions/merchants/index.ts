// Merchants API for Rozo Rewards MiniApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  supabaseAdmin,
  logError,
  validatePagination,
  ERROR_CODES
} from "../_shared/utils.ts";
import { Merchant, PaginatedResponse } from "../_shared/types.ts";

interface MerchantsQuery {
  category?: string;
  featured?: string;
  search?: string;
  limit?: string;
  offset?: string;
}

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
    const url = new URL(req.url);
    const params: MerchantsQuery = {
      category: url.searchParams.get("category") || undefined,
      featured: url.searchParams.get("featured") || undefined,
      search: url.searchParams.get("search") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
    };

    // Validate pagination
    const { limit, offset } = validatePagination(params.limit, params.offset);

    // Build query
    let query = supabaseAdmin
      .from("merchants")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (params.category) {
      query = query.eq("category", params.category.toUpperCase());
    }

    if (params.featured === "true") {
      query = query.eq("is_featured", true);
    }

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: merchants, error, count } = await query;

    if (error) {
      logError("fetch-merchants", error, { params });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch merchants"
      );
    }

    const response: PaginatedResponse<Merchant> = {
      items: merchants || [],
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    };

    return createResponse(response);

  } catch (error) {
    logError("merchants-api", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
