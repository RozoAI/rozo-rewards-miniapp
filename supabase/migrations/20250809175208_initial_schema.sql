-- Initial schema for Rozo Rewards MiniApp
-- AI promo and cashback platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE tier_type AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE merchant_category AS ENUM ('AI', 'CRYPTO', 'COMMERCE', 'DOMAIN', 'MARKETING', 'GAMING');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE reward_type AS ENUM ('cashback', 'referral', 'bonus', 'promotion');
CREATE TYPE reward_status AS ENUM ('pending', 'available', 'claimed', 'expired');
CREATE TYPE payment_intent_status AS ENUM ('created', 'confirmed', 'expired', 'cancelled');
CREATE TYPE referral_status AS ENUM ('active', 'completed', 'cancelled');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    total_cashback_earned DECIMAL(20,6) DEFAULT 0 NOT NULL,
    total_cashback_claimed DECIMAL(20,6) DEFAULT 0 NOT NULL,
    tier tier_type DEFAULT 'bronze' NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES public.profiles(id),
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_cashback_earned CHECK (total_cashback_earned >= 0),
    CONSTRAINT valid_cashback_claimed CHECK (total_cashback_claimed >= 0),
    CONSTRAINT valid_wallet_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Create merchants table
CREATE TABLE public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category merchant_category NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    location JSONB, -- {address_line1, address_line2, formatted_address, lat, lon}
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_cashback_percentage CHECK (cashback_percentage >= 0 AND cashback_percentage <= 100),
    CONSTRAINT valid_website_url CHECK (website_url ~ '^https?://.*'),
    CONSTRAINT valid_logo_url CHECK (logo_url IS NULL OR logo_url ~ '^https?://.*')
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE RESTRICT NOT NULL,
    transaction_hash TEXT UNIQUE NOT NULL,
    amount DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    cashback_amount DECIMAL(20,6) NOT NULL DEFAULT 0,
    cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    status transaction_status DEFAULT 'pending' NOT NULL,
    to_address TEXT NOT NULL,
    from_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    block_number BIGINT,
    gas_used BIGINT,
    gas_price BIGINT,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_cashback_amount CHECK (cashback_amount >= 0),
    CONSTRAINT valid_cashback_percentage CHECK (cashback_percentage >= 0 AND cashback_percentage <= 100),
    CONSTRAINT valid_transaction_hash CHECK (transaction_hash ~ '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT valid_to_address CHECK (to_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_from_address CHECK (from_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_chain_id CHECK (chain_id > 0),
    CONSTRAINT valid_block_number CHECK (block_number IS NULL OR block_number > 0),
    CONSTRAINT valid_gas_used CHECK (gas_used IS NULL OR gas_used > 0),
    CONSTRAINT valid_gas_price CHECK (gas_price IS NULL OR gas_price > 0)
);

-- Create rewards table
CREATE TABLE public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    type reward_type NOT NULL,
    amount DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    status reward_status DEFAULT 'pending' NOT NULL,
    claimed_at TIMESTAMPTZ,
    claim_transaction_hash TEXT,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_claim_hash CHECK (claim_transaction_hash IS NULL OR claim_transaction_hash ~ '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT valid_claimed_at CHECK ((status = 'claimed' AND claimed_at IS NOT NULL) OR (status != 'claimed' AND claimed_at IS NULL)),
    CONSTRAINT valid_expires_at CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Create payment_intents table
CREATE TABLE public.payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE RESTRICT NOT NULL,
    amount DECIMAL(20,6) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USDC',
    chain_id INTEGER NOT NULL,
    to_address TEXT NOT NULL,
    cashback_amount DECIMAL(20,6) NOT NULL,
    cashback_percentage DECIMAL(5,2) NOT NULL,
    status payment_intent_status DEFAULT 'created' NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_cashback_amount CHECK (cashback_amount >= 0),
    CONSTRAINT valid_cashback_percentage CHECK (cashback_percentage >= 0 AND cashback_percentage <= 100),
    CONSTRAINT valid_to_address CHECK (to_address ~ '^0x[a-fA-F0-9]{40}$'),
    CONSTRAINT valid_chain_id CHECK (chain_id > 0),
    CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Create referrals table
CREATE TABLE public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    referral_code TEXT NOT NULL,
    bonus_amount DECIMAL(20,6) DEFAULT 0 NOT NULL,
    referrer_bonus DECIMAL(20,6) DEFAULT 0 NOT NULL,
    status referral_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_bonus_amount CHECK (bonus_amount >= 0),
    CONSTRAINT valid_referrer_bonus CHECK (referrer_bonus >= 0),
    CONSTRAINT different_users CHECK (referrer_id != referee_id),
    UNIQUE(referrer_id, referee_id)
);

