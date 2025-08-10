-- Create new tables with cb_hack_ prefix for the ROZO cashback system
-- This migration creates clean tables without affecting existing data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for the new tables
DO $$ BEGIN
    CREATE TYPE cb_hack_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cb_hack_transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cb_hack_cashback_status AS ENUM ('pending', 'available', 'used', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table for user data
CREATE TABLE IF NOT EXISTS cb_hack_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    tier cb_hack_tier DEFAULT 'bronze' NOT NULL,
    available_cashback_rozo INTEGER DEFAULT 0 NOT NULL,
    total_cashback_rozo INTEGER DEFAULT 0 NOT NULL,
    used_cashback_rozo INTEGER DEFAULT 0 NOT NULL,
    available_cashback_usd DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_cashback_usd DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    used_cashback_usd DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    spend_permission_authorized BOOLEAN DEFAULT FALSE,
    spend_permission_amount DECIMAL(10,2) DEFAULT 0.00,
    spend_permission_expiry TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT cb_hack_valid_cashback_amounts CHECK (
        available_cashback_rozo >= 0 AND 
        total_cashback_rozo >= 0 AND 
        used_cashback_rozo >= 0 AND
        available_cashback_usd >= 0 AND 
        total_cashback_usd >= 0 AND 
        used_cashback_usd >= 0
    )
);

-- Transactions table for all payment records
CREATE TABLE IF NOT EXISTS cb_hack_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES cb_hack_profiles(id) ON DELETE CASCADE,
    transaction_hash TEXT UNIQUE,
    receiver_address TEXT NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    cashback_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    status cb_hack_transaction_status DEFAULT 'pending' NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 8453, -- Base mainnet
    merchant_id TEXT,
    payment_method TEXT DEFAULT 'usdc',
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT cb_hack_valid_amount CHECK (amount_usd > 0),
    CONSTRAINT cb_hack_valid_cashback_rate CHECK (cashback_rate >= 0 AND cashback_rate <= 10000)
);

