const jwt = require('jsonwebtoken');
const db = require('../config/database');
require('dotenv').config();

/**
 * Middleware: Verifikasi JWT Token dari cookie atau header
 */
const verifyToken = async (req, res, next) => {
    try {
        // Ambil token dari cookie atau Authorization header
        const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
        }

        // Verifikasi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Cek apakah user masih aktif di database
        const [rows] = await db.execute(
            'SELECT id, username, role, full_name, is_active FROM users WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0 || !rows[0].is_active) {
            return res.status(401).json({ success: false, message: 'Akun tidak ditemukan atau tidak aktif.' });
        }

        req.user = rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Sesi telah berakhir. Silakan login ulang.' });
        }
        return res.status(401).json({ success: false, message: 'Token tidak valid.' });
    }
};

/**
 * Middleware: Otorisasi berdasarkan role (RBAC)
 * @param {...string} roles - Daftar role yang diizinkan
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Tidak terautentikasi.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Halaman ini hanya untuk: ${roles.join(', ')}.`
            });
        }
        next();
    };
};

module.exports = { verifyToken, requireRole };