-- Create indexes for performance
CREATE INDEX idx_profiles_wallet_address ON public.profiles(wallet_address);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_profiles_tier ON public.profiles(tier);

CREATE INDEX idx_merchants_category ON public.merchants(category);
CREATE INDEX idx_merchants_domain ON public.merchants(domain);
CREATE INDEX idx_merchants_featured ON public.merchants(is_featured) WHERE is_featured = true;
CREATE INDEX idx_merchants_active ON public.merchants(is_active) WHERE is_active = true;

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_merchant_id ON public.transactions(merchant_id);
CREATE INDEX idx_transactions_hash ON public.transactions(transaction_hash);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_chain_id ON public.transactions(chain_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);
CREATE INDEX idx_rewards_transaction_id ON public.rewards(transaction_id);
CREATE INDEX idx_rewards_status ON public.rewards(status);
CREATE INDEX idx_rewards_type ON public.rewards(type);
CREATE INDEX idx_rewards_expires_at ON public.rewards(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_payment_intents_user_id ON public.payment_intents(user_id);
CREATE INDEX idx_payment_intents_merchant_id ON public.payment_intents(merchant_id);
CREATE INDEX idx_payment_intents_status ON public.payment_intents(status);
CREATE INDEX idx_payment_intents_expires_at ON public.payment_intents(expires_at);

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id ON public.referrals(referee_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Merchants policies (public read access for active merchants)
CREATE POLICY "Anyone can view active merchants" ON public.merchants
    FOR SELECT USING (is_active = true);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rewards policies
CREATE POLICY "Users can view own rewards" ON public.rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards" ON public.rewards
    FOR UPDATE USING (auth.uid() = user_id);

-- Payment intents policies
CREATE POLICY "Users can view own payment intents" ON public.payment_intents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment intents" ON public.payment_intents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Referrals policies
CREATE POLICY "Users can view referrals they're involved in" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can insert referrals where they're the referee" ON public.referrals
    FOR INSERT WITH CHECK (auth.uid() = referee_id);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER merchants_updated_at BEFORE UPDATE ON public.merchants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER rewards_updated_at BEFORE UPDATE ON public.rewards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER payment_intents_updated_at BEFORE UPDATE ON public.payment_intents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to generate referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := 'ROZO';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- Generate unique referral code
    LOOP
        new_referral_code := public.generate_referral_code();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_referral_code);
    END LOOP;

    -- Insert profile for new user
    INSERT INTO public.profiles (id, wallet_address, referral_code)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'wallet_address',
        new_referral_code
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update cashback totals
CREATE OR REPLACE FUNCTION public.update_user_cashback_totals()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update total_cashback_earned when new rewards are created
        UPDATE public.profiles 
        SET total_cashback_earned = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM public.rewards 
            WHERE user_id = NEW.user_id AND type = 'cashback'
        )
        WHERE id = NEW.user_id;
        
        -- Update total_cashback_claimed when rewards are claimed
        IF NEW.status = 'claimed' AND (TG_OP = 'INSERT' OR OLD.status != 'claimed') THEN
            UPDATE public.profiles 
            SET total_cashback_claimed = (
                SELECT COALESCE(SUM(amount), 0) 
                FROM public.rewards 
                WHERE user_id = NEW.user_id AND status = 'claimed'
            )
            WHERE id = NEW.user_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for cashback totals
CREATE TRIGGER update_cashback_totals
    AFTER INSERT OR UPDATE ON public.rewards
    FOR EACH ROW EXECUTE FUNCTION public.update_user_cashback_totals();

