from pathlib import Path
import re
src=Path('.lovable/migrate-external-project/source-schema/types.ts').read_text()
seg=src[src.index('    Tables: {'):src.index('    Views: {')]
pat=re.compile(r'^      (\w+): \{\n        Row: \{\n(.*?)^        \}\n        Insert:',re.M|re.S)
enums={'app_role':['admin','user'],'media_type':['image','video'],'payment_kind':['initial','renewal','trial_conversion','refund'],'post_type':['recipe_share','photo','video','tip'],'promo_reward_kind':['percent_discount','free_days','free_month','free_year','lifetime'],'referral_status':['pending','rewarded','void'],'restaurant_approval_status':['pending','approved','rejected','suspended','changes_requested'],'restaurant_order_status':['new','accepted','preparing','ready','out_for_delivery','completed','cancelled'],'restaurant_staff_role':['owner','manager','staff'],'subscription_status':['trialing','active','in_grace','paused','expired','cancelled'],'subscription_store':['app_store','play_store','stripe','promo','admin'],'subscription_tier':['free','monthly','annual','lifetime','promo']}
skip={'restaurant_promotions','promotion_redemptions'}
uuid={'id','user_id','recipe_id','created_by','actor_id','following_id','follower_id','restaurant_id','menu_id','customer_id','order_id','menu_item_id','subscription_id','code_id','referred_id','referrer_id','reviewed_by','applicant_id','parent_comment_id','post_id','hashtag_id'}
ints={'goal','xp_reward','rollout_percent','sort_order','family_size','follower_count','following_count','post_count','redemption_count','max_redemptions','reward_value','granted_days','count','rating','rating_count','share_count','like_count','comment_count','delivery_estimate_minutes','quantity','calories','cooking_time_minutes','servings','current','total_xp','level','streak_days','longest_streak','completed_count'}
nums={'price','delivery_fee','min_order_amount','avg_rating','amount_usd','subtotal','total','unit_price','protein_g','carbs_g','fat_g','weight_kg','height_cm','budget_per_day','latitude','longitude'}
boolean_defaults={'enabled':'true','is_active':'true','is_available':'true','is_accepting_orders':'true','is_verified':'false','is_demo':'false','is_hidden':'false','checked':'false','premium_only':'false','is_featured':'false','granted_lifetime':'false'}
json_arrays={'ingredients','steps','modifier_groups','modifiers'}
array_cols={'diet_tags','dietary_tags'}
now_cols={'created_at','updated_at','occurred_at','logged_at','viewed_at','placed_at','redeemed_at','unlocked_at'}
def typ(c,t):
 e=re.search(r'Enums"\]\["(\w+)"\]',t)
 if e:return 'public.'+e.group(1)
 if c in uuid:return 'UUID'
 if c in ints:return 'INTEGER'
 if c in nums:return 'NUMERIC'
 if c in now_cols or c.endswith('_at') or c.endswith('_until'):return 'TIMESTAMPTZ'
 if c=='plan_date':return 'DATE'
 if c in array_cols:return 'TEXT[]'
 if c in json_arrays or t.replace(' | null','')=='Json':return 'JSONB'
 if t.replace(' | null','')=='boolean':return 'BOOLEAN'
 if t.replace(' | null','')=='number':return 'NUMERIC'
 return 'TEXT'
out=['CREATE EXTENSION IF NOT EXISTS pgcrypto;']
for n,v in enums.items(): out.append(f"DO $$ BEGIN CREATE TYPE public.{n} AS ENUM ({','.join(repr(x) for x in v)}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;")
out.append("CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;")
tables={}
public={'recipes','announcements','feature_flags','premium_features','challenges','dish_searches','restaurants','restaurant_locations','restaurant_menus','menu_items','restaurant_reviews','posts','post_comments','hashtags','post_hashtags','profiles'}
for name,row in pat.findall(seg):
 if name in skip:continue
 cols=[]
 for l in row.strip().splitlines():
  m=re.match(r'\s*(\w+): (.*)',l)
  if m:cols.append(m.groups())
 tables[name]=cols; defs=[]
 for c,t in cols:
  null=' | null' in t; d=''
  if c=='id':d=' DEFAULT gen_random_uuid() PRIMARY KEY'
  elif c in now_cols:d=' DEFAULT now()'
  elif c in boolean_defaults:d=' DEFAULT '+boolean_defaults[c]
  elif c in {'count','sort_order','follower_count','following_count','post_count','redemption_count','granted_days','reward_days','usage_count','rating_count','share_count','like_count','comment_count','current','total_xp','level','streak_days','longest_streak','completed_count'}:d=' DEFAULT 0'
  elif c in json_arrays:d=" DEFAULT '[]'::jsonb"
  elif c in array_cols:d=" DEFAULT '{}'"
  elif c=='currency':d=" DEFAULT 'ZAR'"
  elif c=='locale':d=" DEFAULT 'en'"
  elif c=='servings':d=' DEFAULT 1'
  elif c=='approval_status':d=" DEFAULT 'pending'"
  elif c=='status' and name=='restaurant_orders':d=" DEFAULT 'new'"
  elif c=='status' and name=='subscriptions':d=" DEFAULT 'trialing'"
  elif c=='status' and name=='referrals':d=" DEFAULT 'pending'"
  elif c=='tier':d=" DEFAULT 'free'"
  elif c=='role':d=" DEFAULT 'staff'"
  elif c=='kind' and name=='payments':d=" DEFAULT 'initial'"
  elif c=='post_type':d=" DEFAULT 'photo'"
  elif c=='reward_kind':d=" DEFAULT 'free_days'"
  if not null and c!='id':d+=' NOT NULL'
  defs.append(f'  {c} {typ(c,t)}{d}')
 names={x for x,_ in cols}
 if 'id' not in names:
  if name in {'feature_flags','premium_features'}:defs.append('  PRIMARY KEY (key)')
  elif name=='dish_searches':defs.append('  PRIMARY KEY (name)')
  elif name=='post_hashtags':defs.append('  PRIMARY KEY (post_id, hashtag_id)')
 out += [f"CREATE TABLE public.{name} (\n"+',\n'.join(defs)+'\n);']
 if name in public:out.append(f'GRANT SELECT ON public.{name} TO anon;')
 out += [f'GRANT SELECT, INSERT, UPDATE, DELETE ON public.{name} TO authenticated;',f'GRANT ALL ON public.{name} TO service_role;',f'ALTER TABLE public.{name} ENABLE ROW LEVEL SECURITY;']
