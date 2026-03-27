'use strict';

// ── Cek Session (hanya Admin) ─────────────────────────────────
const session = getSession();
if (!session || session.role !== 'admin') {
  showToast('Akses ditolak. Halaman ini hanya untuk Admin.', 'error');
  setTimeout(() => logout(), 1500);
}
populateSidebarUser(session);
startClock('topbar-clock');
document.getElementById('welcome-name').textContent = session?.name || 'Admin';

// ── State Global ──────────────────────────────────────────────
let products = [];
let logData  = [];
let logTotal = 0;
const LOG_PAGE_SIZE = 50;
let logOffset = 0;

// ── Helper: icon kategori ─────────────────────────────────────
function getCategoryIcon(cat) {
  const map = { Makanan: '🍜', Minuman: '🥤', Kebersihan: '🧴', Elektronik: '📱' };
  return map[cat] || '📦';
}

// ── Helper: badge status stok ─────────────────────────────────
function stockBadge(p) {
  if (p.stock <= 0)           return '<span class="badge badge-red">Habis</span>';
  if (p.stock <= p.minStock)  return '<span class="badge badge-amber">Tipis</span>';
  return '<span class="badge badge-green">OK</span>';
}

// ── Helper: badge jenis log ───────────────────────────────────
function changeTypeBadge(type) {
  const map = {
    'MASUK':      '<span class="badge badge-green">↑ MASUK</span>',
    'KELUAR':     '<span class="badge badge-red">↓ KELUAR</span>',
    'PRODUK_BARU':'<span class="badge badge-blue">★ PRODUK BARU</span>',
    'HAPUS_PRODUK':'<span class="badge badge-red">🗑️ HAPUS</span>',
  };
  return map[type] || `<span class="badge">${type}</span>`;
}

// ──────────────────────────────────────────────────────────────
// LOAD PRODUCTS dari API
// ──────────────────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res  = await fetch('/api/products', { credentials: 'include' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    products = json.data.map(p => ({
      id:       p.id,
      name:     p.name,
      sku:      p.sku || '',
      category: p.category || 'Lainnya',
      icon:     getCategoryIcon(p.category),
      unit:     p.unit || 'pcs',
      price:    parseFloat(p.price),
      stock:    p.stock,
      minStock: p.minimum_stock,
    }));

    renderAll();
    populateDropdowns();
    updateNotifBadge();
  } catch (err) {
    showToast('Gagal memuat data produk: ' + err.message, 'error');
  }
}

// ──────────────────────────────────────────────────────────────
// RENDER FUNCTIONS
// ──────────────────────────────────────────────────────────────
function renderAll() {
  renderDaftarTable();
  renderNotifPage();
}



// ── Notif Badge ───────────────────────────────────────────────
function updateNotifBadge(count) {
  const c = (count !== undefined) ? count : products.filter(p => p.stock <= p.minStock).length;
  const badge1 = document.getElementById('notif-badge');
  const badge2 = document.getElementById('header-notif-badge');
  if (c > 0) {
    badge1.textContent = c; badge1.style.display = '';
    badge2.textContent = c; badge2.style.display = '';
  } else {
    badge1.style.display = 'none';
    badge2.style.display = 'none';
  }
}

// ── Notifikasi Page ───────────────────────────────────────────
function renderNotifPage() {
  const alerts = products.filter(p => p.stock <= p.minStock);
  let html = '';
  if (alerts.length) {
    html += `<div class="card"><div class="card-header"><div class="card-title">⚠️ Perlu Perhatian (${alerts.length} produk)</div></div>`;
    html += alerts.map(p => {
      const isEmpty = p.stock <= 0;
      const pct = p.minStock > 0 ? Math.min(Math.round(p.stock / p.minStock * 100), 100) : 0;
      return `<div class="notif-item">
        <div class="notif-icon ${isEmpty ? 'critical' : 'warning'}">${p.icon}</div>
        <div style="flex:1">
          <div class="notif-title">${p.name} <span style="font-size:.72rem;color:var(--text-muted)">(SKU: ${p.sku || '-'})</span></div>
          <div class="notif-detail">Stok Saat Ini: <strong style="color:${isEmpty ? 'var(--accent-red)' : 'var(--accent-amber)'}">
            ${p.stock} ${p.unit}</strong> / Min: ${p.minStock} ${p.unit}</div>
          <div class="notif-stock-bar" style="margin-top:6px">
            <div class="notif-stock-fill" style="width:${pct}%;background:${isEmpty ? 'var(--accent-red)' : 'var(--accent-amber)'}"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          <span class="badge ${isEmpty ? 'badge-red' : 'badge-amber'}">${isEmpty ? 'HABIS' : 'TIPIS'}</span>
          ${isEmpty ? `<button class="btn btn-sm btn-danger" onclick="confirmDeleteProduct(${p.id})">🗑️ Buang</button>` : ''}
        </div>
      </div>`;
    }).join('');
    html += '</div>';
  } else {
    html = '<div class="alert alert-success">✅ Semua stok dalam kondisi aman! Tidak ada peringatan.</div>';
  }
  document.getElementById('notif-content').innerHTML = html;
}

