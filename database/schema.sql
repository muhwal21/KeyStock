CREATE DATABASE IF NOT EXISTS keystock_inventory
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE keystock_inventory;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(40) NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff', 'dosen') NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY users_username_unique (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  contact_person VARCHAR(120) NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  city VARCHAR(100) NULL,
  website VARCHAR(500) NULL,
  notes VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_suppliers_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_min DECIMAL(14,2) NULL,
  price_max DECIMAL(14,2) NULL,
  purchase_price DECIMAL(14,2) NULL,
  selling_price DECIMAL(14,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'IDR',
  listing_status VARCHAR(120) NOT NULL DEFAULT 'Ready',
  warehouse_stock INT UNSIGNED NOT NULL DEFAULT 0,
  reorder_point INT UNSIGNED NOT NULL DEFAULT 5,
  storage_location VARCHAR(80) NULL, -- RAK-TINGKAT-SLOT, e.g. A-1-05
  supplier_id INT UNSIGNED NULL,
  source_url VARCHAR(500) NULL,
  image_url VARCHAR(1000) NULL, -- copy of the first photo in product_images
  specifications JSON NOT NULL,
  variants JSON NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_products_category (category_id),
  INDEX idx_products_name (name),
  INDEX idx_products_stock (warehouse_stock)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  movement_type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  stock_before INT UNSIGNED NOT NULL,
  stock_after INT UNSIGNED NOT NULL,
  reason ENUM('PURCHASE', 'RETURN_IN', 'SALE', 'DAMAGED', 'LOST', 'RETURN_OUT', 'STOCK_COUNT') NOT NULL DEFAULT 'STOCK_COUNT',
  unit_cost DECIMAL(14,2) NULL, -- purchase price at the time of the movement
  unit_price DECIMAL(14,2) NULL, -- selling price at the time of a sale or customer return
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_movements_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_movements_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_movements_product_date (product_id, created_at),
  INDEX idx_movements_user_date (user_id, created_at)
) ENGINE=InnoDB;

-- Product photos. Uploaded files are stored in the database so they survive redeploys;
-- catalog photos only keep a URL. The first row by sort_order is the main photo.
CREATE TABLE IF NOT EXISTS product_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  url VARCHAR(1000) NULL,
  data LONGBLOB NULL,
  mime_type VARCHAR(40) NULL,
  byte_size INT UNSIGNED NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_product_images_order (product_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_password_resets_user (user_id),
  INDEX idx_password_resets_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_help_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_identifier VARCHAR(190) NOT NULL,
  contact_email VARCHAR(190) NOT NULL,
  message VARCHAR(500) NULL,
  status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
  handled_by INT UNSIGNED NULL,
  handled_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_account_help_requests_handler FOREIGN KEY (handled_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_account_help_requests_status_created (status, created_at),
  INDEX idx_account_help_requests_handler (handled_by)
) ENGINE=InnoDB;
