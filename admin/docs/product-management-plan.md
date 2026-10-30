# Product management implementation plan

## Goal
Allow authorized Starline staff to create and edit seafood products, attach images, set public listing prices, and manage confidential landed-cost breakdowns. Keep the public React website read-only.

## Existing architecture
- Admin React app under `admin/`, PHP API and MariaDB authentication.
- Public React Products page currently imports static `productData` and displays placeholder products.
- Current authentication has Owner, Operations, and Sales. Target roles: **Owner** and **Operations Manager** only. User reports no existing Sales accounts in the live database (not independently verified). Remove Sales from role options and authorization after reviewing existing schema, API, and UI; verify the live database before applying a production migration. New permissions must be checked on every PHP endpoint.

## Proposed data model
- `starline_products`: id, sku (unique), name, description, category, unit, public_price_cad, status (draft/published/archived), sort_order, timestamps.
- `starline_product_images`: id, product_id, stored_filename, alt_text, sort_order, is_primary, timestamps.
- `starline_product_costs`: product_id, purchase_currency, purchase_price_per_kg, purchase_weight_kg, yield_percent, exchange_rate_to_cad, freight, handling, duty, other_costs, landed_cost_cad, cost_per_saleable_kg_cad, target_price_cad, updated_by, updated_at. Prefer normalized expense rows with currencies when multiple expenses are needed.
- Migration must use the existing prefixed schema conventions and not modify authentication tables.

## Security boundaries
- Public endpoint returns **only** published product name, description, category, public listing price, and approved image URLs. Never serialize costs, supplier prices, internal notes, or draft records.
- Admin endpoints use existing authenticated session, CSRF and exact-origin checks. Both Owner and Operations Manager have full control of product management, photo uploads, private cost breakdowns, pricing, and margins. Enforce permissions server-side on every endpoint. Keep the design extensible for future roles; never expose private costs through public endpoints.
- Server validates fields and computes authoritative landed cost. Use a defined decimal rounding policy for financial calculations; do not trust browser-computed totals.
- Image upload must validate MIME and decoded content, cap bytes/dimensions/count, generate random filenames, strip metadata/re-encode, and prevent PHP/script execution in upload storage. Do not trust extensions or user filenames. Ensure images are served from a controlled public media path.
- Audit product and cost edits with actor and timestamps; never expose cost data through public routes or frontend bundles.

## Implementation sequence
1. Review existing PHP API routing, authentication helpers, deployment packaging, and admin navigation.
2. Add migration and protected product CRUD endpoints; add explicit permissions and tests for role restrictions.
3. Add hardened image upload and retrieval; test malicious files, size limits, and deletion behavior.
4. Add separate published-only public catalog API; ensure all private fields are absent.
5. Build admin product list/editor, image manager, and separate private costing panel with validation.
6. Replace public static product data with API loading, loading/error/empty states, and approved images.
7. Add end-to-end integration tests and document safe deployment/rollback; do not deploy or merge automatically.

## Open decisions
- Confirmed: only Owner and Operations Manager roles are needed now; both have complete product and financial management access. Sales role should be removed from the application; user reports there are no Sales accounts, but production migration must still verify this. Design for adding roles later.
- Is the public selling price shown to visitors or used only internally for quotations?
- Should costing support multiple suppliers, shipments, and historical price revisions per product?

## Mandatory production release check: retire Sales completely

**Codex / developer instruction — release blocker:** When this feature is eventually deployed to production, verify that the obsolete **Sales** role and all Sales-specific functionality are removed from the **deployed production application**, not merely hidden in the development UI. Only **Owner** and **Operations Manager** should remain, both with full internal administrative permissions.

Before release:
1. Search both public and admin frontend code, PHP backend, database migrations/schema, role dropdowns, invitation flows, authorization checks, tests, documentation, and deployment artifacts for the legacy `sales` role and Sales-specific access logic. Do not confuse a staff role named Sales with ordinary product selling prices, sales figures, or business transactions; preserve those business features.
2. Verify against the **live** `starline_admin_users` table that no accounts have `role = 'sales'` before applying a schema migration. The owner reports none exist, but this has **not** been independently verified. If any are found, stop the migration and request a decision; never silently delete or reassign accounts.
3. Apply a reviewed, reversible migration to restrict permitted roles to `owner` and `operations` (display name: **Operations Manager**). Preserve existing Owner/Operations accounts, authentication, and session security. Keep future role extensibility in mind.
4. Test both roles' complete access to product editing, photo management, private cost breakdowns, pricing, and other authorized admin functions. Test that legacy `sales` role values are rejected by the API and cannot be selected or invited in the UI.
5. Inspect the actual production build and deployed site after rollout to confirm there are no leftover Sales-role controls, invitations, or authorization paths. Record results in the release checklist. Do not declare completion based solely on passing local tests.
6. Do not merge or deploy automatically; require explicit release approval and a rollback plan.
