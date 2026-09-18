CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.media_type AS ENUM ('image','video'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.payment_kind AS ENUM ('initial','renewal','trial_conversion','refund'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.post_type AS ENUM ('recipe_share','photo','video','tip'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.promo_reward_kind AS ENUM ('percent_discount','free_days','free_month','free_year','lifetime'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.referral_status AS ENUM ('pending','rewarded','void'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.restaurant_approval_status AS ENUM ('pending','approved','rejected','suspended','changes_requested'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.restaurant_order_status AS ENUM ('new','accepted','preparing','ready','out_for_delivery','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.restaurant_staff_role AS ENUM ('owner','manager','staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.subscription_status AS ENUM ('trialing','active','in_grace','paused','expired','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.subscription_store AS ENUM ('app_store','play_store','stripe','promo','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.subscription_tier AS ENUM ('free','monthly','annual','lifetime','promo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;

CREATE TABLE public.announcements (
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL
);

GRANT SELECT ON public.announcements TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  action TEXT NOT NULL,
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT,
  metadata JSONB NOT NULL,
  target_id TEXT,
  target_table TEXT,
  user_agent TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;

GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.challenges (
  action TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  description TEXT,
  goal INTEGER NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN DEFAULT true NOT NULL,
  kind TEXT NOT NULL,
  premium_only BOOLEAN DEFAULT false NOT NULL,
  title TEXT NOT NULL,
  xp_reward INTEGER NOT NULL
);

GRANT SELECT ON public.challenges TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;

GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.dish_searches (
  count INTEGER DEFAULT 0 NOT NULL,
  name TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (name)
);

GRANT SELECT ON public.dish_searches TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dish_searches TO authenticated;

GRANT ALL ON public.dish_searches TO service_role;

ALTER TABLE public.dish_searches ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.favorites (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;

GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feature_flags (
  description TEXT,
  enabled BOOLEAN DEFAULT true NOT NULL,
  key TEXT NOT NULL,
  rollout_percent INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (key)
);

GRANT SELECT ON public.feature_flags TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;

GRANT ALL ON public.feature_flags TO service_role;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.follows (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;

GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.grocery_items (
  category TEXT,
  checked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER,
  recipe_id UUID,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_items TO authenticated;

GRANT ALL ON public.grocery_items TO service_role;

ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.hashtags (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag TEXT NOT NULL,
  usage_count NUMERIC DEFAULT 0 NOT NULL
);

GRANT SELECT ON public.hashtags TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hashtags TO authenticated;

GRANT ALL ON public.hashtags TO service_role;

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meal_plans (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  custom_name TEXT,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_type TEXT NOT NULL,
  plan_date DATE NOT NULL,
  recipe_id UUID,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;

GRANT ALL ON public.meal_plans TO service_role;

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.menu_items (
  branch_id TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  description TEXT,
  dietary_tags TEXT[] DEFAULT '{}' NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true NOT NULL,
  is_hidden BOOLEAN DEFAULT false NOT NULL,
  menu_id UUID,
  modifier_groups JSONB DEFAULT '[]'::jsonb NOT NULL,
  name TEXT NOT NULL,
  prep_time_minutes NUMERIC,
  price NUMERIC NOT NULL,
  restaurant_id UUID NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT ON public.menu_items TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;

GRANT ALL ON public.menu_items TO service_role;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.nutrition_logs (
  calories INTEGER,
  carbs_g NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  fat_g NUMERIC,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logged_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  meal_type TEXT,
  name TEXT NOT NULL,
  protein_g NUMERIC,
  recipe_id UUID,
  servings INTEGER DEFAULT 1 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_logs TO authenticated;

GRANT ALL ON public.nutrition_logs TO service_role;

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  line_total NUMERIC,
  menu_item_id UUID,
  modifiers JSONB DEFAULT '[]'::jsonb NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  order_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;

GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pantry_items (
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER,
  source TEXT,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;

GRANT ALL ON public.pantry_items TO service_role;

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  amount_usd NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind public.payment_kind DEFAULT 'initial' NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  raw JSONB,
  rc_event_id TEXT,
  subscription_id UUID,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_comments (
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_hidden BOOLEAN DEFAULT false NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  parent_comment_id UUID,
  post_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT ON public.post_comments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;

GRANT ALL ON public.post_comments TO service_role;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_hashtags (
  hashtag_id UUID NOT NULL,
  post_id UUID NOT NULL,
  PRIMARY KEY (post_id, hashtag_id)
);

GRANT SELECT ON public.post_hashtags TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_hashtags TO authenticated;

GRANT ALL ON public.post_hashtags TO service_role;

ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_likes (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_likes TO authenticated;

GRANT ALL ON public.post_likes TO service_role;

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.post_saves (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_saves TO authenticated;

GRANT ALL ON public.post_saves TO service_role;

ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.posts (
  caption TEXT,
  category TEXT,
  comment_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cuisine TEXT,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredients JSONB DEFAULT '[]'::jsonb NOT NULL,
  instructions JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT false NOT NULL,
  like_count INTEGER DEFAULT 0 NOT NULL,
  media_type public.media_type,
  media_url TEXT,
  post_type public.post_type DEFAULT 'photo' NOT NULL,
  recipe_id UUID,
  save_count NUMERIC NOT NULL,
  share_count INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT ON public.posts TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;

GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.premium_features (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  description TEXT,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  min_tier public.subscription_tier NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (key)
);

GRANT SELECT ON public.premium_features TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_features TO authenticated;

GRANT ALL ON public.premium_features TO service_role;

ALTER TABLE public.premium_features ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  activity_level TEXT,
  age NUMERIC,
  allergies TEXT,
  avatar_url TEXT,
  bio TEXT,
  budget_per_day NUMERIC,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  currency TEXT DEFAULT 'ZAR' NOT NULL,
  dietary_preferences TEXT,
  display_name TEXT,
  family_size INTEGER,
  follower_count INTEGER DEFAULT 0 NOT NULL,
  following_count INTEGER DEFAULT 0 NOT NULL,
  goal INTEGER,
  height_cm NUMERIC,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  locale TEXT DEFAULT 'en' NOT NULL,
  post_count INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  username TEXT,
  weight_kg NUMERIC
);

GRANT SELECT ON public.profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promo_codes (
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID,
  enabled BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  max_redemptions INTEGER,
  notes TEXT,
  redemption_count INTEGER DEFAULT 0 NOT NULL,
  reward_kind public.promo_reward_kind DEFAULT 'free_days' NOT NULL,
  reward_value INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;

GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.promo_redemptions (
  code_id UUID NOT NULL,
  granted_days INTEGER DEFAULT 0 NOT NULL,
  granted_lifetime BOOLEAN DEFAULT false NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  redeemed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_redemptions TO authenticated;

GRANT ALL ON public.promo_redemptions TO service_role;

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rate_limits (
  bucket TEXT NOT NULL,
  count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  window_start TEXT NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO authenticated;

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recently_viewed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;

GRANT ALL ON public.recently_viewed TO service_role;

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recipe_ratings (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL,
  recipe_id UUID NOT NULL,
  review TEXT,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ratings TO authenticated;

GRANT ALL ON public.recipe_ratings TO service_role;

ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recipes (
  avg_rating NUMERIC,
  calories INTEGER,
  carbs_g NUMERIC,
  category TEXT,
  cooking_time_minutes INTEGER,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID,
  cuisine TEXT,
  description TEXT,
  diet_tags TEXT[] DEFAULT '{}',
  difficulty TEXT,
  fat_g NUMERIC,
  fun_fact TEXT,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT,
  ingredients JSONB DEFAULT '[]'::jsonb NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  meal_type TEXT,
  name TEXT NOT NULL,
  protein_g NUMERIC,
  rating_count INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 1,
  slug TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT ON public.recipes TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;

GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.referral_codes (
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_codes TO authenticated;

GRANT ALL ON public.referral_codes TO service_role;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.referrals (
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referred_id UUID NOT NULL,
  referrer_id UUID NOT NULL,
  reward_days NUMERIC DEFAULT 0 NOT NULL,
  rewarded_at TIMESTAMPTZ,
  status public.referral_status DEFAULT 'pending' NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;

GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_applications (
  admin_notes TEXT,
  applicant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rejection_reason TEXT,
  requested_changes TEXT,
  restaurant_id UUID,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  status public.restaurant_approval_status NOT NULL,
  submitted_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_applications TO authenticated;

GRANT ALL ON public.restaurant_applications TO service_role;

ALTER TABLE public.restaurant_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_locations (
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  delivery_estimate_minutes INTEGER,
  delivery_fee NUMERIC,
  delivery_radius_km NUMERIC,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_accepting_orders BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  label TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  min_order_amount NUMERIC,
  opening_hours JSONB NOT NULL,
  phone TEXT,
  restaurant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT ON public.restaurant_locations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_locations TO authenticated;

GRANT ALL ON public.restaurant_locations TO service_role;

ALTER TABLE public.restaurant_locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_menus (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  description TEXT,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN DEFAULT true NOT NULL,
  name TEXT NOT NULL,
  restaurant_id UUID NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT ON public.restaurant_menus TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_menus TO authenticated;

GRANT ALL ON public.restaurant_menus TO service_role;

ALTER TABLE public.restaurant_menus ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_orders (
  branch_id TEXT,
  completed_at TIMESTAMPTZ,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  currency TEXT DEFAULT 'ZAR' NOT NULL,
  customer_id UUID NOT NULL,
  delivery_address TEXT,
  delivery_fee NUMERIC NOT NULL,
  discount_total NUMERIC NOT NULL,
  fulfillment_type public.order_fulfillment_type NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  payment_method TEXT NOT NULL,
  payment_provider TEXT,
  payment_reference TEXT,
  payment_status public.order_payment_status NOT NULL,
  placed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  promotion_code TEXT,
  promotion_id TEXT,
  rejection_reason TEXT,
  restaurant_id UUID NOT NULL,
  status public.restaurant_order_status DEFAULT 'new' NOT NULL,
  subtotal NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_orders TO authenticated;

GRANT ALL ON public.restaurant_orders TO service_role;

ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_reviews (
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL,
  restaurant_id UUID NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT ON public.restaurant_reviews TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_reviews TO authenticated;

GRANT ALL ON public.restaurant_reviews TO service_role;

ALTER TABLE public.restaurant_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurant_staff (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  role public.restaurant_staff_role DEFAULT 'staff' NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_staff TO authenticated;

GRANT ALL ON public.restaurant_staff TO service_role;

ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.restaurants (
  address TEXT,
  approval_status public.restaurant_approval_status DEFAULT 'pending' NOT NULL,
  avg_rating NUMERIC NOT NULL,
  business_registration TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cuisine TEXT,
  currency TEXT DEFAULT 'ZAR' NOT NULL,
  delivery_estimate_minutes INTEGER NOT NULL,
  delivery_fee NUMERIC NOT NULL,
  delivery_radius_km NUMERIC NOT NULL,
  description TEXT,
  email TEXT,
  food_photos JSONB NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_accepting_orders BOOLEAN DEFAULT true NOT NULL,
  is_demo BOOLEAN DEFAULT false NOT NULL,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  logo_url TEXT,
  min_order_amount NUMERIC NOT NULL,
  name TEXT NOT NULL,
  opening_hours JSONB NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT,
  pause_message TEXT,
  paused_until TIMESTAMPTZ,
  payment_info JSONB NOT NULL,
  phone TEXT,
  price_range TEXT,
  rating_count INTEGER DEFAULT 0 NOT NULL,
  slug TEXT NOT NULL,
  supports_delivery BOOLEAN NOT NULL,
  supports_pickup BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  whatsapp TEXT
);

GRANT SELECT ON public.restaurants TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;

GRANT ALL ON public.restaurants TO service_role;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscription_events (
  actor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  event_type TEXT NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payload JSONB,
  rc_event_id TEXT,
  source TEXT NOT NULL,
  subscription_id UUID,
  user_id UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_events TO authenticated;

GRANT ALL ON public.subscription_events TO service_role;

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subscriptions (
  auto_renew BOOLEAN NOT NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  environment TEXT,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_manual BOOLEAN NOT NULL,
  period_end TEXT,
  period_start TEXT,
  product_id TEXT,
  rc_app_user_id TEXT,
  rc_original_transaction_id TEXT,
  status public.subscription_status DEFAULT 'trialing' NOT NULL,
  store public.subscription_store,
  tier public.subscription_tier DEFAULT 'free' NOT NULL,
  trial_end TEXT,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;

GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.telemetry_events (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  error TEXT,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,
  latency_ms NUMERIC,
  metadata JSONB NOT NULL,
  name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  user_id UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telemetry_events TO authenticated;

GRANT ALL ON public.telemetry_events TO service_role;

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.usage_limits (
  count INTEGER DEFAULT 0 NOT NULL,
  feature_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_limits TO authenticated;

GRANT ALL ON public.usage_limits TO service_role;

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_achievements (
  code TEXT NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unlocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;

GRANT ALL ON public.user_achievements TO service_role;

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_challenges (
  challenge_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_key TEXT NOT NULL,
  progress NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_challenges TO authenticated;

GRANT ALL ON public.user_challenges TO service_role;

ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role DEFAULT 'staff' NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_stats (
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  current_streak NUMERIC NOT NULL,
  elite_reward_claimed_at TIMESTAMPTZ,
  last_active_date TEXT,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  total_xp INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;

GRANT ALL ON public.user_stats TO service_role;

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.xp_events (
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  dedupe_key TEXT NOT NULL,
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metadata JSONB NOT NULL,
  points NUMERIC NOT NULL,
  user_id UUID NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_events TO authenticated;

GRANT ALL ON public.xp_events TO service_role;

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.challenges ADD CONSTRAINT challenges_code_key UNIQUE(code);

ALTER TABLE public.recipes ADD CONSTRAINT recipes_slug_key UNIQUE(slug);

ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_recipe_key UNIQUE(user_id,recipe_id);

ALTER TABLE public.recipe_ratings ADD CONSTRAINT ratings_user_recipe_key UNIQUE(user_id,recipe_id);

ALTER TABLE public.user_roles ADD CONSTRAINT roles_user_role_key UNIQUE(user_id,role);

ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_window_key UNIQUE(bucket,identifier,window_start);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE(username);

ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_code_key UNIQUE(code);

ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_key UNIQUE(user_id);

ALTER TABLE public.restaurant_staff ADD CONSTRAINT staff_user_restaurant_key UNIQUE(user_id,restaurant_id);

ALTER TABLE public.favorites ADD FOREIGN KEY(recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.grocery_items ADD FOREIGN KEY(recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;

ALTER TABLE public.meal_plans ADD FOREIGN KEY(recipe_id) REFERENCES public.recipes(id) ON DELETE SET NULL;

ALTER TABLE public.recently_viewed ADD FOREIGN KEY(recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.recipe_ratings ADD FOREIGN KEY(recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_locations ADD FOREIGN KEY(restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_menus ADD FOREIGN KEY(restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.menu_items ADD FOREIGN KEY(restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.menu_items ADD FOREIGN KEY(menu_id) REFERENCES public.restaurant_menus(id) ON DELETE SET NULL;

ALTER TABLE public.restaurant_staff ADD FOREIGN KEY(restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_orders ADD FOREIGN KEY(restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.order_items ADD FOREIGN KEY(order_id) REFERENCES public.restaurant_orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items ADD FOREIGN KEY(menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.has_role(user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=has_role.user_id AND ur.role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid,_restaurant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.restaurant_staff s WHERE s.user_id=_user_id AND s.restaurant_id=_restaurant_id) $$;

CREATE OR REPLACE FUNCTION public.can_access_order(_order_id uuid,_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.restaurant_orders o WHERE o.id=_order_id AND (o.customer_id=_user_id OR public.is_restaurant_member(_user_id,o.restaurant_id) OR public.has_role(_user_id,'admin'))) $$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text,_identifier text,_max_per_minute integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN INSERT INTO public.rate_limits(bucket,identifier,window_start,count) VALUES(_bucket,_identifier,date_trunc('minute',now()),1) ON CONFLICT(bucket,identifier,window_start) DO UPDATE SET count=rate_limits.count+1 RETURNING count INTO n; RETURN n<=_max_per_minute; END $$;

CREATE OR REPLACE FUNCTION public.increment_dish_search(_name text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN INSERT INTO public.dish_searches(name,count,updated_at) VALUES(lower(trim(_name)),1,now()) ON CONFLICT(name) DO UPDATE SET count=dish_searches.count+1,updated_at=now() RETURNING count INTO n; RETURN n; END $$;

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=_user_id AND s.status IN ('trialing','active','in_grace') AND (s.tier='lifetime' OR s.period_end IS NULL OR s.period_end>now())) $$;

CREATE OR REPLACE FUNCTION public.recalc_recipe_rating(_recipe_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.recipes SET avg_rating=(SELECT avg(rating) FROM public.recipe_ratings WHERE recipe_id=_recipe_id),rating_count=(SELECT count(*) FROM public.recipe_ratings WHERE recipe_id=_recipe_id) WHERE id=_recipe_id $$;

CREATE TRIGGER update_dish_searches_updated_at BEFORE UPDATE ON public.dish_searches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nutrition_logs_updated_at BEFORE UPDATE ON public.nutrition_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipe_ratings_updated_at BEFORE UPDATE ON public.recipe_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_applications_updated_at BEFORE UPDATE ON public.restaurant_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_locations_updated_at BEFORE UPDATE ON public.restaurant_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_menus_updated_at BEFORE UPDATE ON public.restaurant_menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_orders_updated_at BEFORE UPDATE ON public.restaurant_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_reviews_updated_at BEFORE UPDATE ON public.restaurant_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON public.usage_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_challenges_updated_at BEFORE UPDATE ON public.user_challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Public reads dish_searches" ON public.dish_searches FOR SELECT USING(true);

CREATE POLICY "Public reads challenges" ON public.challenges FOR SELECT USING(true);

CREATE POLICY "Public reads hashtags" ON public.hashtags FOR SELECT USING(true);

CREATE POLICY "Public reads announcements" ON public.announcements FOR SELECT USING(true);

CREATE POLICY "Public reads premium_features" ON public.premium_features FOR SELECT USING(true);

CREATE POLICY "Public reads recipes" ON public.recipes FOR SELECT USING(true);

CREATE POLICY "Public reads feature_flags" ON public.feature_flags FOR SELECT USING(true);

CREATE POLICY "Public reads approved restaurants" ON public.restaurants FOR SELECT USING(approval_status='approved');

CREATE POLICY "Public reads active menus" ON public.restaurant_menus FOR SELECT USING(is_active=true AND EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.approval_status='approved'));

CREATE POLICY "Public reads available menu items" ON public.menu_items FOR SELECT USING(is_available=true AND is_hidden=false AND EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.approval_status='approved'));

CREATE POLICY "Public reads profiles" ON public.profiles FOR SELECT USING(true);

CREATE POLICY "Public reads visible posts" ON public.posts FOR SELECT USING(is_hidden=false);

CREATE POLICY "Public reads visible comments" ON public.post_comments FOR SELECT USING(is_hidden=false);

CREATE POLICY "Public reads post hashtags" ON public.post_hashtags FOR SELECT USING(true);

CREATE POLICY "Public reads reviews" ON public.restaurant_reviews FOR SELECT USING(true);

CREATE POLICY "Users manage own profiles" ON public.profiles FOR ALL TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());

CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own grocery_items" ON public.grocery_items FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own pantry_items" ON public.pantry_items FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own meal_plans" ON public.meal_plans FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own nutrition_logs" ON public.nutrition_logs FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own recently_viewed" ON public.recently_viewed FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own recipe_ratings" ON public.recipe_ratings FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own follows" ON public.follows FOR ALL TO authenticated USING(follower_id=auth.uid()) WITH CHECK(follower_id=auth.uid());

CREATE POLICY "Users manage own post_likes" ON public.post_likes FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own post_saves" ON public.post_saves FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own posts" ON public.posts FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own post_comments" ON public.post_comments FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own subscriptions" ON public.subscriptions FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own usage_limits" ON public.usage_limits FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own user_achievements" ON public.user_achievements FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own user_challenges" ON public.user_challenges FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own user_stats" ON public.user_stats FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own xp_events" ON public.xp_events FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own referral_codes" ON public.referral_codes FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own promo_redemptions" ON public.promo_redemptions FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users manage own referrals" ON public.referrals FOR ALL TO authenticated USING(referrer_id=auth.uid()) WITH CHECK(referrer_id=auth.uid());

CREATE POLICY "Users manage own restaurant_applications" ON public.restaurant_applications FOR ALL TO authenticated USING(applicant_id=auth.uid()) WITH CHECK(applicant_id=auth.uid());

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());

CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

CREATE POLICY "Customers view orders" ON public.restaurant_orders FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Customers create orders" ON public.restaurant_orders FOR INSERT TO authenticated WITH CHECK(customer_id=auth.uid());

CREATE POLICY "Team updates orders" ON public.restaurant_orders FOR UPDATE TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Order users access items" ON public.order_items FOR ALL TO authenticated USING(public.can_access_order(order_id,auth.uid())) WITH CHECK(public.can_access_order(order_id,auth.uid()));

CREATE POLICY "Users read staff memberships" ON public.restaurant_staff FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Team manages restaurants" ON public.restaurants FOR ALL TO authenticated USING(owner_id=auth.uid() OR public.is_restaurant_member(auth.uid(),id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Team manages menus" ON public.restaurant_menus FOR ALL TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Team manages items" ON public.menu_items FOR ALL TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Team manages locations" ON public.restaurant_locations FOR ALL TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users add reviews" ON public.restaurant_reviews FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users edit reviews" ON public.restaurant_reviews FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

CREATE POLICY "Users delete reviews" ON public.restaurant_reviews FOR DELETE TO authenticated USING(user_id=auth.uid());

CREATE POLICY "Users add telemetry" ON public.telemetry_events FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() OR user_id IS NULL);

CREATE POLICY "Users read own telemetry" ON public.telemetry_events FOR SELECT TO authenticated USING(user_id=auth.uid());