-- Insert sample merchants data from existing JSON files
INSERT INTO public.merchants (name, category, description, logo_url, website_url, domain, cashback_percentage, is_featured) VALUES
    ('OpenRouter', 'AI', 'A unified API and marketplace to access hundreds of AI models across providers with routing, fallbacks, pricing insights, and developer docs.', 'https://openrouter.ai/favicon.ico', 'https://openrouter.ai/', 'openrouter.ai', 5.0, true),
    ('Civitai', 'AI', 'A community and marketplace to discover, share, and generate with Stable Diffusion/Flux models and other open‑source generative AI resources.', 'https://civitai.com/favicon.ico', 'https://civitai.com/', 'civitai.com', 4.5, true),
    ('Venice', 'AI', 'Privacy‑first AI chat client offering access to leading open‑source LLMs and image models with fewer content restrictions and local‑first options.', 'https://venice.ai/favicon.ico', 'https://venice.ai/', 'venice.ai', 6.0, true),
    ('Compass Mining', 'CRYPTO', 'Bitcoin‑first company that sources ASICs and provides managed hosting across facilities with uptime SLAs and account tools.', 'https://compassmining.io/favicon.ico', 'https://compassmining.io/', 'compassmining.io', 3.0, false),
    ('Whop', 'COMMERCE', 'Platform to sell digital products, communities, and software with payments, access control, and a discovery marketplace.', 'https://whop.com/favicon.ico', 'https://whop.com/', 'whop.com', 7.5, true),
    ('Porkbun', 'DOMAIN', 'ICANN‑accredited domain name registrar offering low‑cost domains, email, SSL, and a simple control panel.', 'https://porkbun.com/favicon.ico', 'https://porkbun.com/', 'porkbun.com', 2.5, false),
    ('Buzzoid', 'MARKETING', 'Service selling Instagram followers, likes, and views with instant delivery packages and 24/7 support.', 'https://buzzoid.com/favicon.ico', 'https://buzzoid.com/', 'buzzoid.com', 8.0, false),
    ('OwO Bot', 'GAMING', 'Popular Discord bot with hunting, battling, pets, gambling mini‑games, and leaderboards to engage server communities.', 'https://owobot.com/favicon.ico', 'https://owobot.com/', 'owobot.com', 4.0, false);

-- Insert sample restaurant merchants from coffee data
INSERT INTO public.merchants (name, category, description, website_url, domain, cashback_percentage, is_featured, location) VALUES
    ('Prevail Union | BHM', 'COMMERCE', 'Coffee shop and community space in Birmingham', 'https://prevailunion.com/', 'prevailunion.com', 3.5, true, 
     '{"address_line1": "420 20th Street North", "address_line2": "Birmingham, AL 35203, United States of America", "formatted_address": "420 20th Street North, Birmingham, AL 35203, United States of America", "lat": 33.5173247318592, "lon": -86.80769080498851}'::jsonb),
    ('Lions Milk', 'COMMERCE', 'Artisanal coffee roaster in Brooklyn', 'https://lionsmilk.com/', 'lionsmilk.com', 4.0, true,
     '{"address_line1": "104 Roebling Street", "address_line2": "New York, NY 11211, United States of America", "formatted_address": "104 Roebling Street, New York, NY 11211, United States of America", "lat": 40.715934399999995, "lon": -73.95581773695505}'::jsonb),
    ('Snow White Coffee', 'COMMERCE', 'Independent coffee shop in Oakland', 'https://snowwhitecoffee.com/', 'snowwhitecoffee.com', 5.0, false,
     '{"address_line1": "3824 Piedmont Avenue", "address_line2": "Oakland, CA 94611, United States of America", "formatted_address": "3824 Piedmont Avenue, Oakland, CA 94611, United States of America", "lat": 37.824135600000005, "lon": -122.2552304}'::jsonb);

-- Create view for merchant statistics
CREATE VIEW public.merchant_stats AS
SELECT 
    m.id,
    m.name,
    m.category,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(t.amount), 0) as total_volume,
    COALESCE(SUM(t.cashback_amount), 0) as total_cashback_paid,
    COALESCE(AVG(t.amount), 0) as avg_transaction_size,
    COUNT(DISTINCT t.user_id) as unique_customers
FROM public.merchants m
LEFT JOIN public.transactions t ON m.id = t.merchant_id AND t.status = 'confirmed'
GROUP BY m.id, m.name, m.category;

-- Create view for user leaderboard
CREATE VIEW public.user_leaderboard AS
SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.total_cashback_earned,
    p.tier,
    ROW_NUMBER() OVER (ORDER BY p.total_cashback_earned DESC) as rank
FROM public.profiles p
WHERE p.total_cashback_earned > 0;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
