-- Stored procedures for payment confirmation

-- Function to confirm payment and create rewards atomically
CREATE OR REPLACE FUNCTION public.confirm_payment_with_rewards(
    p_intent_id UUID,
    p_transaction_hash TEXT,
    p_block_number BIGINT,
    p_gas_used BIGINT,
    p_from_address TEXT
)
RETURNS JSON AS $$
DECLARE
    v_intent payment_intents%ROWTYPE;
    v_transaction transactions%ROWTYPE;
    v_reward rewards%ROWTYPE;
    v_result JSON;
BEGIN
    -- Get payment intent
    SELECT * INTO v_intent
    FROM payment_intents
    WHERE id = p_intent_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment intent not found';
    END IF;
    
    -- Check if already confirmed
    IF v_intent.status = 'confirmed' THEN
        RAISE EXCEPTION 'Payment intent already confirmed';
    END IF;
    
    -- Check if expired
    IF v_intent.expires_at < NOW() THEN
        RAISE EXCEPTION 'Payment intent expired';
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id,
        merchant_id,
        transaction_hash,
        amount,
        currency,
        cashback_amount,
        cashback_percentage,
        status,
        to_address,
        from_address,
        chain_id,
        block_number,
        gas_used
    ) VALUES (
        v_intent.user_id,
        v_intent.merchant_id,
        p_transaction_hash,
        v_intent.amount,
        v_intent.currency,
        v_intent.cashback_amount,
        v_intent.cashback_percentage,
        'confirmed',
        v_intent.to_address,
        p_from_address,
        v_intent.chain_id,
        p_block_number,
        p_gas_used
    ) RETURNING * INTO v_transaction;
    
    -- Create cashback reward
    INSERT INTO rewards (
        user_id,
        transaction_id,
        type,
        amount,
        currency,
        status
    ) VALUES (
        v_intent.user_id,
        v_transaction.id,
        'cashback',
        v_intent.cashback_amount,
        v_intent.currency,
        'available'
    ) RETURNING * INTO v_reward;
    
    -- Update payment intent
    UPDATE payment_intents
    SET status = 'confirmed',
        transaction_id = v_transaction.id,
        updated_at = NOW()
    WHERE id = p_intent_id;
    
    -- Build result
    SELECT json_build_object(
        'transaction', row_to_json(v_transaction),
        'rewards', json_build_array(row_to_json(v_reward))
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim rewards
CREATE OR REPLACE FUNCTION public.claim_reward(
    p_reward_id UUID,
    p_user_id UUID,
    p_to_address TEXT,
    p_claim_tx_hash TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_reward rewards%ROWTYPE;
    v_result JSON;
BEGIN
    -- Get and lock reward
    SELECT * INTO v_reward
    FROM rewards
    WHERE id = p_reward_id AND user_id = p_user_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reward not found';
    END IF;
    
    -- Check if reward is available
    IF v_reward.status != 'available' THEN
        RAISE EXCEPTION 'Reward is not available for claiming';
    END IF;
    
    -- Check if reward is expired
    IF v_reward.expires_at IS NOT NULL AND v_reward.expires_at < NOW() THEN
        UPDATE rewards 
        SET status = 'expired', updated_at = NOW()
        WHERE id = p_reward_id;
        
        RAISE EXCEPTION 'Reward has expired';
    END IF;
    
    -- Claim reward
    UPDATE rewards
    SET status = 'claimed',
        claimed_at = NOW(),
        claim_transaction_hash = p_claim_tx_hash,
        updated_at = NOW()
    WHERE id = p_reward_id
    RETURNING * INTO v_reward;
    
    -- Build result
    SELECT json_build_object(
        'reward', row_to_json(v_reward),
        'amount', v_reward.amount,
        'currency', v_reward.currency,
        'transaction_hash', p_claim_tx_hash
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply referral code
CREATE OR REPLACE FUNCTION public.apply_referral_code(
    p_user_id UUID,
    p_referral_code TEXT
)
RETURNS JSON AS $$
DECLARE
    v_referrer_id UUID;
    v_referee_profile profiles%ROWTYPE;
    v_referrer_profile profiles%ROWTYPE;
    v_bonus_amount DECIMAL(20,6) := 10.00; -- $10 bonus
    v_referrer_bonus DECIMAL(20,6) := 5.00; -- $5 referrer bonus
    v_result JSON;
BEGIN
    -- Get referee profile
    SELECT * INTO v_referee_profile
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    -- Check if user already has a referrer
    IF v_referee_profile.referred_by IS NOT NULL THEN
        RAISE EXCEPTION 'User already has a referrer';
    END IF;
    
    -- Find referrer by code
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = p_referral_code AND id != p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid referral code';
    END IF;
    
    -- Get referrer profile
    SELECT * INTO v_referrer_profile
    FROM profiles
    WHERE id = v_referrer_id;
    
    -- Update referee profile with referrer
    UPDATE profiles
    SET referred_by = v_referrer_id,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create referral record
    INSERT INTO referrals (
        referrer_id,
        referee_id,
        referral_code,
        bonus_amount,
        referrer_bonus
    ) VALUES (
        v_referrer_id,
        p_user_id,
        p_referral_code,
        v_bonus_amount,
        v_referrer_bonus
    );
    
    -- Create bonus rewards
    INSERT INTO rewards (user_id, type, amount, currency, status, metadata)
    VALUES 
        (p_user_id, 'referral', v_bonus_amount, 'USDC', 'available', 
         json_build_object('referrer_username', v_referrer_profile.username, 'type', 'signup_bonus')),
        (v_referrer_id, 'referral', v_referrer_bonus, 'USDC', 'available',
         json_build_object('referee_username', v_referee_profile.username, 'type', 'referrer_bonus'));
    
    -- Build result
    SELECT json_build_object(
        'bonus_amount', v_bonus_amount,
        'currency', 'USDC',
        'referrer_bonus', v_referrer_bonus,
        'referrer_username', v_referrer_profile.username
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user tier based on cashback earned
CREATE OR REPLACE FUNCTION public.update_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_total_cashback DECIMAL(20,6);
    v_new_tier tier_type;
    v_current_tier tier_type;
BEGIN
    -- Get current tier and total cashback
    SELECT tier, total_cashback_earned INTO v_current_tier, v_total_cashback
    FROM profiles
    WHERE id = p_user_id;
    
    -- Determine new tier
    IF v_total_cashback >= 10000 THEN
        v_new_tier := 'platinum';
    ELSIF v_total_cashback >= 2500 THEN
        v_new_tier := 'gold';
    ELSIF v_total_cashback >= 500 THEN
        v_new_tier := 'silver';
    ELSE
        v_new_tier := 'bronze';
    END IF;
    
    -- Update tier if changed
    IF v_new_tier != v_current_tier THEN
        UPDATE profiles
        SET tier = v_new_tier,
            updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Create tier upgrade bonus
        IF v_new_tier > v_current_tier THEN
            INSERT INTO rewards (user_id, type, amount, currency, status, metadata)
            VALUES (
                p_user_id, 
                'bonus', 
                CASE 
                    WHEN v_new_tier = 'silver' THEN 25.00
                    WHEN v_new_tier = 'gold' THEN 100.00
                    WHEN v_new_tier = 'platinum' THEN 500.00
                    ELSE 0
                END,
                'USDC', 
                'available',
                json_build_object('type', 'tier_upgrade', 'from_tier', v_current_tier, 'to_tier', v_new_tier)
            );
        END IF;
    END IF;
    
    RETURN v_new_tier::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update tier when cashback totals change
CREATE OR REPLACE FUNCTION public.trigger_update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.update_user_tier(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_tier_on_cashback_change ON public.profiles;
CREATE TRIGGER update_tier_on_cashback_change
    AFTER UPDATE OF total_cashback_earned ON public.profiles
    FOR EACH ROW
    WHEN (OLD.total_cashback_earned IS DISTINCT FROM NEW.total_cashback_earned)
    EXECUTE FUNCTION public.trigger_update_user_tier();
