// Products API for merchant SKUs with cashback rates
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
import { Product, PaginatedResponse } from "../_shared/types.ts";

interface ProductsQuery {
  merchant_id?: string;
  category?: string;
  search?: string;
  min_price?: string;
  max_price?: string;
  min_cashback_rate?: string;
  max_cashback_rate?: string;
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
    const params: ProductsQuery = {
      merchant_id: url.searchParams.get("merchant_id") || undefined,
      category: url.searchParams.get("category") || undefined,
      search: url.searchParams.get("search") || undefined,
      min_price: url.searchParams.get("min_price") || undefined,
      max_price: url.searchParams.get("max_price") || undefined,
      min_cashback_rate: url.searchParams.get("min_cashback_rate") || undefined,
      max_cashback_rate: url.searchParams.get("max_cashback_rate") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
    };

    // Validate pagination
    const { limit, offset } = validatePagination(params.limit, params.offset);

    // Build query with merchant details
    let query = supabaseAdmin
      .from("products")
      .select(`
        *,
        merchant:merchants!inner(
          id,
          name,
          category,
          logo_url,
          is_active
        )
      `, { count: "exact" })
      .eq("is_active", true)
      .eq("merchant.is_active", true)
      .order("cashback_rate", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply filters
    if (params.merchant_id) {
      query = query.eq("merchant_id", params.merchant_id);
    }

    if (params.category) {
      query = query.eq("merchant.category", params.category.toUpperCase());
    }

    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
    }

    if (params.min_price) {
      const minPrice = parseFloat(params.min_price);
      if (!isNaN(minPrice) && minPrice >= 0) {
        query = query.gte("price_usd", minPrice);
      }
    }

    if (params.max_price) {
      const maxPrice = parseFloat(params.max_price);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        query = query.lte("price_usd", maxPrice);
      }
    }

    if (params.min_cashback_rate) {
      const minRate = parseFloat(params.min_cashback_rate);
      if (!isNaN(minRate) && minRate >= 0) {
        query = query.gte("cashback_rate", minRate);
      }
    }

    if (params.max_cashback_rate) {
      const maxRate = parseFloat(params.max_cashback_rate);
      if (!isNaN(maxRate) && maxRate >= 0) {
        query = query.lte("cashback_rate", maxRate);
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      logError("fetch-products", error, { params });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch products"
      );
    }

    // Transform data to include merchant info at top level
    const transformedProducts = products?.map(product => ({
      ...product,
      merchant_name: product.merchant.name,
      merchant_category: product.merchant.category,
      merchant_logo_url: product.merchant.logo_url,
      merchant: undefined, // Remove nested merchant object
    })) || [];

    const response: PaginatedResponse<Product> = {
      items: transformedProducts,
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    };

    return createResponse(response);

  } catch (error) {
    logError("products-api", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
