'use strict';
/**
 * Stock Monitoring — Login (Frontend-Only Mode)
 * Bekerja tanpa backend, menggunakan localStorage sebagai session.
 * Ketika backend sudah siap, ganti bagian DEMO_ACCOUNTS dengan fetch API.
 */

// ── Role Config ────────────────────────────────────────────────
// Sistem ini hanya menggunakan role Admin (role_code = 01)
// Kode lainnya dipertahankan di format username
// namun tidak diizinkan login ke sistem ini.
const ROLE_MAP = {
    '01': { label: 'Admin', cssClass: 'admin', color: '#6366f1' },
};
const CITY_MAP = {
    '01': 'Jakarta', '02': 'Surabaya', '03': 'Bandung',
    '04': 'Medan', '05': 'Semarang', '06': 'Makassar',
    '07': 'Palembang', '08': 'Denpasar', '09': 'Yogyakarta', '10': 'Batam',
};
const REDIRECT_MAP = {
    admin: 'dashboard/admin.html',
};

// ── DOM ────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const loginForm = $('login-form');
const usernameInput = $('username');
const passwordInput = $('password');
const togglePassword = $('toggle-password');
const iconEye = $('icon-eye');
const iconEyeOff = $('icon-eye-off');
const btnLogin = $('btn-login');
const btnText = $('btn-text');
const btnIcon = $('btn-icon');
const btnSpinner = $('btn-spinner');
const alertBox = $('alert-box');
const roleDetector = $('role-detector');
const roleDetectorTxt = $('role-detector-text');
const roleDetectorBadge = $('role-detector-badge');
const usernameError = $('username-error');
const passwordError = $('password-error');
const strengthWrap = $('strength-wrap');
const strengthLabel = $('strength-label');
const bars = [1, 2, 3, 4].map(i => $(`bar-${i}`));
const digitGroups = document.querySelectorAll('.digit-group');
const digitGroupsWrap = document.querySelector('.digit-groups');
const clockTime = $('clock-time');
const clockDate = $('clock-date');

// ── Cek session aktif → langsung redirect ─────────────────────
(function checkSession() {
    const session = JSON.parse(localStorage.getItem('sm_session') || 'null');
    if (session && session.role && REDIRECT_MAP[session.role]) {
        window.location.href = REDIRECT_MAP[session.role];
    }
})();

