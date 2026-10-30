# Product management implementation plan

## Goal
Allow authorized Starline staff to create and edit seafood products, attach images, set public listing prices, and manage confidential landed-cost breakdowns. Keep the public React website read-only.

## Existing architecture
- Admin React app under `admin/`, PHP API and MariaDB authentication.
- Public React Products page currently imports static `productData` and displays placeholder products.
- Existing roles: Owner, Operations, Sales. New permissions must be checked on every PHP endpoint.

## Proposed data model
- `starline_products`: id, sku (unique), name, description, category, unit, public_price_cad, status (draft/published/archived), sort_order, timestamps.
- `starline_product_images`: id, product_id, stored_filename, alt_text, sort_order, is_primary, timestamps.
- `starline_product_costs`: product_id, purchase_currency, purchase_price_per_kg, purchase_weight_kg, yield_percent, exchange_rate_to_cad, freight, handling, duty, other_costs, landed_cost_cad, cost_per_saleable_kg_cad, target_price_cad, updated_by, updated_at. Prefer normalized expense rows with currencies when multiple expenses are needed.
- Migration must use the existing prefixed schema conventions and not modify authentication tables.

## Security boundaries
- Public endpoint returns **only** published product name, description, category, public listing price, and approved image URLs. Never serialize costs, supplier prices, internal notes, or draft records.
- Admin endpoints use existing authenticated session, CSRF and exact-origin checks. Owner, Operations, and Sales may create and edit products and manage product photos. Enforce these permissions server-side on every write endpoint. Access to confidential costs remains a separate permission decision; do not automatically grant cost visibility to Sales or Operations solely because they can edit products.
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
- Confirmed: Owner, Operations, and Sales can create and edit products and manage product photos. Still to decide: which roles may view or edit confidential cost breakdowns?
- Is the public selling price shown to visitors or used only internally for quotations?
- Should costing support multiple suppliers, shipments, and historical price revisions per product?
