// Orders management API - List and view orders
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  getUserFromAuth,
  supabaseAdmin,
  logError,
  validatePagination,
  ERROR_CODES
} from "../_shared/utils.ts";

interface OrdersQuery {
  status?: string;
  limit?: string;
  offset?: string;
}

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  subtotal_usd: number;
  rozo_offset_usd: number;
  final_amount_usd: number;
  total_cashback_rozo: number;
  item_count: number;
  cart_created_at?: string;
  checkout_at?: string;
  paid_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

interface OrderDetails extends OrderSummary {
  items: OrderItem[];
  payment_details?: {
    payment_intent_id?: string;
    transaction_id?: string;
    transaction_hash?: string;
    payment_method: string;
    currency: string;
    chain_id?: number;
  };
  addresses?: {
    shipping_address?: any;
    billing_address?: any;
  };
  status_history: StatusHistoryItem[];
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  unit_price_usd: number;
  quantity: number;
  line_total_usd: number;
  line_cashback_rozo: number;
  cashback_rate: number;
}

interface StatusHistoryItem {
  from_status?: string;
  to_status: string;
  reason?: string;
  created_at: string;
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orderId = pathParts[pathParts.length - 1];

    if (req.method === "GET" && orderId && orderId !== "orders") {
      // Get specific order details
      return await getOrderDetails(user.id, orderId);

    } else if (req.method === "GET") {
      // List user's orders
      const params: OrdersQuery = {
        status: url.searchParams.get("status") || undefined,
        limit: url.searchParams.get("limit") || undefined,
        offset: url.searchParams.get("offset") || undefined,
      };
      return await listOrders(user.id, params);

    } else {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Method not allowed",
        405
      );
    }

  } catch (error) {
    logError("orders-api", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});

async function listOrders(userId: string, params: OrdersQuery): Promise<Response> {
  try {
    // Validate pagination
    const { limit, offset } = validatePagination(params.limit, params.offset);

    // Build query
    let query = supabaseAdmin
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        subtotal_usd,
        rozo_offset_usd,
        final_amount_usd,
        total_cashback_rozo,
        cart_created_at,
        checkout_at,
        paid_at,
        completed_at,
        cancelled_at,
        created_at,
        updated_at,
        order_items:order_items(id)
      `, { count: "exact" })
      .eq("user_id", userId)
      .neq("status", "cart") // Exclude cart status from order history
      .order("created_at", { ascending: false });

    // Apply status filter
    if (params.status) {
      query = query.eq("status", params.status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      logError("list-orders", error, { user_id: userId, params });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch orders"
      );
    }

    const orderSummaries: OrderSummary[] = orders?.map(order => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      subtotal_usd: parseFloat(order.subtotal_usd),
      rozo_offset_usd: parseFloat(order.rozo_offset_usd || 0),
      final_amount_usd: parseFloat(order.final_amount_usd),
      total_cashback_rozo: order.total_cashback_rozo,
      item_count: order.order_items?.length || 0,
      cart_created_at: order.cart_created_at,
      checkout_at: order.checkout_at,
      paid_at: order.paid_at,
      completed_at: order.completed_at,
      cancelled_at: order.cancelled_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
    })) || [];

    const response = {
      items: orderSummaries,
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    };

    return createResponse(response);

  } catch (error) {
    logError("list-orders", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to list orders"
    );
  }
}

async function getOrderDetails(userId: string, orderId: string): Promise<Response> {
  try {
    // Get order with all details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items:order_items(*),
        payment_intent:payment_intents(*),
        transaction:transactions(*),
        status_history:order_status_history(
          from_status,
          to_status,
          reason,
          created_at
        )
      `)
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      logError("get-order-details", orderError, { 
        order_id: orderId, 
        user_id: userId 
      });
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Order not found"
      );
    }

    const orderDetails: OrderDetails = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      subtotal_usd: parseFloat(order.subtotal_usd),
      rozo_offset_usd: parseFloat(order.rozo_offset_usd || 0),
      final_amount_usd: parseFloat(order.final_amount_usd),
      total_cashback_rozo: order.total_cashback_rozo,
      item_count: order.order_items?.length || 0,
      cart_created_at: order.cart_created_at,
      checkout_at: order.checkout_at,
      paid_at: order.paid_at,
      completed_at: order.completed_at,
      cancelled_at: order.cancelled_at,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: order.order_items?.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit_price_usd: parseFloat(item.unit_price_usd),
        quantity: item.quantity,
        line_total_usd: parseFloat(item.line_total_usd),
        line_cashback_rozo: item.line_cashback_rozo,
        cashback_rate: parseFloat(item.cashback_rate),
      })) || [],
      status_history: order.status_history?.map((status: any) => ({
        from_status: status.from_status,
        to_status: status.to_status,
        reason: status.reason,
        created_at: status.created_at,
      })) || [],
    };

    // Add payment details if available
    if (order.payment_intent || order.transaction) {
      orderDetails.payment_details = {
        payment_intent_id: order.payment_intent?.id,
        transaction_id: order.transaction?.id,
        transaction_hash: order.transaction?.transaction_hash,
        payment_method: order.payment_method || "crypto",
        currency: order.currency || "USDC",
        chain_id: order.chain_id,
      };
    }

    // Add addresses if available
    if (order.shipping_address || order.billing_address) {
      orderDetails.addresses = {
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
      };
    }

    return createResponse(orderDetails);

  } catch (error) {
    logError("get-order-details", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to get order details"
    );
  }
}
