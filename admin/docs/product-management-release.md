# Product management: release and rollback

Implementation lives on `feature/admin-product-management`. No production migration or deployment is automatic.

## Implemented scope

Owner and Operations Manager can create/edit/publish/archive products, delete archived products, upload/reorder/describe/remove images, choose a primary image, and save private costing. Team invitations and account changes remain Owner-only, consistent with existing authentication rules. Product and cost mutations are audited with actor, product ID, event and timestamp.

A public listing price is optional; a blank price displays “Contact us for pricing”. Costing stores one current purchase/shipment snapshot per product with CAD freight, handling, duty and other totals. Multiple suppliers, expense currencies and historical cost revisions are deferred. The current exchange rate is staff-entered, not a live quote.

PHP uses BCMath decimal arithmetic: input scales are 4 decimals for purchase price/yield, 3 for kg, 8 for FX, and 2 for CAD expenses/target prices. Purchase cost is rounded half up to cents before adding CAD expenses. Cost per kg and revenue are rounded half up to cents; profit is rounded revenue minus total cost, and margin is truncated to 2 decimal places. Tiny positive weights/yields remain valid; quantities and values are bounded on the API. Calculated monetary results are capped at CAD 999,999,999,999.99 for reliable reporting. Client totals are never trusted.

The public API selects only published catalog fields and image metadata. There is no cost-table join. Uploaded files are decoded and flattened to JPEG with metadata removed. They live in private storage and are streamed by a constrained image endpoint. Unlinked image files are retained for backup recovery, inaccessible by API after removal; schedule offline orphan cleanup after the backup retention period. Draft/archived images require a valid staff session. API listings are capped at 500 products; add pagination before exceeding that volume.

## Pre-release checks

- Back up the live database, the public site, the admin site, private PHP/configuration, and `var/product-images`. Keep the old release available.
- Verify PHP 8.1+ with PDO MySQL, BCMath, GD (JPEG/PNG/WebP), Fileinfo; set `upload_max_filesize=5M`, `post_max_size=8M` or higher and enough GD memory (at least 256M recommended). Verify the filesystem is writable by PHP and private storage is outside public document roots, or protected by hosting access rules.
- Use phpMyAdmin to inspect `SELECT id,email,role FROM starline_admin_users WHERE role NOT IN ('owner','operations');`. If any rows exist, stop and get an explicit account-management decision. Never delete or reassign them silently.
- Apply the separately reviewed `server/release/retire-sales.sql` with a SQL client that supports `DELIMITER`. Its procedure checks again and aborts on legacy accounts. If it aborts, drop the helper procedure before a reviewed retry. It preserves accounts and authentication/session data. Product migrations do not change authentication tables; this separate release step intentionally changes the role enum.
- Apply `002_products.sql` (already present on the branch) and `003_product_audit.sql` to the backed-up database. No migration runs from web requests.
- Set `public_url` in private `config.php` to the exact canonical public origin (for example `https://starline-li.com`), and retain the exact admin origin in `app_url`. Catalog is same-origin: it does not need CORS. Both virtual hosts must use the same private PHP/database/image storage. Configure `STARLINE_ADMIN_PRIVATE` in each host, or verify the bridge paths before release.
- Run frontend tests/builds and `python3 admin/server/tests/integration.py` in an isolated PHP/MariaDB environment. Never point tests at production.
- Build the public app (`npm ci --legacy-peer-deps && npm run build`; the existing lockfile needs legacy peer resolution) and the admin app (`cd admin && npm ci && npm run package`). Root `public/api/index.php` is copied into the public build. Admin packaging includes private PHP, product migrations and the guarded role release SQL, but excludes config, sessions and uploaded files.
- Verify the public hosting PHP handler executes `/api/index.php`. Never serve PHP source through a static-only host. For local CRA development, both apps proxy `/api` to the PHP development server on port 8081; set development `app_url` and `public_url` accordingly.
- Inspect actual build artifacts for legacy-role controls and authorization paths. References in negative tests, migration guards and historical plan documentation are intentional.
- Obtain explicit release approval before merging or uploading. Stage the release, preserve existing `config.php` and `var`, and switch both apps together. Ensure a maintenance window or atomic host switch prevents mismatched versions.
- After rollout, verify both roles can create/edit a product, save private costs, upload/reorder/delete photos and publish/archive it. Anonymous visitors must see only published records; check actual responses contain no costs, staff IDs, draft products or CSRF token. Check published photo delivery, draft photo rejection, unauthenticated admin rejection, CSRF/origin rejection and Sales-role invitation/API rejection. Record the result and release commit. Local tests alone do not complete release verification.

## Rollback

Restore the previous public/admin/PHP release together while preserving configuration and image backups. New product tables can stay in place for a code rollback: they do not affect existing authentication. Avoid dropping tables with production edits. Restore database/media backups only after reviewing data written since backup. The role schema rollback statement is in `retire-sales.sql`; widening the enum does not recreate users or revert code. Restore legacy functionality only with an explicit decision. Retain product audit records for investigation.
