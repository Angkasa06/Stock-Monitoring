USE stock_monitoring;

-- Tambah kolom cash & kembalian ke tabel transactions
ALTER TABLE transactions
    ADD COLUMN cash_amount   DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER total_amount,
    ADD COLUMN change_amount DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER cash_amount;

-- Rename kolom price → unit_price di transaction_details (lebih deskriptif)
ALTER TABLE transaction_details
    CHANGE COLUMN price unit_price DECIMAL(15,2) NOT NULL;

SELECT 'Migrasi berhasil!' AS status;
