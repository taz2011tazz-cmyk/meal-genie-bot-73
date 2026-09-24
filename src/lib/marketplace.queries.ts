/**
 * Customer-side discovery data for the Restaurants tab. Everything here reads
 * live rows written by the MealMate Partner Platform — no hardcoded content.
 */
import { useCallback, useEffect, useState } from "react";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeedRestaurant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  opening_hours: unknown;
  price_range: string | null;
  delivery_fee: number;
  delivery_radius_km: number;
  min_order_amount: number;
  delivery_estimate_minutes: number;
  currency: string;
  avg_rating: number;
  rating_count: number;
  is_verified: boolean;
  is_accepting_orders: boolean;
  paused_until: string | null;
  pause_message: string | null;
  supports_pickup: boolean;
  supports_delivery: boolean;
  address: string | null;
  restaurant_locations?: { latitude: number; longitude: number; label: string | null }[];
};

export type FeedPromotion = {
  id: string;
  restaurant_id: string;
  code: string | null;
  title: string;
  description: string | null;
  kind: string;
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type FeedDish = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  category: string | null;
  dietary_tags: string[];
  is_available: boolean;
};

const RESTAURANT_COLUMNS =
  "id,slug,name,description,cuisine,logo_url,cover_url,opening_hours,minimum_order,prep_time_minutes,delivery_enabled,pickup_enabled,address,latitude,longitude,is_suspended,onboarding_complete";

export type MarketplaceFeed = {
  restaurants: FeedRestaurant[];
  promotions: FeedPromotion[];
  dishes: FeedDish[];
};

/** One round trip per table, run in parallel, then joined in memory. */
export const marketplaceFeedQuery = () =>
  queryOptions({
    queryKey: ["marketplace-feed"],
    staleTime: 60_000,
    queryFn: async (): Promise<MarketplaceFeed> => {
      // Hub's production schema is newer than the generated Consumer types.
      // Keep this adapter isolated so the rest of the Consumer model stays stable.
      const hub = supabase as any;
      const [restaurantsRes, promotionsRes, dishesRes] = await Promise.all([
        hub
          .from("restaurants")
          .select(`${RESTAURANT_COLUMNS},branches(id,name,address,latitude,longitude,is_active)`)
          .eq("is_suspended", false)
          .eq("onboarding_complete", true)
          .order("name")
          .limit(60),
        hub
          .from("promotions")
          .select("id,restaurant_id,code,title,description,kind,value,min_order_amount,max_discount_amount,starts_at,ends_at,is_active")
          .eq("is_active", true)
          .limit(60),
        hub
          .from("menu_items")
          .select("id,restaurant_id,name,description,image_url,price,is_available,menu_categories(name)")
          .eq("is_available", true)
          .order("position")
          .limit(80),
      ]);

      if (restaurantsRes.error) throw restaurantsRes.error;
      if (dishesRes.error) throw dishesRes.error;

      const now = Date.now();
      const promotions = ((promotionsRes.data ?? []) as FeedPromotion[]).filter((p) => {
        const startsOk = !p.starts_at || new Date(p.starts_at).getTime() <= now;
        const endsOk = !p.ends_at || new Date(p.ends_at).getTime() >= now;
        return startsOk && endsOk;
      });

      return {
        restaurants: (restaurantsRes.data ?? []).map((row: any) => ({
          ...row,
          cover_image_url: row.cover_url ?? null,
          delivery_fee: 0,
          delivery_radius_km: 0,
          min_order_amount: Number(row.minimum_order ?? 0),
          delivery_estimate_minutes: Number(row.prep_time_minutes ?? 30),
          currency: "ZAR",
          avg_rating: 0,
          rating_count: 0,
          is_verified: Boolean(row.onboarding_complete),
          is_accepting_orders: !row.is_suspended,
          paused_until: null,
          pause_message: null,
          supports_pickup: Boolean(row.pickup_enabled),
          supports_delivery: Boolean(row.delivery_enabled),
          restaurant_locations: (row.branches ?? []).map((branch: any) => ({
            latitude: branch.latitude ?? row.latitude,
            longitude: branch.longitude ?? row.longitude,
            label: branch.name ?? branch.address ?? null,
          })),
        })) as FeedRestaurant[],
        promotions,
        dishes: ((dishesRes.data ?? []) as any[]).map((d) => ({
          ...d,
          category: d.menu_categories?.name ?? null,
          dietary_tags: [
            ...(d.is_vegan ? ["vegan"] : []),
            ...(d.is_vegetarian ? ["vegetarian"] : []),
            ...(d.is_halaal ? ["halaal"] : []),
          ],
        })) as FeedDish[],
      };
    },
  });