# constraints needed by app and seeds
out += ['ALTER TABLE public.challenges ADD CONSTRAINT challenges_code_key UNIQUE(code);','ALTER TABLE public.recipes ADD CONSTRAINT recipes_slug_key UNIQUE(slug);','ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_recipe_key UNIQUE(user_id,recipe_id);','ALTER TABLE public.recipe_ratings ADD CONSTRAINT ratings_user_recipe_key UNIQUE(user_id,recipe_id);','ALTER TABLE public.user_roles ADD CONSTRAINT roles_user_role_key UNIQUE(user_id,role);','ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_window_key UNIQUE(bucket,identifier,window_start);','ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE(username);','ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_code_key UNIQUE(code);','ALTER TABLE public.referral_codes ADD CONSTRAINT referral_codes_user_key UNIQUE(user_id);','ALTER TABLE public.restaurant_staff ADD CONSTRAINT staff_user_restaurant_key UNIQUE(user_id,restaurant_id);']
# relations that don't depend on managed auth identities
rels=[('favorites','recipe_id','recipes','CASCADE'),('grocery_items','recipe_id','recipes','SET NULL'),('meal_plans','recipe_id','recipes','SET NULL'),('recently_viewed','recipe_id','recipes','CASCADE'),('recipe_ratings','recipe_id','recipes','CASCADE'),('restaurant_locations','restaurant_id','restaurants','CASCADE'),('restaurant_menus','restaurant_id','restaurants','CASCADE'),('menu_items','restaurant_id','restaurants','CASCADE'),('menu_items','menu_id','restaurant_menus','SET NULL'),('restaurant_staff','restaurant_id','restaurants','CASCADE'),('restaurant_orders','restaurant_id','restaurants','CASCADE'),('order_items','order_id','restaurant_orders','CASCADE'),('order_items','menu_item_id','menu_items','SET NULL')]
for a,c,b,d in rels:out.append(f'ALTER TABLE public.{a} ADD FOREIGN KEY({c}) REFERENCES public.{b}(id) ON DELETE {d};')
out += ["CREATE OR REPLACE FUNCTION public.has_role(user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=has_role.user_id AND ur.role=_role) $$;","CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid,_restaurant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.restaurant_staff s WHERE s.user_id=_user_id AND s.restaurant_id=_restaurant_id) $$;","CREATE OR REPLACE FUNCTION public.can_access_order(_order_id uuid,_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.restaurant_orders o WHERE o.id=_order_id AND (o.customer_id=_user_id OR public.is_restaurant_member(_user_id,o.restaurant_id) OR public.has_role(_user_id,'admin'))) $$;","CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text,_identifier text,_max_per_minute integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN INSERT INTO public.rate_limits(bucket,identifier,window_start,count) VALUES(_bucket,_identifier,date_trunc('minute',now()),1) ON CONFLICT(bucket,identifier,window_start) DO UPDATE SET count=rate_limits.count+1 RETURNING count INTO n; RETURN n<=_max_per_minute; END $$;","CREATE OR REPLACE FUNCTION public.increment_dish_search(_name text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN INSERT INTO public.dish_searches(name,count,updated_at) VALUES(lower(trim(_name)),1,now()) ON CONFLICT(name) DO UPDATE SET count=dish_searches.count+1,updated_at=now() RETURNING count INTO n; RETURN n; END $$;","CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=_user_id AND s.status IN ('trialing','active','in_grace') AND (s.tier='lifetime' OR s.period_end IS NULL OR s.period_end>now())) $$;","CREATE OR REPLACE FUNCTION public.recalc_recipe_rating(_recipe_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.recipes SET avg_rating=(SELECT avg(rating) FROM public.recipe_ratings WHERE recipe_id=_recipe_id),rating_count=(SELECT count(*) FROM public.recipe_ratings WHERE recipe_id=_recipe_id) WHERE id=_recipe_id $$;"]
for n,cols in tables.items():
 if any(c=='updated_at' for c,_ in cols):out.append(f'CREATE TRIGGER update_{n}_updated_at BEFORE UPDATE ON public.{n} FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();')
