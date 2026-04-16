const express = require('express');
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// Helper: Catat perubahan stok ke stock_logs (IMMUTABLE)
// Dipanggil oleh semua operasi yang mengubah stok.
// ============================================================
async function logStockChange(conn, { productId, productName, productSku, userId, username, changeType, qtyChange, stockBefore, stockAfter, note, ipAddress }) {
    await conn.execute(
        `INSERT INTO stock_logs
           (product_id, product_name, product_sku, user_id, username, change_type, qty_change, stock_before, stock_after, note, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, productName, productSku, userId, username, changeType, qtyChange, stockBefore, stockAfter, note || null, ipAddress]
    );
}

// ============================================================
// GET /api/products — Ambil semua produk aktif
// ============================================================
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, name, sku, category, unit, price, stock, minimum_stock, is_active, created_at, updated_at
             FROM products
             ORDER BY sku ASC`
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error GET /api/products:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengambil data produk.' });
    }
});

// ============================================================
// POST /api/products — Tambah produk baru ke sistem
// Body: { name, sku, category, unit, price, stock, minimum_stock }
// ============================================================
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
    const { name, sku, category, unit, price, stock, minimum_stock } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' });
    }
    if (!sku || !sku.trim()) {
        return res.status(400).json({ success: false, message: 'SKU produk wajib diisi.' });
    }
    if (!price || parseFloat(price) < 0) {
        return res.status(400).json({ success: false, message: 'Harga tidak valid.' });
    }

    const initialStock = parseInt(stock) || 0;
    const minStock = parseInt(minimum_stock) || 10;
    const unitVal = unit || 'pcs';

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Cek Nama Duplikat (Case Insensitive)
        const [[existingByName]] = await conn.execute('SELECT * FROM products WHERE LOWER(name) = ?', [name.trim().toLowerCase()]);

        if (existingByName) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: `Pendaftaran gagal. Produk "${existingByName.name}" sudah terdaftar dalam sistem dengan SKU "${existingByName.sku}". Anda tidak dapat menduplikasi nama produk.` });
        }

        // 2. Cek SKU duplikat
        const [[existingSkuItem]] = await conn.execute('SELECT id, name FROM products WHERE sku = ?', [sku.trim()]);
        if (existingSkuItem) {
            await conn.rollback();
            return res.status(400).json({ success: false, message: `Pendaftaran gagal. SKU "${sku}" sudah digunakan oleh produk "${existingSkuItem.name}". Satu SKU hanya untuk satu barang unik.` });
        }

        // 3. Insert produk baru
        const [result] = await conn.execute(
            `INSERT INTO products (name, sku, category, unit, price, stock, minimum_stock)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name.trim(), sku?.trim() || null, category || 'Lainnya', unitVal, parseFloat(price), initialStock, minStock]
        );
        const productId = result.insertId;

        // Catat ke stock_logs sebagai PRODUK_BARU
        await logStockChange(conn, {
            productId,
            productName: name.trim(),
            productSku: sku?.trim() || null,
            userId: req.user.id,
            username: req.user.username,
            changeType: 'PRODUK_BARU',
            qtyChange: initialStock,
            stockBefore: 0,
            stockAfter: initialStock,
            note: `Produk baru didaftarkan. Stok awal: ${initialStock} ${unitVal}.`,
            ipAddress: req.ip,
        });

        await conn.commit();
        return res.status(201).json({
            success: true,
            message: `Produk "${name.trim()}" berhasil ditambahkan.`,
            data: { productId, name: name.trim(), stock: initialStock },
        });
    } catch (err) {
        await conn.rollback();
        console.error('Error POST /api/products:', err);
        return res.status(500).json({ success: false, message: 'Gagal menambahkan produk.' });
    } finally {
        conn.release();
    }
});

// ============================================================
// PATCH /api/products/:id/restock — Admin tambah stok (barang masuk)
// Body: { qty, note }
// ============================================================
router.patch('/:id/restock', verifyToken, requireRole('admin'), async (req, res) => {
    const productId = parseInt(req.params.id);
    const qty = parseInt(req.body.qty);
    const note = req.body.note || '';

    if (!qty || qty < 1) {
        return res.status(400).json({ success: false, message: 'Jumlah restok minimal 1.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[product]] = await conn.execute(
            'SELECT id, name, sku, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
            [productId]
        );
        if (!product) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }

        const stockBefore = product.stock;
        const stockAfter = stockBefore + qty;

        await conn.execute(
            'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
            [stockAfter, productId]
        );

        await logStockChange(conn, {
            productId,
            productName: product.name,
            productSku: product.sku,
            userId: req.user.id,
            username: req.user.username,
            changeType: 'MASUK',
            qtyChange: qty,
            stockBefore,
            stockAfter,
            note: note || null,
            ipAddress: req.ip,
        });

        await conn.commit();
        return res.json({
            success: true,
            message: `Berhasil menambah ${qty} ${product.name}`,
            data: { productId, stockBefore, stockAfter, qty },
        });
    } catch (err) {
        await conn.rollback();
        console.error('Error PATCH /api/products/:id/restock:', err);
        return res.status(500).json({ success: false, message: 'Gagal menambah stok.' });
    } finally {
        conn.release();
    }
});

// ============================================================
// PATCH /api/products/:id/reduce — Admin kurangi stok (barang keluar)
// Body: { qty, note }
// ============================================================
router.patch('/:id/reduce', verifyToken, requireRole('admin'), async (req, res) => {
    const productId = parseInt(req.params.id);
    const qty = parseInt(req.body.qty);
    const note = req.body.note || '';

    if (!qty || qty < 1) {
        return res.status(400).json({ success: false, message: 'Jumlah pengurangan minimal 1.' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[product]] = await conn.execute(
            'SELECT id, name, sku, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
            [productId]
        );
        if (!product) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }

        if (product.stock < qty) {
            await conn.rollback();
            return res.status(400).json({
                success: false,
                message: `Stok ${product.name} tidak cukup (tersisa ${product.stock} unit).`
            });
        }

        const stockBefore = product.stock;
        const stockAfter = stockBefore - qty;

        await conn.execute(
            'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
            [stockAfter, productId]
        );

        await logStockChange(conn, {
            productId,
            productName: product.name,
            productSku: product.sku,
            userId: req.user.id,
            username: req.user.username,
            changeType: 'KELUAR',
            qtyChange: -qty,
            stockBefore,
            stockAfter,
            note: note || null,
            ipAddress: req.ip,
        });

        await conn.commit();
        return res.json({
            success: true,
            message: `Berhasil mengurangi ${qty} ${product.name}`,
            data: { productId, stockBefore, stockAfter, qty },
        });
    } catch (err) {
        await conn.rollback();
        console.error('Error PATCH /api/products/:id/reduce:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengurangi stok.' });
    } finally {
        conn.release();
    }
});

// ============================================================
// PATCH /api/products/:id — Edit info produk (nama, harga, min stok)
// Body: { name, price, minimum_stock }
// Perhatian: Tidak mengubah stok — gunakan /restock atau /reduce
// ============================================================
router.patch('/:id', verifyToken, requireRole('admin'), async (req, res) => {
    const productId = parseInt(req.params.id);
    const { name, price, minimum_stock } = req.body;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[product]] = await conn.execute(
            'SELECT id, name, price, minimum_stock FROM products WHERE id = ? AND is_active = 1',
            [productId]
        );
        if (!product) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        }

        const newName = (name && name.trim()) ? name.trim() : product.name;

        // Cek apakah nama baru bertabrakan dengan nama produk lain
        if (newName.toLowerCase() !== product.name.toLowerCase()) {
            const [[existingByName]] = await conn.execute('SELECT id, name FROM products WHERE LOWER(name) = ? AND id != ?', [newName.toLowerCase(), productId]);
            if (existingByName) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: `Gagal memperbarui. Nama produk "${existingByName.name}" sudah digunakan oleh barang lain.` });
            }
        }

        const newPrice = (price !== undefined && price >= 0) ? parseFloat(price) : parseFloat(product.price);
        const newMinStock = (minimum_stock !== undefined && minimum_stock >= 1) ? parseInt(minimum_stock) : product.minimum_stock;

        await conn.execute(
            'UPDATE products SET name = ?, price = ?, minimum_stock = ?, updated_at = NOW() WHERE id = ?',
            [newName, newPrice, newMinStock, productId]
        );

        await conn.commit();
        return res.json({
            success: true,
            message: `Produk "${newName}" berhasil diperbarui.`,
            data: { productId, name: newName, price: newPrice, minimum_stock: newMinStock },
        });
    } catch (err) {
        await conn.rollback();
        console.error('Error PATCH /api/products/:id:', err);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui produk.' });
    } finally {
        conn.release();
    }
});


// ============================================================
// GET /api/products/logs — Ambil system log perubahan stok
// Hanya Admin yang bisa akses. READ-ONLY.
// ============================================================
router.get('/logs', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const offset = parseInt(req.query.offset) || 0;

        const [rows] = await db.execute(
            `SELECT
               sl.id,
               sl.product_id,
               sl.product_name,
               sl.product_sku,
               sl.username,
               sl.change_type,
               sl.qty_change,
               sl.stock_before,
               sl.stock_after,
               sl.note,
               sl.ip_address,
               sl.created_at
             FROM stock_logs sl
             ORDER BY sl.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM stock_logs');

        return res.json({ success: true, data: rows, total });
    } catch (err) {
        console.error('Error GET /api/products/logs:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengambil log stok.' });
    }
});

module.exports = router;
