// Order checkout API - Convert cart to pending order
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  corsHeaders, 
  createResponse, 
  createErrorResponse, 
  handleCors, 
  validateRequiredFields,
  getUserFromAuth,
  getUserProfile,
  supabaseAdmin,
  logError,
  rozoToUsd,
  ERROR_CODES
} from "../_shared/utils.ts";

interface CheckoutRequest {
  order_id: string;
  rozo_offset_amount?: number; // ROZO tokens to use for payment offset
  shipping_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  delivery_notes?: string;
  payment_method?: string; // 'crypto', 'card', etc.
  currency?: string;
  chain_id?: number;
}

interface CheckoutResponse {
  order_id: string;
  order_number: string;
  status: string;
  payment_summary: {
    subtotal_usd: number;
    rozo_offset_amount: number;
    rozo_offset_usd: number;
    final_amount_usd: number;
    savings_percentage: number;
    total_cashback_rozo: number;
    total_cashback_usd: number;
  };
  payment_intent_needed: boolean;
  next_steps: string[];
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
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

    const body: CheckoutRequest = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(body, ["order_id"]);
    if (validationError) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationError
      );
    }

    // Get user profile for ROZO balance
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "User profile not found"
      );
    }

    // Verify order belongs to user and is in cart status
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        *,
        order_items:order_items(
          id,
          product_name,
          quantity,
          line_total_usd,
          line_cashback_rozo
        )
      `)
      .eq("id", body.order_id)
      .eq("user_id", user.id)
      .eq("status", "cart")
      .single();

    if (orderError || !order) {
      logError("fetch-cart-order", orderError, { 
        order_id: body.order_id, 
        user_id: user.id 
      });
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        "Cart order not found"
      );
    }

    // Validate cart is not empty
    if (!order.order_items || order.order_items.length === 0) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        "Cannot checkout empty cart"
      );
    }

    // Validate ROZO offset amount
    const rozoOffsetAmount = body.rozo_offset_amount || 0;
    const availableRozo = profile.available_cashback_rozo || 0;

    if (rozoOffsetAmount > availableRozo) {
      return createErrorResponse(
        ERROR_CODES.INSUFFICIENT_BALANCE,
        `Insufficient ROZO balance. Available: ${availableRozo}, requested: ${rozoOffsetAmount}`
      );
    }

    // Use stored procedure to proceed to checkout
    const { data: checkoutResult, error: checkoutError } = await supabaseAdmin.rpc(
      "proceed_to_checkout",
      {
        p_order_id: body.order_id,
        p_rozo_offset_amount: rozoOffsetAmount,
      }
    );

    if (checkoutError) {
      logError("proceed-to-checkout", checkoutError, { 
        order_id: body.order_id,
        rozo_offset: rozoOffsetAmount 
      });
      return createErrorResponse(
        ERROR_CODES.INTERNAL_ERROR,
        "Failed to proceed to checkout"
      );
    }

    // Update order with additional checkout details
    const updateData: any = {
      payment_method: body.payment_method || "crypto",
      currency: body.currency || "USDC",
      chain_id: body.chain_id,
      delivery_notes: body.delivery_notes,
    };

    if (body.shipping_address) {
      updateData.shipping_address = body.shipping_address;
    }

    if (body.billing_address) {
      updateData.billing_address = body.billing_address;
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", body.order_id);

    if (updateError) {
      logError("update-order-checkout", updateError, { order_id: body.order_id });
    }

    // Reserve ROZO tokens if being used
    if (rozoOffsetAmount > 0) {
      // Create pending cashback records to "reserve" the ROZO
      const { error: reserveError } = await supabaseAdmin
        .from("cashback")
        .insert({
          user_id: user.id,
          type: "purchase_cashback",
          amount_rozo: -rozoOffsetAmount, // Negative amount for reservation
          amount_usd: -rozoToUsd(rozoOffsetAmount),
          currency: "ROZO",
          status: "pending",
          metadata: {
            type: "rozo_reservation",
            order_id: body.order_id,
            reserved_at: new Date().toISOString(),
          },
        });

      if (reserveError) {
        logError("reserve-rozo", reserveError, { 
          user_id: user.id, 
          order_id: body.order_id,
          amount: rozoOffsetAmount 
        });
      }
    }

    const response: CheckoutResponse = {
      order_id: body.order_id,
      order_number: order.order_number,
      status: "pending",
      payment_summary: {
        subtotal_usd: checkoutResult.subtotal_usd,
        rozo_offset_amount: checkoutResult.rozo_offset_amount,
        rozo_offset_usd: checkoutResult.rozo_offset_usd,
        final_amount_usd: checkoutResult.final_amount_usd,
        savings_percentage: checkoutResult.savings_percentage,
        total_cashback_rozo: checkoutResult.total_cashback_rozo,
        total_cashback_usd: rozoToUsd(checkoutResult.total_cashback_rozo),
      },
      payment_intent_needed: checkoutResult.final_amount_usd > 0,
      next_steps: checkoutResult.final_amount_usd > 0 
        ? [
            "Create payment intent",
            "Complete crypto payment", 
            "Confirm payment",
            "Claim cashback"
          ]
        : [
            "Order completed with ROZO tokens",
            "Claim cashback"
          ],
    };

    return createResponse(response);

  } catch (error) {
    logError("checkout", error);
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "Internal server error"
    );
  }
});