/** Restaurants the signed-in customer has ordered from before, most recent first. */
export const orderHistoryRestaurantsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["order-history-restaurants", userId ?? "anon"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("restaurant_id,placed_at")
        .eq("customer_id", userId)
        .order("placed_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const seen: string[] = [];
      for (const row of data ?? []) {
        if (row.restaurant_id && !seen.includes(row.restaurant_id)) seen.push(row.restaurant_id);
      }
      return seen;
    },
  });

/* ---------------- Favourites (device-local) ---------------- */

const FAVOURITES_KEY = "mealmate.favourite-restaurants.v1";
const FAVOURITES_EVENT = "mealmate:favourites";

function readFavourites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVOURITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function useFavouriteRestaurants() {
  const [favourites, setFavourites] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setFavourites(readFavourites());
    sync();
    window.addEventListener(FAVOURITES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVOURITES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = readFavourites();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(FAVOURITES_EVENT));
  }, []);

  return { favourites, toggle, isFavourite: (id: string) => favourites.includes(id) };
}

/* ---------------- Discovery helpers ---------------- */

export const DISCOVERY_CATEGORIES = [
  { key: "deals", label: "Hot Deals", emoji: "🔥", terms: [] as string[] },
  { key: "pizza", label: "Pizza", emoji: "🍕", terms: ["pizza"] },
  { key: "fastfood", label: "Fast Food", emoji: "🍟", terms: ["fast", "fries", "kota", "takeaway"] },
  { key: "burgers", label: "Burgers", emoji: "🍔", terms: ["burger", "smash"] },
  { key: "chicken", label: "Chicken", emoji: "🍗", terms: ["chicken", "wings", "poultry"] },
  { key: "mexican", label: "Mexican", emoji: "🌮", terms: ["mexican", "taco", "burrito", "nacho"] },
  { key: "sushi", label: "Sushi", emoji: "🍣", terms: ["sushi", "maki", "sashimi", "japanese"] },
  { key: "healthy", label: "Healthy", emoji: "🥗", terms: ["healthy", "salad", "bowl", "vegan", "vegetarian"] },
  { key: "desserts", label: "Desserts", emoji: "🍰", terms: ["dessert", "cake", "sweet", "ice cream", "pudding"] },
  { key: "drinks", label: "Drinks", emoji: "🥤", terms: ["drink", "juice", "coffee", "smoothie", "soda"] },
] as const;

export type CategoryKey = (typeof DISCOVERY_CATEGORIES)[number]["key"];

export function matchesCategory(
  category: CategoryKey,
  haystack: string,
  hasDeal: boolean,
): boolean {
  if (category === "deals") return hasDeal;
  const def = DISCOVERY_CATEGORIES.find((c) => c.key === category);
  if (!def) return true;
  const text = haystack.toLowerCase();
  return def.terms.some((t) => text.includes(t));
}

export function promoHeadline(p: FeedPromotion, currency = "ZAR"): string {
  const amount = (n: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${currency} ${n.toFixed(0)}`;
    }
  };
  switch (p.kind) {
    case "percent_off":
      return `${Math.round(p.value)}% OFF`;
    case "amount_off":
      return `GET ${amount(p.value)} OFF`;
    case "free_delivery":
      return "FREE DELIVERY";
    case "bogo":
      return "BUY 1 GET 1";
    case "combo":
      return "COMBO DEAL";
    case "first_order":
      return "FIRST ORDER DEAL";
    default:
      return p.title.toUpperCase();
  }
}
