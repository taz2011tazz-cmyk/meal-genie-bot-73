# Roadmap

- [ ] Clerk sign-in (incl. Google OAuth via Clerk) on Vercel — blocked: need Clerk domain from Clerk's Supabase integration so the database trusts Clerk sign-ins
- [ ] Re-point security rules / user IDs to Clerk users (non-breaking mapping, not column type changes)
- [ ] Add Clerk keys to Vercel as VITE_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY, redeploy, test
- [ ] Partner dashboard (inspection only so far)