// ──────────────────────────────────────────────────────────────
// DAFTAR TABLE (dengan search & filter)
// ──────────────────────────────────────────────────────────────
function renderDaftarTable() {
  const q   = (document.getElementById('daftar-search')?.value || '').toLowerCase();
  const cat = document.getElementById('daftar-category')?.value || '';
  const list = products.filter(p =>
    (!q   || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
    (!cat || p.category === cat)
  );

  const tbody = document.getElementById('daftar-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Produk tidak ditemukan</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${p.icon} ${p.name}</td>
      <td style="font-family:monospace;font-size:.76rem;color:var(--text-secondary)">${p.sku || '-'}</td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td>${formatRupiah(p.price)}</td>
      <td style="font-weight:700;color:${p.stock <= 0 ? 'var(--accent-red)' : p.stock <= p.minStock ? 'var(--accent-amber)' : 'var(--accent-green)'}">
        ${p.stock} ${p.unit}
      </td>
      <td>${p.minStock} ${p.unit}</td>
      <td>${stockBadge(p)}</td>
      <td>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-sm btn-secondary" onclick="openEditModal(${p.id})" title="Edit Info">✏️ Edit Info</button>
        </div>
      </td>
    </tr>`).join('');
}

function filterDaftar() { renderDaftarTable(); }

// ──────────────────────────────────────────────────────────────
// BARANG MASUK
// ──────────────────────────────────────────────────────────────
function populateDropdowns() {
  const opts = '<option value="">-- Pilih Barang --</option>' +
    products.map(p => `<option value="${p.id}">${p.icon} ${p.name} (Stok: ${p.stock} ${p.unit})</option>`).join('');
  document.getElementById('masuk-product-id').innerHTML  = opts;
  document.getElementById('keluar-product-id').innerHTML = opts;
}

function fillMasukInfo() {
  const id  = parseInt(document.getElementById('masuk-product-id').value);
  const wrap = document.getElementById('masuk-info-wrap');
  if (!id) { wrap.style.display = 'none'; return; }
  const p = products.find(x => x.id === id);
  if (!p) return;
  wrap.style.display = 'block';
  document.getElementById('masuk-info-box').innerHTML = `
    <div class="restock-info-row"><span>Produk</span><strong>${p.icon} ${p.name}</strong></div>
    <div class="restock-info-row"><span>SKU</span><strong>${p.sku || '-'}</strong></div>
    <div class="restock-info-row"><span>Stok Saat Ini</span>
      <strong style="color:${p.stock <= p.minStock ? 'var(--accent-amber)' : 'var(--accent-green)'}">
        ${p.stock} ${p.unit}
      </strong>
    </div>
    <div class="restock-info-row"><span>Stok Minimum</span><strong>${p.minStock} ${p.unit}</strong></div>
    <div class="restock-info-row"><span>Kategori</span><strong>${p.category}</strong></div>`;
}

let pendingMasuk = null;

function processMasuk() {
  const id  = parseInt(document.getElementById('masuk-product-id').value);
  const qty = parseInt(document.getElementById('masuk-qty').value);
  const note = document.getElementById('masuk-note').value || '';

  if (!id)        { showToast('Pilih barang terlebih dahulu!', 'error'); return; }
  if (!qty || qty < 1) { showToast('Jumlah minimal 1!', 'error'); return; }

  const p = products.find(x => x.id === id);
  if (!p) return;

  pendingMasuk = { id, qty, note, name: p.name, unit: p.unit, stock: p.stock };
  document.getElementById('confirm-masuk-text').innerHTML =
    `Anda akan menambahkan stok <strong>${p.name}</strong> sebesar <strong>${qty} ${p.unit}</strong>.<br>
     Total stok setelah ditambahkan: <strong>${p.stock + qty} ${p.unit}</strong>.`;
  document.getElementById('modal-confirm-masuk').style.display = 'flex';
}

async function confirmMasuk() {
  if (!pendingMasuk) return;
  const { id, qty, note } = pendingMasuk;
  closeConfirmMasuk();

  const btn = document.getElementById('btn-masuk');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  try {
    const res  = await fetch(`/api/products/${id}/restock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ qty, note }),
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    showToast(`✅ Berhasil menambah ${qty} unit barang`, 'success');
    document.getElementById('masuk-product-id').value = '';
    document.getElementById('masuk-qty').value = '';
    document.getElementById('masuk-note').value = '';
    document.getElementById('masuk-info-wrap').style.display = 'none';
    pendingMasuk = null;

    await loadProducts();
    await loadMasukLog();
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Konfirmasi Barang Masuk';
  }
}

