-- Order management system for complete purchase lifecycle
-- Handles: cart → pending → paid → completed/cancelled

-- Create order status type
CREATE TYPE order_status AS ENUM (
    'cart',           -- Items added to cart, not yet checked out
    'pending',        -- Order created, awaiting payment
    'paid',           -- Payment confirmed, processing order
    'completed',      -- Order fulfilled, cashback available
    'cancelled',      -- Order cancelled
    'refunded'        -- Order refunded
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    order_number TEXT UNIQUE NOT NULL, -- Human-readable order number
    status order_status DEFAULT 'cart' NOT NULL,
    
    -- Pricing details
    subtotal_usd DECIMAL(20,6) NOT NULL DEFAULT 0,
    rozo_offset_amount BIGINT DEFAULT 0, -- ROZO tokens used for payment offset
    rozo_offset_usd DECIMAL(20,6) DEFAULT 0, -- USD value of ROZO offset
    final_amount_usd DECIMAL(20,6) NOT NULL DEFAULT 0, -- Amount to be paid after ROZO offset
    
    -- Tax and fees (for future use)
    tax_amount_usd DECIMAL(20,6) DEFAULT 0,
    fee_amount_usd DECIMAL(20,6) DEFAULT 0,
    
    -- Total cashback potential
    total_cashback_rozo BIGINT DEFAULT 0, -- Total ROZO to be earned
    total_cashback_usd DECIMAL(20,6) DEFAULT 0, -- USD equivalent
    
    -- Payment details
    payment_intent_id UUID REFERENCES public.payment_intents(id),
    transaction_id UUID REFERENCES public.transactions(id),
    payment_method TEXT, -- 'crypto', 'card', etc.
    currency TEXT DEFAULT 'USDC',
    chain_id INTEGER,
    
    -- Timestamps
    cart_created_at TIMESTAMPTZ DEFAULT NOW(),
    checkout_at TIMESTAMPTZ, -- When user proceeds to checkout
    paid_at TIMESTAMPTZ, -- When payment is confirmed
    completed_at TIMESTAMPTZ, -- When order is completed
    cancelled_at TIMESTAMPTZ, -- When order is cancelled
    
    -- Address and delivery (for future use)
    shipping_address JSONB,
    billing_address JSONB,
    delivery_notes TEXT,
    
    -- Order metadata
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_subtotal CHECK (subtotal_usd >= 0),
    CONSTRAINT valid_rozo_offset_amount CHECK (rozo_offset_amount >= 0),
    CONSTRAINT valid_rozo_offset_usd CHECK (rozo_offset_usd >= 0),
    CONSTRAINT valid_final_amount CHECK (final_amount_usd >= 0),
    CONSTRAINT valid_total_cashback_rozo CHECK (total_cashback_rozo >= 0),
    CONSTRAINT valid_total_cashback_usd CHECK (total_cashback_usd >= 0),
    CONSTRAINT valid_rozo_conversion CHECK (rozo_offset_usd = rozo_offset_amount::decimal / 100),
    CONSTRAINT valid_cashback_conversion CHECK (total_cashback_usd = total_cashback_rozo::decimal / 100)
);

-- Create order_items table for individual products in an order
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    
    -- Product details at time of purchase (for historical accuracy)
    product_name TEXT NOT NULL,
    product_sku TEXT NOT NULL,
    product_description TEXT,
    unit_price_usd DECIMAL(20,6) NOT NULL,
    cashback_rate DECIMAL(5,2) NOT NULL, -- Product's cashback rate at time of purchase
    
    -- Quantity and totals
    quantity INTEGER NOT NULL DEFAULT 1,
    line_total_usd DECIMAL(20,6) NOT NULL, -- unit_price * quantity
    line_cashback_rozo BIGINT NOT NULL DEFAULT 0, -- ROZO to be earned for this line
    line_cashback_usd DECIMAL(20,6) NOT NULL DEFAULT 0, -- USD equivalent
    
    -- Item-specific metadata
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_quantity CHECK (quantity > 0),
    CONSTRAINT valid_unit_price CHECK (unit_price_usd >= 0),
    CONSTRAINT valid_cashback_rate CHECK (cashback_rate >= 0 AND cashback_rate <= 100),
    CONSTRAINT valid_line_total CHECK (line_total_usd = unit_price_usd * quantity),
    CONSTRAINT valid_line_cashback_conversion CHECK (line_cashback_usd = line_cashback_rozo::decimal / 100)
);

-- Create order_status_history table for audit trail
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    from_status order_status,
    to_status order_status NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES public.profiles(id) -- Who triggered the status change
);

-- Create indexes
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_payment_intent ON public.orders(payment_intent_id);
CREATE INDEX idx_orders_transaction ON public.orders(transaction_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_cart_created ON public.orders(cart_created_at) WHERE status = 'cart';

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON public.order_status_history(created_at);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own orders" ON public.orders
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own order history" ON public.order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_status_history.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Add updated_at triggers
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'RZ';
    timestamp_part TEXT;
    random_part TEXT;
    order_number TEXT;
BEGIN
    -- Generate timestamp part (YYMMDD)
    timestamp_part := TO_CHAR(NOW(), 'YYMMDD');
    
    -- Generate random part (4 digits)
    random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Combine parts
    order_number := prefix || timestamp_part || random_part;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_number = order_number) LOOP
        random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        order_number := prefix || timestamp_part || random_part;
    END LOOP;
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to track order status changes
CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (
            order_id,
            from_status,
            to_status,
            reason,
            created_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CASE 
                WHEN NEW.status = 'pending' THEN 'User proceeded to checkout'
                WHEN NEW.status = 'paid' THEN 'Payment confirmed'
                WHEN NEW.status = 'completed' THEN 'Order completed'
                WHEN NEW.status = 'cancelled' THEN 'Order cancelled'
                WHEN NEW.status = 'refunded' THEN 'Order refunded'
                ELSE 'Status updated'
            END,
            NEW.user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status tracking
CREATE TRIGGER track_order_status_changes
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
    v_subtotal DECIMAL;
    v_total_cashback_rozo BIGINT;
    v_total_cashback_usd DECIMAL;
    v_item_count INTEGER;
    v_result JSON;
BEGIN
    -- Calculate totals from order items
    SELECT 
        COALESCE(SUM(line_total_usd), 0),
        COALESCE(SUM(line_cashback_rozo), 0),
        COALESCE(SUM(line_cashback_usd), 0),
        COUNT(*)
    INTO 
        v_subtotal,
        v_total_cashback_rozo,
        v_total_cashback_usd,
        v_item_count
    FROM public.order_items
    WHERE order_id = p_order_id;
    
    -- Update order totals
    UPDATE public.orders
    SET 
        subtotal_usd = v_subtotal,
        total_cashback_rozo = v_total_cashback_rozo,
        total_cashback_usd = v_total_cashback_usd,
        final_amount_usd = GREATEST(0, v_subtotal - rozo_offset_usd),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Return calculated totals
    SELECT json_build_object(
        'subtotal_usd', v_subtotal,
        'total_cashback_rozo', v_total_cashback_rozo,
        'total_cashback_usd', v_total_cashback_usd,
        'item_count', v_item_count
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add item to cart/order
CREATE OR REPLACE FUNCTION public.add_item_to_order(
    p_user_id UUID,
    p_product_id UUID,
    p_quantity INTEGER DEFAULT 1,
    p_order_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_order_id UUID;
    v_product products%ROWTYPE;
    v_user_tier TEXT;
    v_tier_multiplier DECIMAL;
    v_final_cashback_rate DECIMAL;
    v_line_cashback_rozo BIGINT;
    v_line_cashback_usd DECIMAL;
    v_item_id UUID;
    v_result JSON;
BEGIN
    -- Get product details
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    
    -- Get user tier for cashback calculation
    SELECT tier INTO v_user_tier
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Calculate tier multiplier
    v_tier_multiplier := CASE v_user_tier
        WHEN 'bronze' THEN 1.0
        WHEN 'silver' THEN 1.2
        WHEN 'gold' THEN 1.5
        WHEN 'platinum' THEN 2.0
        ELSE 1.0
    END;
    
    -- Calculate final cashback rate and amounts
    v_final_cashback_rate := v_product.cashback_rate * v_tier_multiplier;
    v_line_cashback_usd := (v_product.price_usd * p_quantity) * (v_final_cashback_rate / 100);
    v_line_cashback_rozo := public.usd_to_rozo(v_line_cashback_usd);
    
    -- Find or create cart order
    IF p_order_id IS NULL THEN
        SELECT id INTO v_order_id
        FROM public.orders
        WHERE user_id = p_user_id AND status = 'cart'
        ORDER BY cart_created_at DESC
        LIMIT 1;
        
        IF NOT FOUND THEN
            -- Create new cart order
            INSERT INTO public.orders (
                user_id,
                order_number,
                status
            ) VALUES (
                p_user_id,
                public.generate_order_number(),
                'cart'
            ) RETURNING id INTO v_order_id;
        END IF;
    ELSE
        v_order_id := p_order_id;
    END IF;
    
    -- Check if item already exists in order
    UPDATE public.order_items
    SET 
        quantity = quantity + p_quantity,
        line_total_usd = unit_price_usd * (quantity + p_quantity),
        line_cashback_rozo = public.usd_to_rozo(unit_price_usd * (quantity + p_quantity) * (cashback_rate * v_tier_multiplier / 100)),
        line_cashback_usd = unit_price_usd * (quantity + p_quantity) * (cashback_rate * v_tier_multiplier / 100),
        updated_at = NOW()
    WHERE order_id = v_order_id AND product_id = p_product_id
    RETURNING id INTO v_item_id;
    
    -- If item doesn't exist, create new order item
    IF NOT FOUND THEN
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_sku,
            product_description,
            unit_price_usd,
            cashback_rate,
            quantity,
            line_total_usd,
            line_cashback_rozo,
            line_cashback_usd
        ) VALUES (
            v_order_id,
            p_product_id,
            v_product.name,
            v_product.sku,
            v_product.description,
            v_product.price_usd,
            v_product.cashback_rate,
            p_quantity,
            v_product.price_usd * p_quantity,
            v_line_cashback_rozo,
            v_line_cashback_usd
        ) RETURNING id INTO v_item_id;
    END IF;
    
    -- Recalculate order totals
    PERFORM public.calculate_order_totals(v_order_id);
    
    -- Return result
    SELECT json_build_object(
        'order_id', v_order_id,
        'item_id', v_item_id,
        'product_name', v_product.name,
        'quantity', p_quantity,
        'line_total_usd', v_product.price_usd * p_quantity,
        'line_cashback_rozo', v_line_cashback_rozo,
        'final_cashback_rate', v_final_cashback_rate,
        'user_tier', v_user_tier
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to proceed to checkout
CREATE OR REPLACE FUNCTION public.proceed_to_checkout(
    p_order_id UUID,
    p_rozo_offset_amount BIGINT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_available_rozo BIGINT;
    v_rozo_to_use BIGINT;
    v_rozo_offset_usd DECIMAL;
    v_final_amount DECIMAL;
    v_result JSON;
BEGIN
    -- Get order details
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND status = 'cart';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or not in cart status';
    END IF;
    
    -- Get user's available ROZO balance
    SELECT available_cashback_rozo INTO v_available_rozo
    FROM public.profiles
    WHERE id = v_order.user_id;
    
    -- Calculate ROZO to use
    v_rozo_to_use := LEAST(p_rozo_offset_amount, v_available_rozo);
    v_rozo_to_use := LEAST(v_rozo_to_use, public.usd_to_rozo(v_order.subtotal_usd));
    
    -- Calculate USD offset and final amount
    v_rozo_offset_usd := public.rozo_to_usd(v_rozo_to_use);
    v_final_amount := GREATEST(0, v_order.subtotal_usd - v_rozo_offset_usd);
    
    -- Update order for checkout
    UPDATE public.orders
    SET 
        status = 'pending',
        rozo_offset_amount = v_rozo_to_use,
        rozo_offset_usd = v_rozo_offset_usd,
        final_amount_usd = v_final_amount,
        checkout_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Return checkout details
    SELECT json_build_object(
        'order_id', p_order_id,
        'subtotal_usd', v_order.subtotal_usd,
        'rozo_offset_amount', v_rozo_to_use,
        'rozo_offset_usd', v_rozo_offset_usd,
        'final_amount_usd', v_final_amount,
        'total_cashback_rozo', v_order.total_cashback_rozo,
        'savings_percentage', CASE WHEN v_order.subtotal_usd > 0 THEN (v_rozo_offset_usd / v_order.subtotal_usd) * 100 ELSE 0 END
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
