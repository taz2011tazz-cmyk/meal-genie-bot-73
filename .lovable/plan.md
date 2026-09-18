# MealMate Restaurants Redesign

## Goal
Rebuild only the customer restaurant discovery experience as a dark-first, premium, mobile food-delivery screen while preserving the current restaurant data, cart, checkout, ordering, and account behavior.

## What will change
- Redesign `/restaurants` with a compact delivery-location selector, large search field, horizontal food categories, filter chips, promotional carousel, popular brands, personalized dish rails, and multiple discovery sections.
- Use live restaurant, promotion, menu-item, rating, delivery-time, fee, location, availability, and order-history data already available in MealMate.
- Add polished production states: skeleton loading, retryable error state, contextual empty results, active filters, favorite controls, carousel pagination, and reduced-motion-safe transitions.
- Make food and restaurant cards open the existing restaurant menu. Dish cards will add the selected item to the existing single-restaurant cart and visibly update a floating cart summary.
- Add an editable delivery-location sheet using the existing opt-in location behavior, with clear permission and fallback states.
- Update the restaurant experience’s bottom navigation to the requested five destinations: Restaurants, Pick n Pay, Shops, Orders, Profile. Unavailable marketplace tabs will remain clear, non-destructive placeholders rather than dead links.
- Restyle the restaurant detail/menu surface and its cart bar only where needed for visual continuity; checkout and backend ordering logic remain intact.

## Visual direction
- Near-black surfaces with off-white type, MealMate green as the primary action color, and restrained warm accents for offers.
- Large food photography, crisp image overlays, compact metadata, generous section spacing, rounded Material 3 surfaces, subtle borders, and no decorative gradients or excessive glass effects.
- Mobile-first horizontal snap rails with hidden scrollbars, reliable touch targets, pressed states, and lightweight 60fps transitions.

## Technical approach
- Replace the current `/restaurants` presentation with small focused components for location, search/categories, promos, brands, dishes, restaurants, cart summary, and marketplace navigation.
- Reuse `marketplaceFeedQuery`, geolocation helpers, favorites, `useCart`, existing dynamic restaurant routes, and current order functions.
- Derive categories and sections from existing live records; use deliberate fallbacks only when a partner has not supplied an image.
- Preserve route metadata and add no database or authentication changes.
- Keep the global theme unchanged outside the restaurant customer experience by using restaurant-specific semantic tokens and scoped styling.

## Verification
- Check phone and desktop layouts for overflow, readable labels, usable horizontal rails, and bottom-nav/cart separation.
- Exercise search, category/filter combinations, location actions, carousel controls and auto-advance, restaurant opening, dish add/remove, cart updates, checkout navigation, loading, empty, and error states.
- Confirm automatic checks pass and inspect the key screens in the browser.

## Out of scope
- Creating test accounts or testing sign-in/profile/recipe-save flows.
- Backend schema changes, partner dashboard redesign, or replacing checkout/order logic.
