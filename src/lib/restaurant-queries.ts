import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const RESTAURANT_PUBLIC_COLUMNS =
  "id,slug,name,description,cuisine,logo_url,cover_url,opening_hours,minimum_order,prep_time_minutes,delivery_enabled,pickup_enabled,address,phone";

export type PublicRestaurant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  food_photos: unknown;
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
  is_demo: boolean;
  is_accepting_orders: boolean;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  restaurant_locations?: { latitude: number; longitude: number; label: string | null }[];
};

/** Approved restaurants only — enforced by row-level security, not by this filter alone. */
export const approvedRestaurantsQuery = () =>
  queryOptions({
    queryKey: ["restaurants", "approved"],
    queryFn: async (): Promise<PublicRestaurant[]> => {
      const { data, error } = await (supabase as any)
        .from("restaurants")
        .select(`${RESTAURANT_PUBLIC_COLUMNS},subscriptions!inner(status,expiration_date),branches(id,name,address,is_active)`)
        .eq("onboarding_complete", true)
        .eq("is_suspended", false)
        .eq("subscriptions.status", "active")
        .gt("subscriptions.expiration_date", new Date().toISOString())
        .order("name");
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({
        ...row,
        cover_image_url: row.cover_url ?? null,
        food_photos: [],
        price_range: null,
        delivery_fee: 0,
        delivery_radius_km: 0,
        min_order_amount: Number(row.minimum_order ?? 0),
        delivery_estimate_minutes: Number(row.prep_time_minutes ?? 30),
        currency: "ZAR",
        avg_rating: 0,
        rating_count: 0,
        is_verified: true,
        is_demo: false,
        is_accepting_orders: true,
        supports_pickup: Boolean(row.pickup_enabled),
        supports_delivery: Boolean(row.delivery_enabled),
        restaurant_locations: (row.branches ?? []).map((branch: any) => ({ latitude: Number(row.latitude ?? 0), longitude: Number(row.longitude ?? 0), label: branch.name ?? branch.address ?? null })),
      })) as PublicRestaurant[];
    },
  });

export const restaurantBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["restaurant", slug],
    queryFn: async (): Promise<PublicRestaurant | null> => {
      const { data, error } = await (supabase as any)
        .from("restaurants")
        .select(`${RESTAURANT_PUBLIC_COLUMNS},subscriptions!inner(status,expiration_date),branches(id,name,address,is_active)`)
        .eq("slug", slug)
        .eq("onboarding_complete", true)
        .eq("is_suspended", false)
        .eq("subscriptions.status", "active")
        .gt("subscriptions.expiration_date", new Date().toISOString())
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row: any = data;
      return {
        ...row,
        cover_image_url: row.cover_url ?? null,
        food_photos: [],
        price_range: null,
        delivery_fee: 0,
        delivery_radius_km: 0,
        min_order_amount: Number(row.minimum_order ?? 0),
        delivery_estimate_minutes: Number(row.prep_time_minutes ?? 30),
        currency: "ZAR",
        avg_rating: 0,
        rating_count: 0,
        is_verified: true,
        is_demo: false,
        is_accepting_orders: true,
        supports_pickup: Boolean(row.pickup_enabled),
        supports_delivery: Boolean(row.delivery_enabled),
        restaurant_locations: (row.branches ?? []).map((branch: any) => ({ latitude: Number(row.latitude ?? 0), longitude: Number(row.longitude ?? 0), label: branch.name ?? branch.address ?? null })),
      } as PublicRestaurant;
    },
  });

export type PublicMenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  category: string | null;
  is_available: boolean;
  sort_order: number;
};

export const restaurantMenuQuery = (restaurantId: string | undefined) =>
  queryOptions({
    queryKey: ["restaurant-menu", restaurantId ?? "none"],
    queryFn: async (): Promise<PublicMenuItem[]> => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,restaurant_id,name,description,image_url,price,is_available,position,menu_categories(name)")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("position")
        .order("name");
      if (error) throw error;
      return ((data ?? []) as any[]).map((item) => ({
        ...item,
        category: item.menu_categories?.name ?? null,
        sort_order: item.position ?? 0,
      })) as PublicMenuItem[];
    },
  });

export const restaurantReviewsQuery = (restaurantId: string | undefined) =>
  queryOptions({
    queryKey: ["restaurant-reviews", restaurantId ?? "none"],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("restaurant_reviews")
        .select("id,rating,comment,created_at,user_id")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myOrdersQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-restaurant-orders", userId ?? "anon"],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("restaurant_orders")
        .select(
          "id,status,total,currency,placed_at,delivery_fee,subtotal,restaurant_id,restaurants(name,slug,logo_url)",
        )
        .eq("customer_id", userId)
        .order("placed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const orderDetailQuery = (orderId: string | undefined) =>
  queryOptions({
    queryKey: ["restaurant-order", orderId ?? "none"],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from("restaurant_orders")
        .select(
          "id,status,subtotal,delivery_fee,total,currency,delivery_address,contact_phone,notes,rejection_reason,placed_at,completed_at,restaurant_id,restaurants(name,slug,logo_url,phone,whatsapp,delivery_estimate_minutes),order_items(id,name,unit_price,quantity,notes)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });
