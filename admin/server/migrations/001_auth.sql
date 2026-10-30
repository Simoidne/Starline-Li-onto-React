-- Import into the existing IONOS MySQL/MariaDB database using phpMyAdmin.
-- Names are prefixed to avoid existing business tables. No existing data is replaced.
CREATE TABLE IF NOT EXISTS starline_admin_installation (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  initialized_at BIGINT UNSIGNED NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO starline_admin_installation (id) VALUES (1);

CREATE TABLE IF NOT EXISTS starline_admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('owner', 'operations', 'sales') NOT NULL,
  active TINYINT UNSIGNED NOT NULL DEFAULT 1,
  auth_version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS starline_admin_password_tokens (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  auth_version INT UNSIGNED NOT NULL,
  expires_at BIGINT UNSIGNED NOT NULL,
  FOREIGN KEY (user_id) REFERENCES starline_admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS starline_admin_rate_limits (
  bucket CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  window_started BIGINT UNSIGNED NOT NULL,
  attempts INT UNSIGNED NOT NULL,
  INDEX (window_started)
) ENGINE=InnoDB;
