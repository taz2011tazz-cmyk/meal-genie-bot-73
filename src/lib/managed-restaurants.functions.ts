import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "tatendamkhwanazi6@gmail.com";
const CreateManagedRestaurantSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
});
const RestaurantIdSchema = z.object({ restaurantId: z.string().uuid() });

async function assertManagedAdmin(context: { userId: string; user: { email?: string | null } }) {
  const { isAdmin } = await import("@/lib/marketplace.server");
  if (!(await isAdmin(context.userId)) && context.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Admin access required");
  }
}

export const listManagedRestaurants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManagedAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("restaurants")
      .select("id,name,owner_email,owner_name,onboarding_complete,is_suspended,created_at,subscriptions(status,expiration_date,is_trial)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const launchManagedRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => RestaurantIdSchema.parse(value))
  .handler(async ({ data, context }) => {
    await assertManagedAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: restaurant, error: lookupError } = await (supabaseAdmin as any)
      .from("restaurants")
      .select("id,owner_email")
      .eq("id", data.restaurantId)
      .single();
    if (lookupError) throw lookupError;

    const { error } = await (supabaseAdmin as any)
      .from("restaurants")
      .update({ onboarding_complete: true, is_suspended: false, approval_status: "approved" })
      .eq("id", data.restaurantId);
    if (error) throw error;

    // The account created by the designated owner is permanently sponsored.
    if (restaurant.owner_email?.toLowerCase() === ADMIN_EMAIL) {
      await (supabaseAdmin as any)
        .from("subscriptions")
        .update({ status: "active", is_trial: false, expiration_date: "2099-12-31T23:59:59.000Z", last_synced_at: new Date().toISOString() })
        .eq("restaurant_id", data.restaurantId);
    }
    return { restaurantId: data.restaurantId, launched: true };
  });

export const createManagedRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => CreateManagedRestaurantSchema.parse(value))
  .handler(async ({ data, context }) => {
    await assertManagedAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { data: invite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: data.ownerName, account_type: "restaurant" },
      redirectTo: `${process.env["NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL"] ?? ""}/auth/callback`,
    });
    if (inviteError && !inviteError.message.toLowerCase().includes("already registered")) throw inviteError;

    let ownerId = invite.user?.id ?? null;
    if (!ownerId) {
      const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      ownerId = existing.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
    }

    const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: restaurant, error: restaurantError } = await (supabaseAdmin as any)
      .from("restaurants")
      .insert({ name: data.name.trim(), slug, owner_id: ownerId, owner_email: email, owner_name: data.ownerName.trim(), email, onboarding_complete: false, is_suspended: false })
      .select("id,name,slug,owner_email")
      .single();
    if (restaurantError) throw restaurantError;

    const expiration = new Date();
    expiration.setMonth(expiration.getMonth() + 1);
    const sponsored = email === ADMIN_EMAIL;
    const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").insert({
      restaurant_id: restaurant.id, app_user_id: ownerId ?? email, entitlement: "restaurant", plan_id: "restaurant-monthly", status: "active", is_trial: !sponsored,
      expiration_date: sponsored ? "2099-12-31T23:59:59.000Z" : expiration.toISOString(), last_synced_at: new Date().toISOString(),
    } as never);
    if (subscriptionError) {
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurant.id);
      throw subscriptionError;
    }
    return { restaurant, trialEndsAt: sponsored ? "2099-12-31T23:59:59.000Z" : expiration.toISOString(), invited: Boolean(invite.user), sponsored };
  });

export { ADMIN_EMAIL };

