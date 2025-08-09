-- Refactor rewards to cashback system with $ROZO token
-- 1 ROZO = $0.01 USD (100:1 conversion rate)

-- Create new cashback status type
CREATE TYPE cashback_status AS ENUM ('pending', 'available', 'used', 'expired');
CREATE TYPE cashback_type AS ENUM ('purchase_cashback', 'referral_bonus', 'tier_bonus', 'promotion');

-- Create products table for merchant SKUs
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_usd DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    cashback_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage cashback rate for this specific product
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_price CHECK (price_usd > 0),
    CONSTRAINT valid_cashback_rate CHECK (cashback_rate >= 0 AND cashback_rate <= 100),
    CONSTRAINT valid_image_url CHECK (image_url IS NULL OR image_url ~ '^https?://.*'),
    UNIQUE(merchant_id, sku)
);

-- Rename rewards table to cashback
ALTER TABLE public.rewards RENAME TO cashback;

-- Update cashback table structure for ROZO system
ALTER TABLE public.cashback 
    ADD COLUMN amount_rozo BIGINT NOT NULL DEFAULT 0, -- Amount in ROZO tokens (integer)
    ADD COLUMN amount_usd DECIMAL(20,6) NOT NULL DEFAULT 0, -- USD equivalent for reference
    ADD COLUMN used_at TIMESTAMPTZ,
    ADD COLUMN used_in_transaction_id UUID REFERENCES public.transactions(id),
    DROP COLUMN IF EXISTS claim_transaction_hash,
    DROP COLUMN IF EXISTS claimed_at;

-- Update cashback table constraints and types
ALTER TABLE public.cashback 
    DROP CONSTRAINT IF EXISTS rewards_type_check,
    DROP CONSTRAINT IF EXISTS rewards_status_check,
    ADD CONSTRAINT valid_amount_rozo CHECK (amount_rozo >= 0),
    ADD CONSTRAINT valid_amount_usd CHECK (amount_usd >= 0),
    ADD CONSTRAINT valid_conversion CHECK (amount_usd = amount_rozo::decimal / 100); -- 100:1 conversion

-- Update type and status columns
ALTER TABLE public.cashback 
    ALTER COLUMN type TYPE cashback_type USING type::text::cashback_type,
    ALTER COLUMN status TYPE cashback_status USING 
        CASE 
            WHEN status = 'claimed' THEN 'used'::cashback_status
            WHEN status = 'pending' THEN 'pending'::cashback_status
            WHEN status = 'available' THEN 'available'::cashback_status
            WHEN status = 'expired' THEN 'expired'::cashback_status
            ELSE 'available'::cashback_status
        END;

-- Update profiles table for ROZO balance tracking
ALTER TABLE public.profiles 
    ADD COLUMN total_cashback_rozo BIGINT NOT NULL DEFAULT 0, -- Total ROZO earned
    ADD COLUMN available_cashback_rozo BIGINT NOT NULL DEFAULT 0, -- Available ROZO balance
    ADD COLUMN used_cashback_rozo BIGINT NOT NULL DEFAULT 0; -- Total ROZO used

-- Update profiles constraints
ALTER TABLE public.profiles 
    ADD CONSTRAINT valid_total_cashback_rozo CHECK (total_cashback_rozo >= 0),
    ADD CONSTRAINT valid_available_cashback_rozo CHECK (available_cashback_rozo >= 0),
    ADD CONSTRAINT valid_used_cashback_rozo CHECK (used_cashback_rozo >= 0),
    ADD CONSTRAINT valid_rozo_balance CHECK (total_cashback_rozo = available_cashback_rozo + used_cashback_rozo);

-- Add product_id to transactions table
ALTER TABLE public.transactions 
    ADD COLUMN product_id UUID REFERENCES public.products(id),
    ADD COLUMN original_amount_usd DECIMAL(20,6), -- Original amount before ROZO offset
    ADD COLUMN rozo_offset_amount BIGINT DEFAULT 0, -- ROZO tokens used as payment offset
    ADD COLUMN final_amount_usd DECIMAL(20,6); -- Final amount after ROZO offset

-- Add constraints for new transaction fields
ALTER TABLE public.transactions 
    ADD CONSTRAINT valid_rozo_offset CHECK (rozo_offset_amount >= 0),
    ADD CONSTRAINT valid_original_amount CHECK (original_amount_usd IS NULL OR original_amount_usd >= 0),
    ADD CONSTRAINT valid_final_amount CHECK (final_amount_usd IS NULL OR final_amount_usd >= 0);

-- Create indexes for new tables and columns
CREATE INDEX idx_products_merchant_id ON public.products(merchant_id);
CREATE INDEX idx_products_sku ON public.products(merchant_id, sku);
CREATE INDEX idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_cashback_rate ON public.products(cashback_rate);