-- Cashback records table
CREATE TABLE IF NOT EXISTS cb_hack_cashback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES cb_hack_profiles(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES cb_hack_transactions(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'purchase_cashback', 'referral_bonus', etc.
    amount_rozo INTEGER NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'ROZO' NOT NULL,
    status cb_hack_cashback_status DEFAULT 'pending' NOT NULL,
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    used_in_transaction_id UUID REFERENCES cb_hack_transactions(id),
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT cb_hack_valid_cashback_amount CHECK (amount_rozo != 0)
);

-- Spend permissions table
CREATE TABLE IF NOT EXISTS cb_hack_spend_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES cb_hack_profiles(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    expiry TIMESTAMPTZ NOT NULL,
    signature TEXT,
    transaction_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT cb_hack_valid_permission_amount CHECK (amount_usd > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cb_hack_profiles_wallet ON cb_hack_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_cb_hack_transactions_user ON cb_hack_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cb_hack_transactions_hash ON cb_hack_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_cb_hack_transactions_status ON cb_hack_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cb_hack_cashback_user ON cb_hack_cashback(user_id);
CREATE INDEX IF NOT EXISTS idx_cb_hack_cashback_status ON cb_hack_cashback(status);
CREATE INDEX IF NOT EXISTS idx_cb_hack_cashback_transaction ON cb_hack_cashback(transaction_id);
CREATE INDEX IF NOT EXISTS idx_cb_hack_spend_permissions_user ON cb_hack_spend_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_cb_hack_spend_permissions_wallet ON cb_hack_spend_permissions(wallet_address);

-- Function to process direct payments with new table structure
CREATE OR REPLACE FUNCTION cb_hack_process_direct_payment(
  p_user_wallet_address TEXT,
  p_receiver TEXT,
  p_amount_usd NUMERIC,
  p_cashback_rozo INTEGER,
  p_cashback_rate NUMERIC,
  p_tx_hash TEXT,
  p_chain_id INTEGER DEFAULT 8453
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_transaction_id UUID;
  v_cashback_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_cashback_usd NUMERIC;
BEGIN
  -- Start transaction
  BEGIN
    -- Get or create user profile
    SELECT id, available_cashback_rozo INTO v_user_id, v_current_balance
    FROM cb_hack_profiles 
    WHERE wallet_address = p_user_wallet_address;
    
    -- Create profile if doesn't exist
    IF v_user_id IS NULL THEN
      INSERT INTO cb_hack_profiles (
        wallet_address,
        tier,
        available_cashback_rozo,
        total_cashback_rozo,
        used_cashback_rozo,
        available_cashback_usd,
        total_cashback_usd,
        used_cashback_usd
      ) VALUES (
        p_user_wallet_address,
        'bronze',
        0, 0, 0, 0.00, 0.00, 0.00
      ) RETURNING id, available_cashback_rozo INTO v_user_id, v_current_balance;
      
      RAISE NOTICE 'Created new profile for user: %', v_user_id;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_cashback_rozo;
    v_cashback_usd := p_cashback_rozo * 0.01; -- 1 ROZO = $0.01

    -- Create transaction record
    INSERT INTO cb_hack_transactions (
      id,
      user_id,
      transaction_hash,
      receiver_address,
      amount_usd,
      cashback_rate,
      status,
      chain_id,
      merchant_id,
      payment_method,
      metadata
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      p_tx_hash,
      p_receiver,
      p_amount_usd,
      p_cashback_rate,
      'completed',
      p_chain_id,
      'ns-cafe',
      'usdc',
      jsonb_build_object(
        'payment_type', 'direct_usdc',
        'cashback_earned_rozo', p_cashback_rozo,
        'cashback_earned_usd', v_cashback_usd
      )
    ) RETURNING id INTO v_transaction_id;

    -- Create cashback record
    INSERT INTO cb_hack_cashback (
      id,
      user_id,
      transaction_id,
      type,
      amount_rozo,
      amount_usd,
      currency,
      status,
      metadata
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_transaction_id,
      'purchase_cashback',
      p_cashback_rozo,
      v_cashback_usd,
      'ROZO',
      'available',
      jsonb_build_object(
        'payment_type', 'direct_usdc',
        'receiver', p_receiver,
        'original_amount_usd', p_amount_usd
      )
    ) RETURNING id INTO v_cashback_id;

    -- Update user profile with new balances
    UPDATE cb_hack_profiles SET 
      available_cashback_rozo = v_new_balance,
      total_cashback_rozo = total_cashback_rozo + p_cashback_rozo,
      available_cashback_usd = available_cashback_usd + v_cashback_usd,
      total_cashback_usd = total_cashback_usd + v_cashback_usd,
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Return success result
    RETURN json_build_object(
      'transaction_id', v_transaction_id,
      'user_id', v_user_id,
      'cashback_id', v_cashback_id,
      'amount_paid_usd', p_amount_usd,
      'cashback_earned_rozo', p_cashback_rozo,
      'cashback_earned_usd', v_cashback_usd,
      'new_balance_rozo', v_new_balance,
      'status', 'completed',
      'created_at', NOW()
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback and return error
    RAISE EXCEPTION 'Failed to process payment: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user cashback balance
CREATE OR REPLACE FUNCTION cb_hack_get_user_balance(p_wallet_address TEXT)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_tier_multiplier NUMERIC;
BEGIN
  SELECT * INTO v_profile
  FROM cb_hack_profiles
  WHERE wallet_address = p_wallet_address;
  
  -- If profile doesn't exist, create it
  IF v_profile IS NULL THEN
    INSERT INTO cb_hack_profiles (
      wallet_address,
      tier,
      available_cashback_rozo,
      total_cashback_rozo,
      used_cashback_rozo,
      available_cashback_usd,
      total_cashback_usd,
      used_cashback_usd
    ) VALUES (
      p_wallet_address,
      'bronze',
      0, 0, 0, 0.00, 0.00, 0.00
    ) RETURNING * INTO v_profile;
  END IF;
  
  -- Get tier multiplier
  v_tier_multiplier := CASE v_profile.tier
    WHEN 'bronze' THEN 1.0
    WHEN 'silver' THEN 1.2
    WHEN 'gold' THEN 1.5
    WHEN 'platinum' THEN 2.0
    ELSE 1.0
  END;
  
  RETURN json_build_object(
    'available_cashback_rozo', v_profile.available_cashback_rozo,
    'total_cashback_rozo', v_profile.total_cashback_rozo,
    'used_cashback_rozo', v_profile.used_cashback_rozo,
    'available_cashback_usd', v_profile.available_cashback_usd,
    'total_cashback_usd', v_profile.total_cashback_usd,
    'used_cashback_usd', v_profile.used_cashback_usd,
    'current_tier', v_profile.tier,
    'tier_multiplier', v_tier_multiplier,
    'conversion_rate', '1 ROZO = $0.01 USD'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update spend permission
CREATE OR REPLACE FUNCTION cb_hack_update_spend_permission(
  p_wallet_address TEXT,
  p_amount_usd NUMERIC,
  p_expiry TIMESTAMPTZ,
  p_signature TEXT DEFAULT NULL,
  p_tx_hash TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_permission_id UUID;
BEGIN
  -- Get or create user profile
  SELECT id INTO v_user_id
  FROM cb_hack_profiles
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    INSERT INTO cb_hack_profiles (
      wallet_address,
      tier,
      available_cashback_rozo,
      total_cashback_rozo,
      used_cashback_rozo,
      available_cashback_usd,
      total_cashback_usd,
      used_cashback_usd
    ) VALUES (
      p_wallet_address,
      'bronze',
      0, 0, 0, 0.00, 0.00, 0.00
    ) RETURNING id INTO v_user_id;
  END IF;
  
  -- Deactivate old permissions
  UPDATE cb_hack_spend_permissions 
  SET is_active = FALSE 
  WHERE user_id = v_user_id AND is_active = TRUE;
  
  -- Create new permission
  INSERT INTO cb_hack_spend_permissions (
    user_id,
    wallet_address,
    amount_usd,
    expiry,
    signature,
    transaction_hash,
    is_active
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_amount_usd,
    p_expiry,
    p_signature,
    p_tx_hash,
    TRUE
  ) RETURNING id INTO v_permission_id;
  
  -- Update profile
  UPDATE cb_hack_profiles SET
    spend_permission_authorized = TRUE,
    spend_permission_amount = p_amount_usd,
    spend_permission_expiry = p_expiry,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RETURN json_build_object(
    'permission_id', v_permission_id,
    'user_id', v_user_id,
    'authorized', TRUE,
    'amount_usd', p_amount_usd,
    'expiry', p_expiry,
    'status', 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for authenticated users
GRANT ALL ON cb_hack_profiles TO authenticated;
GRANT ALL ON cb_hack_transactions TO authenticated;
GRANT ALL ON cb_hack_cashback TO authenticated;
GRANT ALL ON cb_hack_spend_permissions TO authenticated;

GRANT EXECUTE ON FUNCTION cb_hack_process_direct_payment TO authenticated;
GRANT EXECUTE ON FUNCTION cb_hack_get_user_balance TO authenticated;
GRANT EXECUTE ON FUNCTION cb_hack_update_spend_permission TO authenticated;

-- Enable RLS (Row Level Security) - Optional for better security
ALTER TABLE cb_hack_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_hack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_hack_cashback ENABLE ROW LEVEL SECURITY;
ALTER TABLE cb_hack_spend_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Users can only access their own data
CREATE POLICY "Users can view own profile" ON cb_hack_profiles FOR ALL USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');
CREATE POLICY "Users can view own transactions" ON cb_hack_transactions FOR ALL USING (user_id = (SELECT id FROM cb_hack_profiles WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'));
CREATE POLICY "Users can view own cashback" ON cb_hack_cashback FOR ALL USING (user_id = (SELECT id FROM cb_hack_profiles WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'));
CREATE POLICY "Users can view own permissions" ON cb_hack_spend_permissions FOR ALL USING (user_id = (SELECT id FROM cb_hack_profiles WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'));

-- Insert some sample data for testing
INSERT INTO cb_hack_profiles (
  id,
  wallet_address,
  tier,
  available_cashback_rozo,
  total_cashback_rozo,
  used_cashback_rozo,
  available_cashback_usd,
  total_cashback_usd,
  used_cashback_usd
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  'bronze',
  0,
  0,
  0,
  0.00,
  0.00,
  0.00
) ON CONFLICT (wallet_address) DO NOTHING;
