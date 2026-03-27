const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Static Files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/stats',    require('./routes/stats'));

// ── Halaman Login (root) ──────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Halaman Dashboard Admin ───────────────────────────────────
app.get('/dashboard/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'admin.html'));
});

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║         STOCK MONITORING SYSTEM              ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Server berjalan di: http://localhost:${PORT}   ║`);
    console.log('║  Role aktif: Admin                           ║');
    console.log('║  Tekan Ctrl+C untuk menghentikan server      ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
