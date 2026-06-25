-- Add stellar_address support to the cashback / points system.
--
-- Context: Stellar wallets (56-char addresses starting with 'G') were previously
-- written into the evm_address column because no stellar column existed. This
-- migration adds a dedicated stellar_address column to both points_userbalance
-- and points_transactions, backfills the mislabeled rows, and extends the
-- process_cashback RPC to accept p_stellar_address.
--
-- Note: a 44-char Solana base58 address that happens to start with 'G' is
-- explicitly excluded from the backfill by the length(...) = 56 guard.

BEGIN;

-- 1. Add the new column to both tables.
ALTER TABLE points_userbalance  ADD COLUMN IF NOT EXISTS stellar_address character varying;
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS stellar_address character varying;

-- 1b. Extend the "at least one identifier" check to include stellar_address,
--     otherwise clearing evm_address in step 2 would violate the old constraint.
ALTER TABLE points_userbalance DROP CONSTRAINT IF EXISTS check_at_least_one_identifier;
ALTER TABLE points_userbalance ADD  CONSTRAINT check_at_least_one_identifier
    CHECK (rozo_id IS NOT NULL OR sol_address IS NOT NULL OR evm_address IS NOT NULL OR stellar_address IS NOT NULL);

-- 2. Backfill: move Stellar values out of evm_address into stellar_address.
--    Stellar public keys are exactly 56 chars and start with 'G' (Ed25519 G...).
UPDATE points_userbalance
SET    stellar_address = evm_address,
       evm_address     = NULL,
       updated_at      = NOW()
WHERE  evm_address LIKE 'G%'
  AND  length(evm_address) = 56;

UPDATE points_transactions
SET    stellar_address = evm_address,
       evm_address     = NULL
WHERE  evm_address LIKE 'G%'
  AND  length(evm_address) = 56;

-- 3. Extend process_cashback with p_stellar_address.
--    The new parameter is appended LAST so existing positional/named callers
--    that omit it keep working (it defaults to NULL).
CREATE OR REPLACE FUNCTION public.process_cashback(
    p_rozo_id           character varying,
    p_sol_address       character varying,
    p_evm_address       character varying,
    p_merchant_id       character varying,
    p_amount_in_usd     numeric,
    p_cashback_ratio    numeric,
    p_payment_reference character varying,
    p_payment_method    character varying,
    p_stellar_address   character varying DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_points DECIMAL(20,6);
    v_user_balance_id UUID;
    v_transaction_id UUID;
    v_existing_transaction UUID;
    v_existing_balance_id UUID;
BEGIN
    -- Check if this payment_reference already exists (prevent duplicate processing)
    SELECT id INTO v_existing_transaction
    FROM points_transactions
    WHERE payment_reference = p_payment_reference;

    IF v_existing_transaction IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Payment reference already processed',
            'transaction_id', v_existing_transaction
        );
    END IF;

    -- Calculate points (cashback amount)
    v_points := p_amount_in_usd * p_cashback_ratio;

    -- Log the values
    RAISE LOG 'Cashback calculation - Amount: %, Ratio: %, Points: %',
               p_amount_in_usd, p_cashback_ratio, v_points;

    -- Insert transaction record
    INSERT INTO points_transactions (
        rozo_id, sol_address, evm_address, stellar_address, merchant_id,
        amount_in_usd, points, cashback_ratio,
        payment_reference, payment_method
    ) VALUES (
        p_rozo_id, p_sol_address, p_evm_address, p_stellar_address, p_merchant_id,
        p_amount_in_usd, v_points, p_cashback_ratio,
        p_payment_reference, p_payment_method
    ) RETURNING id INTO v_transaction_id;

    -- Find existing user balance by any of the identifiers
    SELECT id INTO v_existing_balance_id
    FROM points_userbalance
    WHERE (p_rozo_id         IS NOT NULL AND rozo_id         = p_rozo_id)
       OR (p_sol_address     IS NOT NULL AND sol_address     = p_sol_address)
       OR (p_evm_address     IS NOT NULL AND evm_address     = p_evm_address)
       OR (p_stellar_address IS NOT NULL AND stellar_address = p_stellar_address);

    -- If user balance exists, update it
    IF v_existing_balance_id IS NOT NULL THEN
        UPDATE points_userbalance
        SET points = points + v_points,
            updated_at = NOW()
        WHERE id = v_existing_balance_id;

        v_user_balance_id := v_existing_balance_id;
    ELSE
        -- Create new user balance record
        INSERT INTO points_userbalance (
            rozo_id, sol_address, evm_address, stellar_address, points
        ) VALUES (
            p_rozo_id, p_sol_address, p_evm_address, p_stellar_address, v_points
        ) RETURNING id INTO v_user_balance_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'user_balance_id', v_user_balance_id,
        'points_earned', v_points,
        'amount_in_usd', p_amount_in_usd,
        'cashback_ratio', p_cashback_ratio
    );
END;
$function$;

COMMIT;
