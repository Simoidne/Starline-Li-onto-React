-- Product catalog schema. Apply only after reviewing a database backup.
-- Does not modify existing authentication or other business tables.
CREATE TABLE IF NOT EXISTS starline_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  category VARCHAR(100) NOT NULL DEFAULT '',
  unit VARCHAR(32) NOT NULL DEFAULT 'kg',
  public_price_cad DECIMAL(14,2) NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_public_catalog (status, sort_order, id),
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES starline_admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES starline_admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS starline_product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  stored_filename VARCHAR(255) NOT NULL UNIQUE,
  alt_text VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES starline_products(id) ON DELETE CASCADE,
  INDEX idx_product_images (product_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Costs are kept in a distinct table, never queried by the public catalog endpoint.
-- Values are inputs/approved snapshots; PHP must calculate and validate totals.
CREATE TABLE IF NOT EXISTS starline_product_costs (
  product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  purchase_currency CHAR(3) NOT NULL DEFAULT 'CAD',
  purchase_price_per_kg DECIMAL(16,4) NULL,
  purchased_kg DECIMAL(16,3) NULL,
  yield_percent DECIMAL(7,4) NULL,
  cad_per_purchase_currency DECIMAL(18,8) NULL,
  freight_cad DECIMAL(16,2) NOT NULL DEFAULT 0,
  handling_cad DECIMAL(16,2) NOT NULL DEFAULT 0,
  duties_cad DECIMAL(16,2) NOT NULL DEFAULT 0,
  other_cad DECIMAL(16,2) NOT NULL DEFAULT 0,
  target_price_cad DECIMAL(14,2) NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_costs_product FOREIGN KEY (product_id) REFERENCES starline_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_costs_updated_by FOREIGN KEY (updated_by) REFERENCES starline_admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
