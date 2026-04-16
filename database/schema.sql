-- ============================================================
-- STOCK MONITORING DATABASE SCHEMA (v3 — Admin Only)
-- ============================================================

CREATE DATABASE IF NOT EXISTS stock_monitoring
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stock_monitoring;

-- ============================================================
-- TABEL USERS
-- Format username 8 digit: [KT][CB][RL][NM]
--   KT = Kode Kota (2 digit)
--   CB = Nomor Cabang dari kota tersebut (2 digit)
--   RL = Kode Role (01=Admin)
--   NM = Nomor urut karyawan (2 digit)
--
-- *Catatan: Sistem ini hanya menggunakan role Admin (01).
--
-- Contoh:
--   01 01 01 01 = Kota 01, Cabang 01, Admin, Nomor 1
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      CHAR(8) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('admin') NOT NULL DEFAULT 'admin',
  city_code     CHAR(2) NOT NULL COMMENT 'Digit 1-2: Kode Kota',
  branch_code   CHAR(2) NOT NULL COMMENT 'Digit 3-4: Nomor Cabang',
  role_code     CHAR(2) NOT NULL COMMENT 'Digit 5-6: Kode Role (01=Admin)',
  seq_number    CHAR(2) NOT NULL COMMENT 'Digit 7-8: Nomor Urut',
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_role (role),
  INDEX idx_city_branch (city_code, branch_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  sku           VARCHAR(50) NOT NULL UNIQUE,
  category      VARCHAR(100),
  unit          VARCHAR(30) DEFAULT 'pcs',
  price         DECIMAL(15,2) NOT NULL DEFAULT 0,
  stock         INT NOT NULL DEFAULT 0,
  minimum_stock INT NOT NULL DEFAULT 10,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_stock_alert (stock, minimum_stock)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL STOCK LOGS (Audit Trail Perubahan Stok)
-- Bersifat IMMUTABLE: INSERT saja, tidak ada UPDATE/DELETE.
-- Mencatat setiap perubahan stok (masuk/keluar/produk baru).
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  product_id    INT NOT NULL,
  product_name  VARCHAR(255) NOT NULL,
  product_sku   VARCHAR(50) NOT NULL,
  user_id       INT NOT NULL,
  username      VARCHAR(20) NOT NULL,
  change_type   ENUM('MASUK', 'KELUAR', 'PRODUK_BARU') NOT NULL,
  qty_change    INT NOT NULL COMMENT 'Positif = masuk, Negatif = keluar',
  stock_before  INT NOT NULL,
  stock_after   INT NOT NULL,
  note          TEXT,
  ip_address    VARCHAR(45),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_product (product_id),
  INDEX idx_user (user_id),
  INDEX idx_change_type (change_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABEL ACTIVITY LOGS (Login / Logout / Aksi Sistem)
-- Bersifat IMMUTABLE: INSERT saja.
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  username    VARCHAR(20),
  action      VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address  VARCHAR(45),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DATA AWAL (SEED) — Demo Accounts
-- Password semua: Admin123! (sudah di-hash dgn bcrypt)
-- Hanya role Admin (role_code = 01)
-- ============================================================

-- ── USERS (Seed) ─────────────────────────────────────────────
-- Format username: [KT][CB][RL][NM]
--   RL: 01=Admin
INSERT INTO users (username, password_hash, full_name, role, city_code, branch_code, role_code, seq_number) VALUES
('01010101', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Angeline Huandra', 'admin', '01', '01', '01', '01'),
('01010102', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Anthony Angkasa',  'admin', '01', '01', '01', '02'),
('01010103', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Leonardo Angkasa', 'admin', '01', '01', '01', '03'),
('01010104', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Leonardo Cendra',  'admin', '01', '01', '01', '04');

-- ── PRODUK (unit: dus, stok awal: 50 dus, minimum alert: 10 dus) ──
-- Makanan: 1 dus = 40 bungkus
-- Minuman: isi per dus tertera pada nama produk
INSERT INTO products (name, sku, category, unit, price, stock, minimum_stock) VALUES
-- Kategori Makanan
('Indomie Goreng Original (40 Bungkus)', 'MKN-001', 'Makanan', 'dus', 118000, 50, 10),
('Indomie Goreng Rendang (40 Bungkus)',   'MKN-002', 'Makanan', 'dus', 132000, 50, 10),
('Indomie Kuah Soto (40 Bungkus)',        'MKN-003', 'Makanan', 'dus', 116000, 50, 10),
('Indomie Kuah Kari Ayam (40 Bungkus)',   'MKN-004', 'Makanan', 'dus', 127000, 50, 10),
('Indomie Ayam Bawang (40 Bungkus)',      'MKN-005', 'Makanan', 'dus', 115000, 50, 10),
-- Kategori Minuman
('AQUA Jumbo 1500ml (12 Botol)',      'MNM-001', 'Minuman', 'dus',  96000, 50, 10),
('AQUA Biasa 600ml (24 Botol)',       'MNM-002', 'Minuman', 'dus',  72000, 50, 10),
('Teh Pucuk 500ml (12 Botol)',        'MNM-003', 'Minuman', 'dus',  84000, 50, 10),
('Coca Cola Kaleng 330ml (24 Kaleng)','MNM-004', 'Minuman', 'dus', 220000, 50, 10),
('Fanta Kaleng 250ml (24 Kaleng)',    'MNM-005', 'Minuman', 'dus', 145000, 50, 10);
