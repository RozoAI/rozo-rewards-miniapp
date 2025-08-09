-- CDP Payment System Migration
-- Adds support for Coinbase CDP Spend Permissions and internalized payment processing

-- Enhance profiles table for CDP spend permissions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  spend_permission_authorized BOOLEAN DEFAULT false,
  spend_permission_allowance NUMERIC DEFAULT 0,
  spend_permission_expiry TIMESTAMP,
  last_spend_permission_check TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_spend_permission ON profiles(spend_permission_authorized, spend_permission_expiry);

-- Enhance transactions table for new payment methods
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  payment_method VARCHAR(20) CHECK (payment_method IN ('direct_usdc', 'rozo_credit')) DEFAULT 'direct_usdc',
  rozo_cost INTEGER DEFAULT 0,
  internal_payment BOOLEAN DEFAULT false,
  cdp_permission_used BOOLEAN DEFAULT false,
  nonce VARCHAR(100) UNIQUE,
  user_signature TEXT;

-- Add indexes for new transaction fields
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_nonce ON transactions(nonce) WHERE nonce IS NOT NULL;

-- Function to process ROZO credit payments
CREATE OR REPLACE FUNCTION process_rozo_credit_payment(
  p_user_id UUID,
  p_receiver VARCHAR(42),
  p_amount_usd NUMERIC,
  p_rozo_cost INTEGER,
  p_cashback_rate NUMERIC,
  p_nonce VARCHAR(100)
)
RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_available_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock user profile to prevent concurrent balance updates
    SELECT available_cashback_rozo INTO v_available_balance
    FROM profiles 
    WHERE id = p_user_id
    FOR UPDATE;

    -- Check if user has sufficient ROZO balance
    IF v_available_balance < p_rozo_cost THEN
      RAISE EXCEPTION 'Insufficient ROZO balance. Required: %, Available: %', p_rozo_cost, v_available_balance;
    END IF;

    -- Check for duplicate nonce
    IF EXISTS (SELECT 1 FROM transactions WHERE nonce = p_nonce) THEN
      RAISE EXCEPTION 'Duplicate payment nonce: %', p_nonce;
    END IF;

    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();

    -- Deduct ROZO from user balance
    v_new_balance := v_available_balance - p_rozo_cost;

    UPDATE profiles SET
      available_cashback_rozo = v_new_balance,
      used_cashback_rozo = used_cashback_rozo + p_rozo_cost,
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Insert transaction record
    INSERT INTO transactions (
      id,
      user_id,
      amount,
      currency,
      status,
      payment_method,
      rozo_cost,
      internal_payment,
      to_address,
      cashback_amount,
      cashback_percentage,
      nonce,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      v_transaction_id,
      p_user_id,
      p_amount_usd,
      'USD',
      'completed',
      'rozo_credit',
      p_rozo_cost,
      true,
      p_receiver,
      0, -- No additional cashback for credit payments
      p_cashback_rate,
      p_nonce,
      jsonb_build_object(
        'payment_type', 'rozo_credit',
        'rozo_cost', p_rozo_cost,
        'receiver', p_receiver
      ),
      NOW(),
      NOW()
    );

    -- Record cashback usage
    INSERT INTO cashback (
      id,
      user_id,
      transaction_id,
      type,
      amount_rozo,
      amount_usd,
      currency,
      status,
      used_at,
      used_in_transaction_id,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      v_transaction_id,
      'purchase_cashback',
      -p_rozo_cost, -- Negative for usage
      -p_amount_usd,
      'USD',
      'used',
      NOW(),
      v_transaction_id,
      jsonb_build_object(
        'payment_type', 'rozo_credit',
        'receiver', p_receiver
      ),
      NOW(),
      NOW()
    );

    -- Return result
    RETURN json_build_object(
      'transaction_id', v_transaction_id,
      'new_balance', v_new_balance,
      'rozo_used', p_rozo_cost
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process direct USDC payments with automatic cashback
CREATE OR REPLACE FUNCTION process_direct_payment(
  p_user_id UUID,
  p_receiver VARCHAR(42),
  p_amount_usd NUMERIC,
  p_cashback_rozo INTEGER,
  p_cashback_rate NUMERIC,
  p_tx_hash VARCHAR(66),
  p_chain_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_transaction_id UUID;
  v_cashback_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Start transaction
  BEGIN
    -- Lock user profile to prevent concurrent balance updates
    SELECT available_cashback_rozo INTO v_current_balance
    FROM profiles 
    WHERE id = p_user_id
    FOR UPDATE;

    -- Generate IDs
    v_transaction_id := gen_random_uuid();
    v_cashback_id := gen_random_uuid();

    -- Calculate new balance
    v_new_balance := v_current_balance + p_cashback_rozo;

    -- Update user ROZO balance
    UPDATE profiles SET
      available_cashback_rozo = v_new_balance,
      total_cashback_rozo = total_cashback_rozo + p_cashback_rozo,
      total_cashback_earned = total_cashback_earned + (p_cashback_rozo / 100.0), -- USD equivalent
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Insert transaction record
    INSERT INTO transactions (
      id,
      user_id,
      amount,
      currency,
      status,
      payment_method,
      cdp_permission_used,
      to_address,
      tx_hash,
      chain_id,
      cashback_amount,
      cashback_percentage,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      v_transaction_id,
      p_user_id,
      p_amount_usd,
      'USD',
      'completed',
      'direct_usdc',
      true,
      p_receiver,
      p_tx_hash,
      p_chain_id,
      p_cashback_rozo / 100.0, -- USD equivalent
      p_cashback_rate,
      jsonb_build_object(
        'payment_type', 'direct_usdc',
        'rozo_earned', p_cashback_rozo,
        'receiver', p_receiver,
        'tx_hash', p_tx_hash
      ),
      NOW(),
      NOW()
    );

    -- Record cashback earning
    INSERT INTO cashback (
      id,
      user_id,
      transaction_id,
      type,
      amount_rozo,
      amount_usd,
      currency,
      status,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      v_cashback_id,
      p_user_id,
      v_transaction_id,
      'purchase_cashback',
      p_cashback_rozo,
      p_cashback_rozo / 100.0,
      'USD',
      'available',
      jsonb_build_object(
        'payment_type', 'direct_usdc',
        'cashback_rate', p_cashback_rate,
        'receiver', p_receiver,
        'tx_hash', p_tx_hash
      ),
      NOW(),
      NOW()
    );

    -- Return result
    RETURN json_build_object(
      'transaction_id', v_transaction_id,
      'cashback_id', v_cashback_id,
      'new_balance', v_new_balance,
      'rozo_earned', p_cashback_rozo
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update CDP spend permission status
CREATE OR REPLACE FUNCTION update_spend_permission(
  p_user_id UUID,
  p_authorized BOOLEAN,
  p_allowance NUMERIC,
  p_expiry TIMESTAMP
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET
    spend_permission_authorized = p_authorized,
    spend_permission_allowance = p_allowance,
    spend_permission_expiry = p_expiry,
    last_spend_permission_check = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user's payment eligibility
CREATE OR REPLACE FUNCTION check_payment_eligibility(
  p_user_id UUID,
  p_amount_usd NUMERIC,
  p_is_using_credit BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_profile RECORD;
  v_rozo_cost INTEGER;
  v_result JSON;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'eligible', false,
      'reason', 'User profile not found'
    );
  END IF;

  IF p_is_using_credit THEN
    -- Check ROZO credit eligibility
    v_rozo_cost := FLOOR(p_amount_usd * 100);
    
    IF v_profile.available_cashback_rozo < v_rozo_cost THEN
      RETURN json_build_object(
        'eligible', false,
        'reason', 'Insufficient ROZO balance',
        'required', v_rozo_cost,
        'available', v_profile.available_cashback_rozo
      );
    END IF;

    RETURN json_build_object(
      'eligible', true,
      'payment_method', 'rozo_credit',
      'rozo_cost', v_rozo_cost,
      'remaining_balance', v_profile.available_cashback_rozo - v_rozo_cost
    );
  ELSE
    -- Check CDP spend permission eligibility
    IF NOT v_profile.spend_permission_authorized THEN
      RETURN json_build_object(
        'eligible', false,
        'reason', 'CDP Spend Permission not authorized'
      );
    END IF;

    IF v_profile.spend_permission_expiry < NOW() THEN
      RETURN json_build_object(
        'eligible', false,
        'reason', 'CDP Spend Permission expired'
      );
    END IF;

    IF v_profile.spend_permission_allowance < p_amount_usd THEN
      RETURN json_build_object(
        'eligible', false,
        'reason', 'CDP Spend Permission allowance insufficient',
        'required', p_amount_usd,
        'allowance', v_profile.spend_permission_allowance
      );
    END IF;

    RETURN json_build_object(
      'eligible', true,
      'payment_method', 'direct_usdc',
      'allowance_remaining', v_profile.spend_permission_allowance - p_amount_usd
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION process_rozo_credit_payment TO authenticated;
GRANT EXECUTE ON FUNCTION process_direct_payment TO authenticated;
GRANT EXECUTE ON FUNCTION update_spend_permission TO authenticated;
GRANT EXECUTE ON FUNCTION check_payment_eligibility TO authenticated;