for n in {'recipes','announcements','feature_flags','premium_features','challenges','dish_searches','hashtags'}:out.append(f'CREATE POLICY "Public reads {n}" ON public.{n} FOR SELECT USING(true);')
out += ["CREATE POLICY \"Public reads approved restaurants\" ON public.restaurants FOR SELECT USING(approval_status='approved');","CREATE POLICY \"Public reads active menus\" ON public.restaurant_menus FOR SELECT USING(is_active=true AND EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.approval_status='approved'));","CREATE POLICY \"Public reads available menu items\" ON public.menu_items FOR SELECT USING(is_available=true AND is_hidden=false AND EXISTS(SELECT 1 FROM public.restaurants r WHERE r.id=restaurant_id AND r.approval_status='approved'));","CREATE POLICY \"Public reads profiles\" ON public.profiles FOR SELECT USING(true);","CREATE POLICY \"Public reads visible posts\" ON public.posts FOR SELECT USING(is_hidden=false);","CREATE POLICY \"Public reads visible comments\" ON public.post_comments FOR SELECT USING(is_hidden=false);","CREATE POLICY \"Public reads post hashtags\" ON public.post_hashtags FOR SELECT USING(true);","CREATE POLICY \"Public reads reviews\" ON public.restaurant_reviews FOR SELECT USING(true);"]
own={'profiles':'id','favorites':'user_id','grocery_items':'user_id','pantry_items':'user_id','meal_plans':'user_id','nutrition_logs':'user_id','recently_viewed':'user_id','recipe_ratings':'user_id','follows':'follower_id','post_likes':'user_id','post_saves':'user_id','posts':'user_id','post_comments':'user_id','subscriptions':'user_id','usage_limits':'user_id','user_achievements':'user_id','user_challenges':'user_id','user_stats':'user_id','xp_events':'user_id','referral_codes':'user_id','promo_redemptions':'user_id','referrals':'referrer_id','restaurant_applications':'applicant_id'}
for n,c in own.items():out.append(f'CREATE POLICY "Users manage own {n}" ON public.{n} FOR ALL TO authenticated USING({c}=auth.uid()) WITH CHECK({c}=auth.uid());')
out += ["CREATE POLICY \"Users read own roles\" ON public.user_roles FOR SELECT TO authenticated USING(user_id=auth.uid());","CREATE POLICY \"Admins manage roles\" ON public.user_roles FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Customers view orders\" ON public.restaurant_orders FOR SELECT TO authenticated USING(customer_id=auth.uid() OR public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Customers create orders\" ON public.restaurant_orders FOR INSERT TO authenticated WITH CHECK(customer_id=auth.uid());","CREATE POLICY \"Team updates orders\" ON public.restaurant_orders FOR UPDATE TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Order users access items\" ON public.order_items FOR ALL TO authenticated USING(public.can_access_order(order_id,auth.uid())) WITH CHECK(public.can_access_order(order_id,auth.uid()));","CREATE POLICY \"Users read staff memberships\" ON public.restaurant_staff FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Team manages restaurants\" ON public.restaurants FOR ALL TO authenticated USING(owner_id=auth.uid() OR public.is_restaurant_member(auth.uid(),id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(owner_id=auth.uid() OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Team manages menus\" ON public.restaurant_menus FOR ALL TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Team manages items\" ON public.menu_items FOR ALL TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Team manages locations\" ON public.restaurant_locations FOR ALL TO authenticated USING(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin')) WITH CHECK(public.is_restaurant_member(auth.uid(),restaurant_id) OR public.has_role(auth.uid(),'admin'));","CREATE POLICY \"Users add reviews\" ON public.restaurant_reviews FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());","CREATE POLICY \"Users edit reviews\" ON public.restaurant_reviews FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());","CREATE POLICY \"Users delete reviews\" ON public.restaurant_reviews FOR DELETE TO authenticated USING(user_id=auth.uid());","CREATE POLICY \"Users add telemetry\" ON public.telemetry_events FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() OR user_id IS NULL);","CREATE POLICY \"Users read own telemetry\" ON public.telemetry_events FOR SELECT TO authenticated USING(user_id=auth.uid());"]
Path('supabase/migrations.source/20260822000000_foundation_reconstructed.sql').write_text('\n\n'.join(out)+'\n')
