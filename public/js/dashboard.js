'use strict';
/**
 * Stock Monitoring — Shared Dashboard Utilities
 */

// ── Session Guard ──────────────────────────────────────────────
function getSession() {
    const s = JSON.parse(localStorage.getItem('sm_session') || 'null');
    if (!s || !s.role) {
        window.location.href = '../index.html';
        return null;
    }
    return s;
}

// ── Logout ─────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('sm_session');
    window.location.href = '../index.html';
}

// ── Toast Notifications ─────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || ''}<span>${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// ── Format Currency ─────────────────────────────────────────────
function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// ── Format Date ─────────────────────────────────────────────────
function formatDate(date) {
    return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Live Clock ──────────────────────────────────────────────────
function startClock(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    const update = () => {
        const now = new Date();
        el.innerHTML = `<strong>${now.toLocaleTimeString('id-ID')}</strong> &nbsp;${now.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}`;
    };
    update();
    setInterval(update, 1000);
}

// ── Populate User Info in Sidebar ──────────────────────────────
function populateSidebarUser(session) {
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = session.name;
    if (roleEl) roleEl.textContent = session.role.charAt(0).toUpperCase() + session.role.slice(1);
    if (avatarEl) {
        avatarEl.className = `sidebar-user-avatar ${session.role}`;
        avatarEl.textContent = session.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }
}

// ── Confirm Dialog ─────────────────────────────────────────────
function confirm(msg) {
    return window.confirm(msg);
}

// ── Number format ──────────────────────────────────────────────
function fmtNum(n) {
    return new Intl.NumberFormat('id-ID').format(n);
}
