-- Create a test user profile for wallet: 0x1aB0cD80B428FF8d77869866627a3f5bf8E717Ebf
-- User ID: user_717Ebf

INSERT INTO public.profiles (
    id, 
    wallet_address, 
    username, 
    total_cashback_earned, 
    total_cashback_claimed, 
    tier, 
    referral_code, 
    metadata
) VALUES (
    'user_717Ebf',
    '0x1aB0cD80B428FF8d77869866627a3f5bf8E717Ebf',
    'TestUser717Ebf',
    0,
    0,
    'bronze',
    'ROZOTST717',
    '{"created_via": "manual_test", "wallet_connected": true}'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
    wallet_address = EXCLUDED.wallet_address,
    updated_at = NOW();

-- Also create some test ROZO balance (rewards)
INSERT INTO public.rewards (
    user_id,
    type,
    amount,
    currency,
    status,
    metadata
) VALUES (
    'user_717Ebf',
    'bonus',
    1000,  -- 1000 ROZO = $10 USD
    'ROZO',
    'available',
    '{"test_bonus": true, "reason": "Welcome bonus"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Create NS Cafe merchant if it doesn't exist
INSERT INTO public.merchants (
    name,
    category,
    description,
    website_url,
    domain,
    cashback_percentage,
    is_featured,
    location
) VALUES (
    'NS Cafe',
    'COMMERCE',
    'Neighborhood coffee shop with great pastries and free WiFi',
    'https://nscafe.example.com/',
    'nscafe.example.com',
    10.0,  -- 10% cashback
    true,
    '{"address_line1": "123 Coffee Street", "formatted_address": "123 Coffee Street, Coffee City, CC 12345", "lat": 40.7128, "lon": -74.0060}'::jsonb
) ON CONFLICT (domain) DO UPDATE SET
    cashback_percentage = EXCLUDED.cashback_percentage,
    updated_at = NOW();
