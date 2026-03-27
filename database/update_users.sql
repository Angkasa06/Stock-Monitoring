USE stock_monitoring;

-- 1. Rename 01010201 -> Anthony Angkasa
UPDATE users SET full_name = 'Anthony Angkasa' WHERE username = '01010201';

-- 2. Rename 01010301 -> Leonardo Cendra
UPDATE users SET full_name = 'Leonardo Cendra' WHERE username = '01010301';

-- 3. Tambah admin baru 01010202 -> Leonardo Angkasa
INSERT INTO users (username, password_hash, full_name, role, city_code, branch_code, role_code, seq_number)
VALUES ('01010202', '$2b$12$kRCmpbNn19LqgH8R2GQTzOim/9SovVNZ.426bYzAyPRONZr/5yLrK', 'Leonardo Angkasa', 'admin', '01', '01', '02', '02');

-- Verifikasi
SELECT username, full_name, role, role_code FROM users ORDER BY role_code, username;
