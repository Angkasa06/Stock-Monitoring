-- ============================================================
-- SEED PRODUCTS - Reset & Isi Ulang Data Produk
-- Jalankan: mysql -u root stock_monitoring < seed_products.sql
-- ============================================================

USE stock_monitoring;

-- Matikan foreign key check sementara agar bisa truncate
SET FOREIGN_KEY_CHECKS = 0;

-- Hapus semua data transaksi & produk lama (bersih total)
TRUNCATE TABLE transaction_details;
TRUNCATE TABLE transactions;
TRUNCATE TABLE products;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- INSERT PRODUK BARU
-- unit  : 'dus'
-- stock : 50 (dus)
-- minimum_stock : 10 (dus)  → threshold peringatan stok menipis
-- price : harga per 1 dus
-- ============================================================

INSERT INTO products (name, sku, category, unit, price, stock, minimum_stock) VALUES

-- ── KATEGORI MAKANAN (1 dus = 40 bungkus) ──────────────────
('Indomie Goreng Original',  'MKN-001', 'Makanan', 'dus', 118000, 50, 10),
('Indomie Goreng Rendang',   'MKN-002', 'Makanan', 'dus', 132000, 50, 10),
('Indomie Kuah Soto',        'MKN-003', 'Makanan', 'dus', 116000, 50, 10),
('Indomie Kuah Kari Ayam',   'MKN-004', 'Makanan', 'dus', 127000, 50, 10),
('Indomie Ayam Bawang',      'MKN-005', 'Makanan', 'dus', 115000, 50, 10),

-- ── KATEGORI MINUMAN ────────────────────────────────────────
('AQUA Jumbo 1500ml (12 Botol)',    'MNM-001', 'Minuman', 'dus',  96000, 50, 10),
('AQUA Biasa 600ml (24 Botol)',     'MNM-002', 'Minuman', 'dus',  72000, 50, 10),
('Teh Pucuk 500ml (12 Botol)',      'MNM-003', 'Minuman', 'dus',  84000, 50, 10),
('Coca Cola Kaleng 330ml (24 Kaleng)', 'MNM-004', 'Minuman', 'dus', 220000, 50, 10),
('Fanta Kaleng 250ml (24 Kaleng)',  'MNM-005', 'Minuman', 'dus', 145000, 50, 10);

-- Verifikasi hasil
SELECT id, sku, name, category, unit, price, stock, minimum_stock
FROM products
ORDER BY category, id;
