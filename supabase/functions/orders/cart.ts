// Shopping cart management API
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  validateRequiredFields,
  getUserFromAuth,
  supabaseAdmin,
  logError,
  ERROR_CODES
} from "../_shared/utils.ts";

interface AddToCartRequest {
  product_id: string;
  quantity?: number;
}

interface UpdateCartItemRequest {
  quantity: number;
}

interface CartResponse {
  order_id: string;
  order_number: string;
  status: string;
  items: CartItem[];
  totals: {
    subtotal_usd: number;
    item_count: number;
    total_cashback_rozo: number;
    total_cashback_usd: number;
  };
  created_at: string;
  updated_at: string;
}

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  unit_price_usd: number;
  quantity: number;
  line_total_usd: number;
  line_cashback_rozo: number;
  line_cashback_usd: number;
  cashback_rate: number;
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
    const itemId = pathParts[pathParts.length - 1];

    if (req.method === "GET") {
      // Get current cart
      return await getCurrentCart(user.id);

    } else if (req.method === "POST") {
      // Add item to cart
      const body: AddToCartRequest = await req.json();
      return await addToCart(user.id, body);

    } else if (req.method === "PUT" && itemId && itemId !== "cart") {
      // Update cart item quantity
      const body: UpdateCartItemRequest = await req.json();
      return await updateCartItem(user.id, itemId, body);

    } else if (req.method === "DELETE" && itemId && itemId !== "cart") {
      // Remove item from cart
      return await removeFromCart(user.id, itemId);

    } else if (req.method === "DELETE") {
      // Clear entire cart
      return await clearCart(user.id);

    } else {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Method not allowed",
        405
      );
    }

  } catch (error) {
    logError("cart-api", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});