function closeConfirmMasuk() {
  document.getElementById('modal-confirm-masuk').style.display = 'none';
}

function quickMasuk(id) {
  showSection('masuk');
  document.getElementById('masuk-product-id').value = id;
  fillMasukInfo();
  document.getElementById('masuk-qty').focus();
}

async function loadMasukLog() {
  try {
    const res  = await fetch('/api/products/logs?limit=100', { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;

    const masukRows = json.data.filter(r => r.change_type === 'MASUK');
    const tbody = document.getElementById('masuk-log-tbody');
    if (!masukRows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada data barang masuk</td></tr>';
      return;
    }
    tbody.innerHTML = masukRows.map(r => `
      <tr>
        <td>${fmtDateTime(r.created_at)}</td>
        <td>${r.product_name}</td>
        <td style="font-family:monospace;font-size:.74rem">${r.product_sku || '-'}</td>
        <td style="color:var(--accent-green);font-weight:700">+${r.qty_change}</td>
        <td>${r.stock_before}</td>
        <td style="font-weight:700">${r.stock_after}</td>
        <td style="color:var(--text-muted)">${r.note || '-'}</td>
        <td style="font-family:monospace;font-size:.74rem">${r.username}</td>
      </tr>`).join('');
  } catch (err) {
    console.error('Gagal memuat log masuk:', err);
  }
}

// ──────────────────────────────────────────────────────────────
// BARANG KELUAR
// ──────────────────────────────────────────────────────────────
let pendingKeluar = null;

function fillKeluarInfo() {
  const id  = parseInt(document.getElementById('keluar-product-id').value);
  const wrap = document.getElementById('keluar-info-wrap');
  if (!id) { wrap.style.display = 'none'; return; }
  const p = products.find(x => x.id === id);
  if (!p) return;
  wrap.style.display = 'block';
  document.getElementById('keluar-info-box').innerHTML = `
    <div class="restock-info-row"><span>Produk</span><strong>${p.icon} ${p.name}</strong></div>
    <div class="restock-info-row"><span>SKU</span><strong>${p.sku || '-'}</strong></div>
    <div class="restock-info-row"><span>Stok Saat Ini</span>
      <strong style="color:${p.stock <= 0 ? 'var(--accent-red)' : p.stock <= p.minStock ? 'var(--accent-amber)' : 'var(--accent-green)'}">
        ${p.stock} ${p.unit}
      </strong>
    </div>
    <div class="restock-info-row"><span>Stok Minimum</span><strong>${p.minStock} ${p.unit}</strong></div>`;
}

function processKeluar() {
  const id  = parseInt(document.getElementById('keluar-product-id').value);
  const qty = parseInt(document.getElementById('keluar-qty').value);
  const note = document.getElementById('keluar-note').value || '';

  if (!id)        { showToast('Pilih barang terlebih dahulu!', 'error'); return; }
  if (!qty || qty < 1) { showToast('Jumlah minimal 1!', 'error'); return; }

  const p = products.find(x => x.id === id);
  if (!p) return;

  if (p.stock < qty) {
    showToast(`Stok ${p.name} tidak cukup! (tersisa ${p.stock} ${p.unit})`, 'error');
    return;
  }

  // Konfirmasi sebelum eksekusi
  pendingKeluar = { id, qty, note, productName: p.name, unit: p.unit, stock: p.stock };
  document.getElementById('confirm-keluar-text').innerHTML =
    `Anda akan mengurangi stok <strong>${p.name}</strong> sebesar <strong>${qty} ${p.unit}</strong>.<br>
     Stok tersisa: <strong>${p.stock - qty} ${p.unit}</strong>.
     ${p.stock - qty <= p.minStock ? '<br><span style="color:var(--accent-amber)">⚠️ Stok akan mencapai/di bawah batas minimum!</span>' : ''}`;
  document.getElementById('modal-confirm-keluar').style.display = 'flex';
}

async function confirmKeluar() {
  if (!pendingKeluar) return;
  const { id, qty, note } = pendingKeluar;
  closeConfirmKeluar();

  const btn = document.getElementById('btn-keluar');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  try {
    const res  = await fetch(`/api/products/${id}/reduce`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ qty, note }),
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    showToast(`✅ Berhasil mengurangi ${qty} unit barang`, 'success');
    document.getElementById('keluar-product-id').value = '';
    document.getElementById('keluar-qty').value = '';
    document.getElementById('keluar-note').value = '';
    document.getElementById('keluar-info-wrap').style.display = 'none';
    pendingKeluar = null;

    await loadProducts();
    await loadKeluarLog();
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Konfirmasi Barang Keluar';
  }
}

function closeConfirmKeluar() {
  document.getElementById('modal-confirm-keluar').style.display = 'none';
}

function quickKeluar(id) {
  showSection('keluar');
  document.getElementById('keluar-product-id').value = id;
  fillKeluarInfo();
  document.getElementById('keluar-qty').focus();
}

async function loadKeluarLog() {
  try {
    const res  = await fetch('/api/products/logs?limit=100', { credentials: 'include' });
    const json = await res.json();
    if (!json.success) return;

    const keluarRows = json.data.filter(r => r.change_type === 'KELUAR');
    const tbody = document.getElementById('keluar-log-tbody');
    if (!keluarRows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada data barang keluar</td></tr>';
      return;
    }
    tbody.innerHTML = keluarRows.map(r => `
      <tr>
        <td>${fmtDateTime(r.created_at)}</td>
        <td>${r.product_name}</td>
        <td style="font-family:monospace;font-size:.74rem">${r.product_sku || '-'}</td>
        <td style="color:var(--accent-red);font-weight:700">${r.qty_change}</td>
        <td>${r.stock_before}</td>
        <td style="font-weight:700">${r.stock_after}</td>
        <td style="color:var(--text-muted)">${r.note || '-'}</td>
        <td style="font-family:monospace;font-size:.74rem">${r.username}</td>
      </tr>`).join('');
  } catch (err) {
    console.error('Gagal memuat log keluar:', err);
  }
}

// ──────────────────────────────────────────────────────────────
// TAMBAH PRODUK BARU
// ──────────────────────────────────────────────────────────────
async function addNewProduct() {
  const name     = document.getElementById('new-name').value.trim();
  const sku      = document.getElementById('new-sku').value.trim();
  const category = document.getElementById('new-category').value;
  const unit     = document.getElementById('new-unit').value.trim() || 'pcs';
  const price    = parseFloat(document.getElementById('new-price').value);
  const stock    = parseInt(document.getElementById('new-stock').value) || 0;
  const minStock = parseInt(document.getElementById('new-min-stock').value) || 10;

  if (!name)      { showToast('Nama produk wajib diisi!', 'error'); return; }
  if (!price || price < 0) { showToast('Harga harus diisi dan valid!', 'error'); return; }

  const btn = document.getElementById('btn-add-product');
  btn.disabled = true; btn.textContent = 'Menyimpan...';

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, sku, category, unit, price, stock, minimum_stock: minStock }),
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    showToast(`✅ Produk "${name}" berhasil didaftarkan!`, 'success');
    resetNewProductForm();
    await loadProducts();
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Daftarkan Produk';
  }
}

