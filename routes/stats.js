const express = require('express');
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// GET /api/stats/overview — Ringkasan stok untuk Admin
// ============================================================
router.get('/overview', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        // Jumlah produk aktif
        const [[produkRow]] = await db.execute(`
            SELECT
              COUNT(*)                   AS totalProduk,
              COALESCE(SUM(stock), 0)    AS totalUnit,
              SUM(stock <= minimum_stock AND stock > 0) AS lowStock,
              SUM(stock <= 0)            AS emptyStock
            FROM products WHERE is_active = 1
        `);

        // Produk stok rendah (perlu notifikasi)
        const [alertProducts] = await db.execute(`
            SELECT id, name, sku, category, stock, minimum_stock, unit
            FROM products
            WHERE is_active = 1 AND stock <= minimum_stock
            ORDER BY stock ASC
            LIMIT 20
        `);

        // Statistik log hari ini
        const [[todayLogRow]] = await db.execute(`
            SELECT
              COUNT(*) AS totalLog,
              SUM(change_type = 'MASUK')       AS totalMasuk,
              SUM(change_type = 'KELUAR')      AS totalKeluar,
              SUM(change_type = 'PRODUK_BARU') AS totalProdukBaru
            FROM stock_logs
            WHERE DATE(created_at) = CURDATE()
        `);

        return res.json({
            success: true,
            data: {
                produk:        produkRow,
                alertProducts,
                todayActivity: todayLogRow,
            }
        });
    } catch (err) {
        console.error('Error GET /api/stats/overview:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengambil statistik.' });
    }
});

// ============================================================
// GET /api/stats/report — Laporan barang yang habis (keluar)
// ============================================================
router.get('/report', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Harap tentukan rentang tanggal yang valid.' });
        }

        const [rows] = await db.execute(`
            SELECT product_name, SUM(ABS(qty_change)) AS total_habis 
            FROM stock_logs 
            WHERE change_type = 'KELUAR' 
              AND DATE(created_at) >= ? 
              AND DATE(created_at) <= ?
            GROUP BY product_name
            ORDER BY total_habis DESC
            LIMIT 15
        `, [startDate, endDate]);

        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/stats/report:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data laporan.' });
    }
});

module.exports = router;