async function getCurrentCart(userId: string): Promise<Response> {
  try {
    // Get current cart order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items:order_items(
          id,
          product_id,
          product_name,
          product_sku,
          unit_price_usd,
          quantity,
          line_total_usd,
          line_cashback_rozo,
          line_cashback_usd,
          cashback_rate
        )
      `)
      .eq("user_id", userId)
      .eq("status", "cart")
      .order("cart_created_at", { ascending: false })
      .limit(1)
      .single();

    if (orderError && orderError.code !== "PGRST116") {
      logError("get-cart", orderError, { user_id: userId });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to fetch cart"
      );
    }

    if (!order) {
      // Return empty cart
      return createResponse({
        order_id: null,
        order_number: null,
        status: "cart",
        items: [],
        totals: {
          subtotal_usd: 0,
          item_count: 0,
          total_cashback_rozo: 0,
          total_cashback_usd: 0,
        },
        created_at: null,
        updated_at: null,
      });
    }

    const cartResponse: CartResponse = {
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      items: order.order_items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit_price_usd: parseFloat(item.unit_price_usd),
        quantity: item.quantity,
        line_total_usd: parseFloat(item.line_total_usd),
        line_cashback_rozo: item.line_cashback_rozo,
        line_cashback_usd: parseFloat(item.line_cashback_usd),
        cashback_rate: parseFloat(item.cashback_rate),
      })),
      totals: {
        subtotal_usd: parseFloat(order.subtotal_usd),
        item_count: order.order_items.length,
        total_cashback_rozo: order.total_cashback_rozo,
        total_cashback_usd: parseFloat(order.total_cashback_usd),
      },
      created_at: order.cart_created_at,
      updated_at: order.updated_at,
    };

    return createResponse(cartResponse);

  } catch (error) {
    logError("get-current-cart", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to get cart"
    );
  }
}

async function addToCart(userId: string, body: AddToCartRequest): Promise<Response> {
  try {
    // Validate required fields
    const validationError = validateRequiredFields(body, ["product_id"]);
    if (validationError) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationError
      );
    }

    const quantity = body.quantity || 1;
    if (quantity <= 0) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Quantity must be greater than 0"
      );
    }

    // Use stored procedure to add item to cart
    const { data: result, error } = await supabaseAdmin.rpc(
      "add_item_to_order",
      {
        p_user_id: userId,
        p_product_id: body.product_id,
        p_quantity: quantity,
      }
    );

    if (error) {
      logError("add-to-cart", error, { user_id: userId, product_id: body.product_id });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to add item to cart"
      );
    }

    return createResponse(result);

  } catch (error) {
    logError("add-to-cart", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to add item to cart"
    );
  }
}

async function updateCartItem(userId: string, itemId: string, body: UpdateCartItemRequest): Promise<Response> {
  try {
    // Validate quantity
    if (body.quantity <= 0) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Quantity must be greater than 0"
      );
    }

    // Verify item belongs to user's cart
    const { data: item, error: itemError } = await supabaseAdmin
      .from("order_items")
      .select(`
        *,
        order:orders!inner(user_id, status)
      `)
      .eq("id", itemId)
      .eq("order.user_id", userId)
      .eq("order.status", "cart")
      .single();

    if (itemError || !item) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Cart item not found"
      );
    }

    // Calculate new totals
    const newLineTotal = parseFloat(item.unit_price_usd) * body.quantity;
    const cashbackRate = parseFloat(item.cashback_rate);
    
    // Get user tier for cashback calculation
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tier")
      .eq("id", userId)
      .single();

    const tierMultiplier = {
      bronze: 1.0,
      silver: 1.2,
      gold: 1.5,
      platinum: 2.0,
    }[profile?.tier || "bronze"];

    const finalCashbackRate = cashbackRate * tierMultiplier;
    const newCashbackUsd = newLineTotal * (finalCashbackRate / 100);
    const newCashbackRozo = Math.floor(newCashbackUsd * 100);

    // Update cart item
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from("order_items")
      .update({
        quantity: body.quantity,
        line_total_usd: newLineTotal,
        line_cashback_usd: newCashbackUsd,
        line_cashback_rozo: newCashbackRozo,
      })
      .eq("id", itemId)
      .select("*")
      .single();

    if (updateError) {
      logError("update-cart-item", updateError, { item_id: itemId });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to update cart item"
      );
    }

    // Recalculate order totals
    await supabaseAdmin.rpc("calculate_order_totals", {
      p_order_id: item.order_id,
    });

    return createResponse(updatedItem);

  } catch (error) {
    logError("update-cart-item", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to update cart item"
    );
  }
}

async function removeFromCart(userId: string, itemId: string): Promise<Response> {
  try {
    // Verify item belongs to user's cart
    const { data: item, error: itemError } = await supabaseAdmin
      .from("order_items")
      .select(`
        order_id,
        order:orders!inner(user_id, status)
      `)
      .eq("id", itemId)
      .eq("order.user_id", userId)
      .eq("order.status", "cart")
      .single();

    if (itemError || !item) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Cart item not found"
      );
    }

    // Delete item
    const { error: deleteError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      logError("remove-from-cart", deleteError, { item_id: itemId });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to remove item from cart"
      );
    }

    // Recalculate order totals
    await supabaseAdmin.rpc("calculate_order_totals", {
      p_order_id: item.order_id,
    });

    return createResponse({ success: true, message: "Item removed from cart" });

  } catch (error) {
    logError("remove-from-cart", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to remove item from cart"
    );
  }
}

async function clearCart(userId: string): Promise<Response> {
  try {
    // Get user's cart order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "cart")
      .single();

    if (orderError || !order) {
      return createResponse({ success: true, message: "Cart is already empty" });
    }

    // Delete all items from cart
    const { error: deleteError } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("order_id", order.id);

    if (deleteError) {
      logError("clear-cart", deleteError, { user_id: userId });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to clear cart"
      );
    }

    // Delete the empty cart order
    await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", order.id);

    return createResponse({ success: true, message: "Cart cleared successfully" });

  } catch (error) {
    logError("clear-cart", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to clear cart"
    );
  }
}