function resetNewProductForm() {
  ['new-name','new-sku','new-price','new-stock'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('new-unit').value     = 'pcs';
  document.getElementById('new-min-stock').value = '10';
  document.getElementById('new-category').value  = 'Makanan';
}

// ──────────────────────────────────────────────────────────────
// EDIT PRODUK (hanya nama, harga, min stok — bukan stok langsung)
// ──────────────────────────────────────────────────────────────
function openEditModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-id').value        = id;
  document.getElementById('edit-name').value      = p.name;
  document.getElementById('edit-price').value     = p.price;
  document.getElementById('edit-min-stock').value = p.minStock;
  document.getElementById('modal-edit').style.display = 'flex';
}
function closeEditModal() { document.getElementById('modal-edit').style.display = 'none'; }

async function saveEdit() {
  const id       = parseInt(document.getElementById('edit-id').value);
  const name     = document.getElementById('edit-name').value.trim();
  const price    = parseFloat(document.getElementById('edit-price').value);
  const minStock = parseInt(document.getElementById('edit-min-stock').value);

  const btn = document.getElementById('btn-save-edit');
  btn.disabled = true;

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, price, minimum_stock: minStock }),
    });
    const json = await res.json();
    if (!json.success) { showToast(json.message, 'error'); return; }

    showToast('✅ Produk berhasil diperbarui!', 'success');
    closeEditModal();
    await loadProducts();
  } catch (err) {
    showToast('Gagal menyimpan perubahan.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ──────────────────────────────────────────────────────────────
// HAPUS PRODUK
// ──────────────────────────────────────────────────────────────
let pendingHapusId = null;

function confirmDeleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  
  pendingHapusId = id;
  document.getElementById('confirm-hapus-text').innerHTML = 
    `Apakah Anda yakin ingin membuang produk <strong>${p.name}</strong>?<br>Sistem hanya akan menyembunyikannya (tidak aktif / soft delete) sehingga riwayat laporannya tetap valid di daftar log.`;
  document.getElementById('modal-confirm-hapus').style.display = 'flex';
}

function closeConfirmHapus() {
  document.getElementById('modal-confirm-hapus').style.display = 'none';
  pendingHapusId = null;
}

async function executeDeleteProduct() {
  if (!pendingHapusId) return;
  
  const btn = document.getElementById('btn-confirm-hapus');
  btn.disabled = true; 
  btn.textContent = 'Membuang...';

  try {
    const res = await fetch(`/api/products/${pendingHapusId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.message, 'error');
      return;
    }
    showToast('✅ Berhasil membuang barang dari sistem', 'success');
    closeConfirmHapus();
    await loadProducts();
    await loadLogs();
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ya, Buang';
  }
}

// ──────────────────────────────────────────────────────────────
// SYSTEM LOG (Immutable — dibuat otomatis oleh sistem)
// ──────────────────────────────────────────────────────────────
async function loadLogs() {
  const filterType = document.getElementById('log-filter-type')?.value || '';
  const tbody = document.getElementById('log-tbody');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--text-muted)">Memuat log...</td></tr>';

  try {
    const url = `/api/products/logs?limit=${LOG_PAGE_SIZE}&offset=${logOffset}`;
    const res  = await fetch(url, { credentials: 'include' });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    logData  = filterType ? json.data.filter(r => r.change_type === filterType) : json.data;
    logTotal = json.total;

    if (!logData.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text-muted)">Tidak ada data log</td></tr>';
      return;
    }

    tbody.innerHTML = logData.map((r, i) => `
      <tr>
        <td style="font-family:monospace;font-size:.74rem;color:var(--text-muted)">${r.id}</td>
        <td style="white-space:nowrap">${fmtDateTime(r.created_at)}</td>
        <td>${changeTypeBadge(r.change_type)}</td>
        <td>${r.product_name}</td>
        <td style="font-family:monospace;font-size:.74rem">${r.product_sku || '-'}</td>
        <td style="font-weight:700;color:${r.qty_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
          ${r.qty_change > 0 ? '+' : ''}${r.qty_change}
        </td>
        <td>${r.stock_before}</td>
        <td style="font-weight:700">${r.stock_after}</td>
        <td style="color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.note||''}">${r.note || '-'}</td>
        <td style="font-family:monospace;font-size:.74rem">${r.username}</td>
      </tr>`).join('');

    renderLogPagination();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--accent-red)">Gagal memuat log: ${err.message}</td></tr>`;
  }
}

function renderLogPagination() {
  const container = document.getElementById('log-pagination');
  const totalPages = Math.ceil(logTotal / LOG_PAGE_SIZE);
  const currentPage = Math.floor(logOffset / LOG_PAGE_SIZE) + 1;
  container.innerHTML = `
    <span style="color:var(--text-muted);font-size:.8rem">Total: ${logTotal} entri</span>
    <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
      <button class="btn btn-sm btn-secondary" onclick="logOffset=Math.max(0,logOffset-${LOG_PAGE_SIZE});loadLogs()"
        ${logOffset === 0 ? 'disabled' : ''}>‹ Prev</button>
      <span style="font-size:.8rem">Hal ${currentPage} / ${totalPages || 1}</span>
      <button class="btn btn-sm btn-secondary" onclick="logOffset+=${LOG_PAGE_SIZE};loadLogs()"
        ${logOffset + LOG_PAGE_SIZE >= logTotal ? 'disabled' : ''}>Next ›</button>
    </div>`;
}

// ──────────────────────────────────────────────────────────────
// CEK LAPORAN CHART
// ──────────────────────────────────────────────────────────────
let laporanChart = null;

async function checkLoadLaporan() {
  const startDate = document.getElementById('laporan-start-date').value;
  const endDate = document.getElementById('laporan-end-date').value;
  const msgEl = document.getElementById('laporan-empty-msg');
  
  if (!startDate || !endDate) {
      if (msgEl) msgEl.style.display = 'inline';
      
      // Kosongkan chart jika sebelumnya ada
      if (laporanChart) {
          laporanChart.destroy();
          laporanChart = null;
      }
      return;
  }
  
  if (startDate > endDate) {
      showToast('Tanggal "Dari" tidak boleh lebih besar dari "Sampai".', 'error');
      if (laporanChart) {
          laporanChart.destroy();
          laporanChart = null;
      }
      return;
  }
  
  if (msgEl) msgEl.style.display = 'none';
  await loadLaporan(startDate, endDate);
}

async function loadLaporan(startDate, endDate) {
  try {
    const res = await fetch(`/api/stats/report?startDate=${startDate}&endDate=${endDate}`, { credentials: 'include' });
    const json = await res.json();
    
    if (!json.success) {
      showToast(json.message || 'Gagal memuat laporan', 'error');
      return;
    }
    
    const labels = json.data.map(item => item.product_name);
    const data = json.data.map(item => Number(item.total_habis));
    
    const ctx = document.getElementById('laporanChart');
    if (!ctx) return;

    if (laporanChart) {
      laporanChart.destroy();
    }
    
    laporanChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Jumlah Barang Keluar/Habis',
          data: data,
          backgroundColor: 'hsla(0, 72%, 58%, 0.85)',
          borderColor: 'hsla(0, 72%, 58%, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Total Keluar: ${context.parsed.y} unit`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });

  } catch (err) {
    showToast('Gagal memuat chart', 'error');
  }
}

// ──────────────────────────────────────────────────────────────
// NAVIGASI SECTION
// ──────────────────────────────────────────────────────────────
const SECTIONS = ['notifikasi','daftar','masuk','keluar','tambah-produk','laporan','log'];

function setActiveNav(name) {
  SECTIONS.forEach(s => {
    const el = document.getElementById(`nav-${s}`);
    if (el) el.classList.toggle('active', s === name);
  });
}

function showSection(name) {
  SECTIONS.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = s === name ? 'block' : 'none';
  });
  setActiveNav(name);

  const titles = {
    'notifikasi':    'Notifikasi Stok',
    'daftar':        'Daftar Barang',
    'masuk':         'Barang Masuk',
    'keluar':        'Barang Keluar',
    'tambah-produk': 'Daftarkan Produk Baru',
    'laporan':       'Cek Laporan',
    'log':           'Log Sistem',
  };
  document.getElementById('page-title').textContent = titles[name] || name;

  // Side effects saat membuka section
  if (name === 'notifikasi')    renderNotifPage();
  if (name === 'daftar')        renderDaftarTable();
  if (name === 'masuk')         loadMasukLog();
  if (name === 'keluar')        loadKeluarLog();
  if (name === 'laporan')       checkLoadLaporan();
  if (name === 'log')           { logOffset = 0; loadLogs(); }
}

// ──────────────────────────────────────────────────────────────
// HELPER: Format tanggal-waktu
// ──────────────────────────────────────────────────────────────
function fmtDateTime(dt) {
  return new Date(dt).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ──────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────
loadProducts();
