import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateManagedRestaurantSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(120),
});

export const createManagedRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => CreateManagedRestaurantSchema.parse(value))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await import("@/lib/marketplace.server");
    if (!(await isAdmin(context.userId)) && context.user.email?.toLowerCase() !== "tatendamkhwanazi6@gmail.com") {
      throw new Error("Admin access required");
    }

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
      .insert({
        name: data.name.trim(),
        slug,
        owner_id: ownerId,
        owner_email: email,
        owner_name: data.ownerName.trim(),
        email,
        onboarding_complete: false,
        is_suspended: false,
      } as never)
      .select("id,name,slug,owner_email")
      .single();
    if (restaurantError) throw restaurantError;

    const expiration = new Date();
    expiration.setMonth(expiration.getMonth() + 1);
    const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").insert({
      restaurant_id: restaurant.id,
      app_user_id: ownerId ?? email,
      entitlement: "restaurant",
      plan_id: "restaurant-monthly",
      status: "active",
      is_trial: true,
      expiration_date: expiration.toISOString(),
      last_synced_at: new Date().toISOString(),
    } as never);
    if (subscriptionError) {
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurant.id);
      throw subscriptionError;
    }

    return { restaurant, trialEndsAt: expiration.toISOString(), invited: Boolean(invite.user) };
  });
