const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// ============================================================
// Helper: Simpan activity log (login/logout)
// ============================================================
async function logActivity(userId, username, action, description, ipAddress) {
    try {
        await db.execute(
            'INSERT INTO activity_logs (user_id, username, action, description, ip_address) VALUES (?, ?, ?, ?, ?)',
            [userId, username, action, description, ipAddress]
        );
    } catch (err) {
        console.error('Gagal menyimpan activity log:', err.message);
    }
}

// ============================================================
// Helper: Parse username 8 digit
// Format: [KT][CB][RL][NM]
//   KT = Kode Kota    (digit 1-2)
//   CB = Nomor Cabang (digit 3-4)
//   RL = Kode Role    (digit 5-6): 01=Admin (hanya admin yang login)
//   NM = Nomor Urut   (digit 7-8)
// ============================================================
function parseUsername(username) {
    if (!/^\d{8}$/.test(username)) return null;
    const cityCode   = username.substring(0, 2);
    const branchCode = username.substring(2, 4);
    const roleCode   = username.substring(4, 6);
    const seqNumber  = username.substring(6, 8);

    // Hanya role admin (01) yang diizinkan login
    const roleMap = { '01': 'admin' };
    const role = roleMap[roleCode] || null;

    return { cityCode, branchCode, roleCode, seqNumber, role };
}

// ============================================================
// POST /api/auth/login
// ============================================================
router.post('/login', async (req, res) => {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    try {
        const { username, password } = req.body;

        // -- Validasi Input --
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
        }

        // Validasi format username: harus 8 digit angka
        if (!/^\d{8}$/.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Format username tidak valid. Username harus 8 digit angka.'
            });
        }

        // Validasi panjang password minimal 8 karakter
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password minimal 8 karakter.' });
        }

        // -- Parse username untuk cek kode role --
        const parsed = parseUsername(username);
        if (!parsed || !parsed.role) {
            await logActivity(null, username, 'LOGIN_FAILED', 'Kode role tidak valid atau bukan Admin', ipAddress);
            return res.status(400).json({
                success: false,
                message: 'Akses ditolak. Sistem ini hanya dapat diakses oleh Admin (digit 5-6 harus 01).'
            });
        }

        // -- Query ke database --
        const [rows] = await db.execute(
            'SELECT id, username, password_hash, full_name, role, city_code, branch_code, seq_number, is_active FROM users WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            await logActivity(null, username, 'LOGIN_FAILED', 'Username tidak ditemukan', ipAddress);
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const user = rows[0];

        // Cek apakah akun aktif
        if (!user.is_active) {
            await logActivity(user.id, username, 'LOGIN_FAILED', 'Akun tidak aktif', ipAddress);
            return res.status(403).json({ success: false, message: 'Akun Anda telah dinonaktifkan. Hubungi Admin lain.' });
        }

        // -- Verifikasi Password (bcrypt) --
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            await logActivity(user.id, username, 'LOGIN_FAILED', 'Password salah', ipAddress);
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        // -- Generate JWT Token --
        const token = jwt.sign(
            {
                id:       user.id,
                username: user.username,
                role:     user.role,
                name:     user.full_name,
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Set cookie HttpOnly
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 8 * 60 * 60 * 1000, // 8 jam
            sameSite: 'strict',
        });

        // -- Catat login berhasil --
        await logActivity(user.id, username, 'LOGIN_SUCCESS', `Login berhasil dari IP ${ipAddress}`, ipAddress);

        return res.json({
            success: true,
            message: `Selamat datang, ${user.full_name}!`,
            role: user.role,
            name: user.full_name,
            redirectUrl: '/dashboard/admin.html',
            token,
        });

    } catch (err) {
        console.error('Error saat login:', err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server. Coba lagi nanti.' });
    }
});

// ============================================================
// POST /api/auth/logout
// ============================================================
router.post('/logout', verifyToken, async (req, res) => {
    const { id, username } = req.user;
    const ipAddress = req.ip || 'unknown';

    await logActivity(id, username, 'LOGOUT', 'User logout', ipAddress);

    res.clearCookie('token');
    return res.json({ success: true, message: 'Logout berhasil.' });
});

// ============================================================
// GET /api/auth/me — Cek session aktif
// ============================================================
router.get('/me', verifyToken, (req, res) => {
    return res.json({
        success: true,
        user: {
            id:       req.user.id,
            username: req.user.username,
            name:     req.user.full_name,
            role:     req.user.role,
        }
    });
});

module.exports = router;