// ── Particles ──────────────────────────────────────────────────
(function initParticles() {
    const canvas = $('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    class P {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.r = Math.random() * 1.4 + 0.3;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.op = Math.random() * 0.4 + 0.1;
            this.hue = 220 + Math.random() * 60;
        }
        update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset(); }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${this.hue},70%,70%,${this.op})`; ctx.fill(); }
    }

    for (let i = 0; i < 100; i++) particles.push(new P());
    const animate = () => { ctx.clearRect(0, 0, W, H); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); };
    animate();
})();

// ── Clock ──────────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    clockTime.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clockDate.textContent = now.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

// ── Username Input → Role Detector ────────────────────────────
usernameInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 8);
    const raw = this.value;

    const parts = [
        raw.slice(0, 2).padEnd(2, '_'),
        raw.slice(2, 4).padEnd(2, '_'),
        raw.slice(4, 6).padEnd(2, '_'),
        raw.slice(6, 8).padEnd(2, '_'),
    ];
    digitGroups.forEach((el, i) => { el.textContent = parts[i]; });
    raw.length > 0 ? digitGroupsWrap.classList.add('show') : digitGroupsWrap.classList.remove('show');

    if (raw.length === 8) {
        const roleCode = raw.slice(4, 6);
        const role = ROLE_MAP[roleCode];
        const city = CITY_MAP[raw.slice(0, 2)] || `Kota ${raw.slice(0, 2)}`;
        const branch = parseInt(raw.slice(2, 4));
        const seq = parseInt(raw.slice(6, 8));

        if (role) {
            roleDetectorTxt.textContent = `${city} · Cabang ke-${branch} · No. Urut ${seq}`;
            roleDetectorBadge.textContent = role.label;
            roleDetectorBadge.className = `role-detector-badge ${role.cssClass}`;
            roleDetectorBadge.removeAttribute('style');
            roleDetector.style.borderColor = role.color + '55';
            usernameInput.classList.replace('is-invalid', 'is-valid') || usernameInput.classList.add('is-valid');
            usernameError.classList.remove('show');
        } else {
            roleDetectorTxt.textContent = 'Akses ditolak. Sistem ini hanya untuk Admin (digit 5-6 = 01)';
            roleDetectorBadge.textContent = '✕ Bukan Admin';
            roleDetectorBadge.className = 'role-detector-badge';
            roleDetectorBadge.style.cssText = 'background:hsla(0,72%,58%,.2);color:#f87171;border:1px solid hsla(0,72%,58%,.4)';
            usernameInput.classList.replace('is-valid', 'is-invalid') || usernameInput.classList.add('is-invalid');
        }
    } else {
        roleDetectorTxt.textContent = raw.length === 0 ? 'Masukkan username untuk deteksi role' : `${raw.length}/8 digit...`;
        roleDetectorBadge.textContent = '';
        roleDetectorBadge.className = 'role-detector-badge';
        roleDetectorBadge.removeAttribute('style');
        roleDetector.style.borderColor = '';
        usernameInput.classList.remove('is-valid', 'is-invalid');
    }
    clearAlert();
});

// ── Password Strength ──────────────────────────────────────────
passwordInput.addEventListener('input', function () {
    const v = this.value;
    if (!v) { strengthWrap.classList.remove('show'); return; }
    strengthWrap.classList.add('show');
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const cls = ['', 'active-weak', 'active-weak', 'active-medium', 'active-strong'];
    const lbl = ['', 'Lemah', 'Lemah', 'Sedang', 'Kuat 💪'];
    bars.forEach((b, i) => { b.className = 'strength-bar'; if (i < score) b.classList.add(cls[score]); });
    strengthLabel.textContent = lbl[score] || '';
    clearAlert();
});

// ── Show/Hide Password ─────────────────────────────────────────
togglePassword.addEventListener('click', () => {
    const hide = passwordInput.type === 'password';
    passwordInput.type = hide ? 'text' : 'password';
    iconEye.style.display = hide ? 'none' : '';
    iconEyeOff.style.display = hide ? '' : 'none';
    passwordInput.focus();
});

// ── Form Submit ────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(); clearAlert();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    let err = false;

    if (!/^\d{8}$/.test(username)) {
        showFieldErr('username-error', 'Username harus tepat 8 digit angka.');
        usernameInput.classList.add('is-invalid'); err = true;
    }
    if (password.length < 8) {
        showFieldErr('password-error', 'Password minimal 8 karakter.');
        passwordInput.classList.add('is-invalid'); err = true;
    }
    if (err) return;

    const roleCode = username.slice(4, 6);
    if (!ROLE_MAP[roleCode]) {
        showFieldErr('username-error', 'Akses ditolak. Sistem ini hanya untuk Admin (digit 5-6 harus 01).');
        usernameInput.classList.add('is-invalid'); return;
    }

    setLoading(true);

    try {
        // ── Panggil API backend ────────────────────────────────
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',   // penting: agar cookie token tersimpan
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!data.success) {
            setLoading(false);
            showAlert(`❌ ${data.message}`, 'error');
            passwordInput.classList.add('is-invalid');
            passwordInput.value = '';          // hapus password yang salah
            strengthWrap.classList.remove('show'); // sembunyikan strength bar
            passwordInput.focus();             // fokus kembali ke field password
            return;
        }

        // ── Simpan info session di localStorage (bukan token, token ada di cookie) ──
        localStorage.setItem('sm_session', JSON.stringify({
            username,
            role: data.role,
            name: data.name,
            loginAt: new Date().toISOString(),
        }));

        // Ubah tombol menjadi "Successful!" sebelum redirect
        btnText.textContent = 'Successful!';
        btnIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        btnIcon.style.display = '';
        btnSpinner.style.display = 'none';

        setTimeout(() => { window.location.href = data.redirectUrl; }, 900);

    } catch (err) {
        setLoading(false);
        showAlert('❌ Tidak dapat terhubung ke server. Pastikan server berjalan.', 'error');
        passwordInput.value = '';
        strengthWrap.classList.remove('show');
        passwordInput.focus();
    }
});

// ── Helpers ────────────────────────────────────────────────────
function setLoading(on) {
    btnLogin.disabled = on;
    btnText.textContent = on ? 'Memverifikasi...' : 'Masuk';
    btnIcon.style.display = on ? 'none' : '';
    btnSpinner.style.display = on ? '' : 'none';
}
function showAlert(msg, type = 'error') {
    alertBox.textContent = msg;
    alertBox.className = `alert-box ${type}`;
    alertBox.style.display = 'block';
}
function clearAlert() { alertBox.style.display = 'none'; }
function showFieldErr(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg; el.classList.add('show');
}
function clearErrors() {
    ['username-error', 'password-error'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('show');
    });
    usernameInput.classList.remove('is-invalid', 'is-valid');
    passwordInput.classList.remove('is-invalid');
}

// Auto-focus
window.addEventListener('load', () => usernameInput.focus());
