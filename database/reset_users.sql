USE stock_monitoring;

-- Hapus log (FK constraint)
TRUNCATE TABLE stock_logs;
TRUNCATE TABLE activity_logs;

-- Hapus semua user lama
DELETE FROM users;

-- Reset auto increment
ALTER TABLE users AUTO_INCREMENT = 1;

-- Insert hanya Admin (role_code = 01)
-- Password semua: Admin123!
-- Format username: [KT=01][CB=01][RL=01][NM]
INSERT INTO users (username, password_hash, full_name, role, city_code, branch_code, role_code, seq_number) VALUES
('01010101', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Angeline Huandra', 'admin', '01', '01', '01', '01'),
('01010102', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Anthony Angkasa',  'admin', '01', '01', '01', '02'),
('01010103', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Leonardo Angkasa', 'admin', '01', '01', '01', '03'),
('01010104', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Leonardo Cendra',  'admin', '01', '01', '01', '04');

-- Verifikasi
SELECT username, full_name, role, role_code FROM users ORDER BY seq_number;
