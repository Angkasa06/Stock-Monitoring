USE stock_monitoring;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE stock_logs;
TRUNCATE TABLE products;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO products (name, sku, category, unit, price, stock, minimum_stock) VALUES
('Indomie Goreng Original', 'MKN-001', 'Makanan', 'dus', 118000, 50, 10),
('Indomie Goreng Rendang',   'MKN-002', 'Makanan', 'dus', 132000, 50, 10),
('Indomie Kuah Soto',        'MKN-003', 'Makanan', 'dus', 116000, 50, 10),
('Indomie Kuah Kari Ayam',   'MKN-004', 'Makanan', 'dus', 127000, 50, 10),
('Indomie Ayam Bawang',      'MKN-005', 'Makanan', 'dus', 115000, 50, 10),
('AQUA Jumbo 1500ml',      'MNM-001', 'Minuman', 'dus',  96000, 50, 10),
('AQUA Biasa 600ml',       'MNM-002', 'Minuman', 'dus',  72000, 50, 10),
('Teh Pucuk 500ml',        'MNM-003', 'Minuman', 'dus',  84000, 50, 10),
('Coca Cola Kaleng 330ml','MNM-004', 'Minuman', 'dus', 220000, 50, 10),
('Fanta Kaleng 250ml',    'MNM-005', 'Minuman', 'dus', 145000, 50, 10);
