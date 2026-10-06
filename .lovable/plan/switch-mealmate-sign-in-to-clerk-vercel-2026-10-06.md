# Switch MealMate sign-in to Clerk (Vercel)

Your Clerk keys are saved. Before I change anything, here is what switching involves, because sign-in is tied into all of your data.

## What changes for you
- Sign-up, sign-in, Google sign-in and the profile button all run through Clerk, on Vercel and in the preview.
- Existing MealMate accounts **do not carry over**. Everyone, you included, signs up again through Clerk.
- Saved recipes, meal plans, orders, Premium status and Hub restaurant ownership linked to old accounts stay in the database. They just won't be linked to the new Clerk accounts unless we re-link them by email later.
- Hub partners also have to sign in with Clerk to keep managing their restaurants.

## Steps
1. Install Clerk for TanStack Start. Wrap the app in the Clerk provider and swap the existing sign-in page for Clerk's sign-in and sign-up screens, styled to match MealMate's black-and-white look and the selected mascot accent.
2. Replace the current sign-in check in the auth gate, header, profile and sign-out with Clerk's.
3. Have Clerk sign every database request, so the existing security rules still decide who sees what.
4. Change the user ID columns (profiles, orders, favourites, meal plans, subscriptions, restaurant staff and so on) from the old account format to text, so they accept Clerk user IDs. Point the security rules at the Clerk user ID. Nothing gets deleted.
5. Remove the old Google and Apple buttons. Clerk handles Google.
6. Add the Clerk keys to Vercel, redeploy, then test sign-up, sign-in, sign-out, Google, staying signed in after a refresh, and recipe and restaurant loading on mealmate-tazz.vercel.app.

## Things I need from you during setup
- In the Clerk dashboard, turn on the **Supabase integration** (Integrations, then Supabase) and copy the Clerk domain it shows. I will then register Clerk as a trusted sign-in provider on the backend.
- In Clerk, under Domains / Allowed origins, add `https://mealmate-tazz.vercel.app`.
- Turn on Google under Clerk, then User & Authentication, then Social connections.

## Technical details
- Package: `@clerk/tanstack-react-start`. Use `clerkMiddleware` in `src/start.ts` and `ClerkProvider` in `__root.tsx`.
- Supabase client uses `accessToken: () => clerk.session?.getToken()` (Supabase third-party auth). RLS policies change from `auth.uid()` to `(auth.jwt()->>'sub')`.
- Migration: drop the FKs to `auth.users`, then `ALTER COLUMN user_id TYPE text` on the user-scoped tables, then rewrite the policies.
- Replace `requireSupabaseAuth` server functions with Clerk `auth()` plus a Supabase client that carries the Clerk token.
- Vercel env: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- Rollback risk: this is a backend migration. Old Supabase-auth sessions stop working the moment it ships.