CREATE INDEX idx_cashback_amount_rozo ON public.cashback(amount_rozo);
CREATE INDEX idx_cashback_used_at ON public.cashback(used_at) WHERE used_at IS NOT NULL;
CREATE INDEX idx_cashback_used_in_transaction ON public.cashback(used_in_transaction_id) WHERE used_in_transaction_id IS NOT NULL;

CREATE INDEX idx_transactions_product_id ON public.transactions(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_transactions_rozo_offset ON public.transactions(rozo_offset_amount) WHERE rozo_offset_amount > 0;

CREATE INDEX idx_profiles_available_rozo ON public.profiles(available_cashback_rozo);
CREATE INDEX idx_profiles_total_rozo ON public.profiles(total_cashback_rozo);

-- Update RLS policies for new tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashback ENABLE ROW LEVEL SECURITY;

-- Products policies (public read for active products)
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (is_active = true);

-- Cashback policies (same as old rewards policies but renamed)
CREATE POLICY "Users can view own cashback" ON public.cashback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cashback" ON public.cashback
    FOR UPDATE USING (auth.uid() = user_id);

-- Add updated_at trigger for products
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to calculate ROZO from USD
CREATE OR REPLACE FUNCTION public.usd_to_rozo(usd_amount DECIMAL)
RETURNS BIGINT AS $$
BEGIN
    RETURN FLOOR(usd_amount * 100); -- 100:1 conversion rate
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate USD from ROZO
CREATE OR REPLACE FUNCTION public.rozo_to_usd(rozo_amount BIGINT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN rozo_amount::decimal / 100; -- 100:1 conversion rate
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update user ROZO balances
CREATE OR REPLACE FUNCTION public.update_user_rozo_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update total_cashback_rozo
        UPDATE public.profiles 
        SET total_cashback_rozo = (
            SELECT COALESCE(SUM(amount_rozo), 0) 
            FROM public.cashback 
            WHERE user_id = NEW.user_id AND type = 'purchase_cashback'
        )
        WHERE id = NEW.user_id;
        
        -- Update available_cashback_rozo
        UPDATE public.profiles 
        SET available_cashback_rozo = (
            SELECT COALESCE(SUM(amount_rozo), 0) 
            FROM public.cashback 
            WHERE user_id = NEW.user_id AND status = 'available'
        )
        WHERE id = NEW.user_id;
        
        -- Update used_cashback_rozo
        UPDATE public.profiles 
        SET used_cashback_rozo = (
            SELECT COALESCE(SUM(amount_rozo), 0) 
            FROM public.cashback 
            WHERE user_id = NEW.user_id AND status = 'used'
        )
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for ROZO balance updates
DROP TRIGGER IF EXISTS update_rozo_balance ON public.cashback;
CREATE TRIGGER update_rozo_balance
    AFTER INSERT OR UPDATE ON public.cashback
    FOR EACH ROW EXECUTE FUNCTION public.update_user_rozo_balance();

-- Function to use ROZO as payment offset
CREATE OR REPLACE FUNCTION public.apply_rozo_offset(
    p_user_id UUID,
    p_amount_usd DECIMAL,
    p_rozo_amount BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_available_rozo BIGINT;
    v_rozo_to_use BIGINT;
    v_usd_offset DECIMAL;
    v_final_amount DECIMAL;
    v_result JSON;
BEGIN
    -- Get user's available ROZO balance
    SELECT available_cashback_rozo INTO v_available_rozo
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Calculate ROZO to use (minimum of requested and available)
    v_rozo_to_use := LEAST(p_rozo_amount, v_available_rozo);
    
    -- Calculate USD offset
    v_usd_offset := public.rozo_to_usd(v_rozo_to_use);
    
    -- Calculate final amount
    v_final_amount := GREATEST(0, p_amount_usd - v_usd_offset);
    
    -- Build result
    SELECT json_build_object(
        'original_amount_usd', p_amount_usd,
        'rozo_requested', p_rozo_amount,
        'rozo_available', v_available_rozo,
        'rozo_to_use', v_rozo_to_use,
        'usd_offset', v_usd_offset,
        'final_amount_usd', v_final_amount
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process cashback earning
CREATE OR REPLACE FUNCTION public.process_cashback_earning(
    p_user_id UUID,
    p_transaction_id UUID,
    p_product_id UUID,
    p_amount_usd DECIMAL
)
RETURNS JSON AS $$
DECLARE
    v_product products%ROWTYPE;
    v_user_tier TEXT;
    v_base_cashback_rate DECIMAL;
    v_tier_multiplier DECIMAL;
    v_final_cashback_rate DECIMAL;
    v_cashback_usd DECIMAL;
    v_cashback_rozo BIGINT;
    v_cashback_id UUID;
    v_result JSON;
BEGIN
    -- Get product details
    SELECT * INTO v_product
    FROM products
    WHERE id = p_product_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found or inactive';
    END IF;
    
    -- Get user tier
    SELECT tier INTO v_user_tier
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get tier multiplier
    v_tier_multiplier := CASE v_user_tier
        WHEN 'bronze' THEN 1.0
        WHEN 'silver' THEN 1.2
        WHEN 'gold' THEN 1.5
        WHEN 'platinum' THEN 2.0
        ELSE 1.0
    END;
    
    -- Calculate final cashback rate
    v_base_cashback_rate := v_product.cashback_rate;
    v_final_cashback_rate := v_base_cashback_rate * v_tier_multiplier;
    
    -- Calculate cashback amounts
    v_cashback_usd := p_amount_usd * (v_final_cashback_rate / 100);
    v_cashback_rozo := public.usd_to_rozo(v_cashback_usd);
    
    -- Create cashback record
    INSERT INTO cashback (
        user_id,
        transaction_id,
        type,
        amount_rozo,
        amount_usd,
        currency,
        status,
        metadata
    ) VALUES (
        p_user_id,
        p_transaction_id,
        'purchase_cashback',
        v_cashback_rozo,
        v_cashback_usd,
        'ROZO',
        'available',
        json_build_object(
            'product_id', p_product_id,
            'product_name', v_product.name,
            'base_cashback_rate', v_base_cashback_rate,
            'tier_multiplier', v_tier_multiplier,
            'final_cashback_rate', v_final_cashback_rate
        )
    ) RETURNING id INTO v_cashback_id;
    
    -- Build result
    SELECT json_build_object(
        'cashback_id', v_cashback_id,
        'amount_rozo', v_cashback_rozo,
        'amount_usd', v_cashback_usd,
        'base_rate', v_base_cashback_rate,
        'tier_multiplier', v_tier_multiplier,
        'final_rate', v_final_cashback_rate,
        'user_tier', v_user_tier
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample products
INSERT INTO public.products (merchant_id, sku, name, description, price_usd, cashback_rate, image_url) 
SELECT 
    m.id,
    'PREMIUM_ACCESS',
    'Premium Access',
    'Premium access to ' || m.name || ' services',
    CASE m.category
        WHEN 'AI' THEN 29.99
        WHEN 'CRYPTO' THEN 99.99
        WHEN 'COMMERCE' THEN 19.99
        WHEN 'DOMAIN' THEN 12.99
        WHEN 'MARKETING' THEN 49.99
        WHEN 'GAMING' THEN 9.99
        ELSE 24.99
    END,
    m.cashback_percentage,
    m.logo_url
FROM merchants m 
WHERE m.is_active = true
LIMIT 20;

-- Insert sample coffee products for restaurants
INSERT INTO public.products (merchant_id, sku, name, description, price_usd, cashback_rate, image_url)
SELECT 
    m.id,
    'COFFEE_' || UPPER(REPLACE(m.name, ' ', '_')),
    'Specialty Coffee',
    'Premium coffee blend from ' || m.name,
    CASE 
        WHEN RANDOM() < 0.3 THEN 4.50
        WHEN RANDOM() < 0.6 THEN 5.25
        ELSE 6.00
    END,
    CASE 
        WHEN RANDOM() < 0.3 THEN 3.0
        WHEN RANDOM() < 0.6 THEN 4.0
        ELSE 5.0
    END,
    'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400'
FROM merchants m 
WHERE m.category = 'COMMERCE' AND m.location IS NOT NULL
LIMIT 15;

-- Update existing cashback records to use new ROZO system
UPDATE public.cashback 
SET 
    amount_rozo = public.usd_to_rozo(amount),
    amount_usd = amount,
    type = CASE 
        WHEN type = 'cashback' THEN 'purchase_cashback'::cashback_type
        WHEN type = 'referral' THEN 'referral_bonus'::cashback_type
        WHEN type = 'bonus' THEN 'tier_bonus'::cashback_type
        WHEN type = 'promotion' THEN 'promotion'::cashback_type
        ELSE 'purchase_cashback'::cashback_type
    END;

-- Update user ROZO balances based on existing cashback
UPDATE public.profiles 
SET 
    total_cashback_rozo = (
        SELECT COALESCE(SUM(amount_rozo), 0) 
        FROM public.cashback 
        WHERE user_id = profiles.id
    ),
    available_cashback_rozo = (
        SELECT COALESCE(SUM(amount_rozo), 0) 
        FROM public.cashback 
        WHERE user_id = profiles.id AND status = 'available'
    ),
    used_cashback_rozo = (
        SELECT COALESCE(SUM(amount_rozo), 0) 
        FROM public.cashback 
        WHERE user_id = profiles.id AND status = 'used'
    );

-- Drop old reward-related columns and types after migration
ALTER TABLE public.cashback DROP COLUMN IF EXISTS amount;
DROP TYPE IF EXISTS reward_type CASCADE;
DROP TYPE IF EXISTS reward_status CASCADE;
