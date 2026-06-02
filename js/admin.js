import * as storage from './storage.js';

let activeSection = 'coins';
let editingCoinId = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

async function init() {
  try {
    await storage.initStorage();
  } catch (e) {
    console.error(e);
    showAlert(document.getElementById('coin-alert'), 'Failed to load saved data.', 'danger');
    return;
  }

  window.addEventListener('storage-remote-update', (e) => {
    renderAll();
    if (e.detail?.fromRemote) {
      showAlert(document.getElementById('coin-alert'), 'Updated from another device.', 'success');
    }
  });

  bindNav();
  bindCoinForm();
  bindSettings();
  bindReset();
  renderStorageStatus();
  renderAll();
}

function renderStorageStatus() {
  const el = document.getElementById('storage-status');
  if (!el) return;
  el.hidden = false;
  if (storage.isCloudSyncEnabled()) {
    el.textContent = '☁ Live sync — same data on all devices';
    el.className = 'admin-sidebar__storage admin-sidebar__storage--cloud';
  } else {
    el.textContent = '⚠ Cloud off — only this browser';
    el.className = 'admin-sidebar__storage admin-sidebar__storage--local';
  }
}

function renderAll() {
  renderCoinsTable();
  renderSettingsForm();
}

// --- Navigation ---

function bindNav() {
  document.querySelectorAll('[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      activeSection = item.dataset.section;
      document.querySelectorAll('[data-section]').forEach(i => {
        i.classList.toggle('admin-sidebar__nav-item--active', i.dataset.section === activeSection);
      });
      document.querySelectorAll('.admin-section').forEach(sec => {
        sec.hidden = sec.id !== `section-${activeSection}`;
      });
    });
  });
}

// --- Coins Management ---

function renderCoinsTable() {
  const coins = storage.getCoins();
  const tbody = document.getElementById('coins-tbody');
  if (!tbody) return;

  if (coins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">No coins configured. Add one above.</td></tr>`;
    return;
  }

  tbody.innerHTML = coins.map(coin => `
    <tr>
      <td><strong>${escapeHtml(coin.symbol)}</strong></td>
      <td>${escapeHtml(coin.baseAsset)}</td>
      <td>${escapeHtml(coin.quoteAsset)}</td>
      <td>${escapeHtml(coin.displayName)}</td>
      <td>${escapeHtml(coin.apiSymbol || coin.symbol)}</td>
      <td>${coin.pricePrecision ?? 2}</td>
      <td>${coin.qtyPrecision ?? 3}</td>
      <td>
        <div class="admin-table__actions">
          <button class="admin-btn admin-btn--secondary admin-btn--sm" data-edit="${escapeHtml(coin.id)}">Edit</button>
          <button class="admin-btn admin-btn--danger admin-btn--sm" data-delete="${escapeHtml(coin.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => editCoin(btn.dataset.edit));
  });

  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteCoin(btn.dataset.delete));
  });
}

function bindCoinForm() {
  const form = document.getElementById('coin-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCoin();
  });

  const cancelBtn = document.getElementById('coin-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetCoinForm();
    });
  }
}

function saveCoin() {
  const symbol = document.getElementById('coin-symbol')?.value?.trim().toUpperCase();
  const baseAsset = document.getElementById('coin-base')?.value?.trim().toUpperCase();
  const quoteAsset = document.getElementById('coin-quote')?.value?.trim().toUpperCase() || 'USDT';
  const displayName = document.getElementById('coin-display')?.value?.trim();
  const apiSymbol = document.getElementById('coin-api')?.value?.trim().toUpperCase() || symbol;
  const pricePrecision = parseInt(document.getElementById('coin-price-precision')?.value, 10);
  const qtyPrecision = parseInt(document.getElementById('coin-qty-precision')?.value, 10);
  const alertEl = document.getElementById('coin-alert');

  if (!symbol || !baseAsset) {
    showAlert(alertEl, 'Symbol and Base Asset are required.', 'danger');
    return;
  }

  const SYMBOL_RE = /^[A-Z0-9]+$/;
  if (!SYMBOL_RE.test(symbol)) {
    showAlert(alertEl, 'Symbol must contain only uppercase letters and numbers (e.g. BTCUSDT).', 'danger');
    return;
  }
  if (!SYMBOL_RE.test(baseAsset)) {
    showAlert(alertEl, 'Base Asset must contain only uppercase letters and numbers (e.g. BTC).', 'danger');
    return;
  }

  const resolvedPricePrecision = isNaN(pricePrecision) ? 2 : Math.max(0, Math.min(8, pricePrecision));
  const resolvedQtyPrecision = isNaN(qtyPrecision) ? 3 : Math.max(0, Math.min(8, qtyPrecision));
  const coins = storage.getCoins();

  if (editingCoinId) {
    storage.updateCoin(editingCoinId, { symbol, baseAsset, quoteAsset, displayName, apiSymbol, pricePrecision: resolvedPricePrecision, qtyPrecision: resolvedQtyPrecision });
    showAlert(alertEl, `${symbol} updated successfully.`, 'success');
  } else {
    const exists = coins.find(c => c.symbol === symbol);
    if (exists) {
      showAlert(alertEl, `${symbol} already exists.`, 'danger');
      return;
    }
    storage.addCoin({
      symbol, baseAsset, quoteAsset,
      displayName: displayName || baseAsset,
      apiSymbol,
      pricePrecision: resolvedPricePrecision,
      qtyPrecision: resolvedQtyPrecision,
    });
    showAlert(alertEl, `${symbol} added successfully.`, 'success');
  }

  resetCoinForm();
  renderCoinsTable();
}

function editCoin(id) {
  const coins = storage.getCoins();
  const coin = coins.find(c => c.id === id);
  if (!coin) return;

  editingCoinId = id;
  document.getElementById('coin-symbol').value = coin.symbol;
  document.getElementById('coin-base').value = coin.baseAsset;
  document.getElementById('coin-quote').value = coin.quoteAsset;
  document.getElementById('coin-display').value = coin.displayName || '';
  document.getElementById('coin-api').value = coin.apiSymbol || coin.symbol;
  document.getElementById('coin-price-precision').value = coin.pricePrecision ?? 2;
  document.getElementById('coin-qty-precision').value = coin.qtyPrecision ?? 3;

  const submitBtn = document.getElementById('coin-submit');
  if (submitBtn) submitBtn.textContent = 'Update Coin';

  document.getElementById('coin-form')?.scrollIntoView({ behavior: 'smooth' });
}

function deleteCoin(id) {
  const coin = storage.getCoins().find(c => c.id === id);
  if (!coin) return;

  const positions = storage.getPositions().filter(p => p.symbol === coin.symbol);

  if (positions.length > 0) {
    const msg = `${coin.symbol} has ${positions.length} open position(s). You must close all positions before deleting this coin.`;
    const alertEl = document.getElementById('coin-alert');
    showAlert(alertEl, msg, 'danger');
    return;
  }

  if (!confirm(`Delete ${coin.symbol}?`)) return;
  storage.deleteCoin(id);
  renderCoinsTable();
}

function resetCoinForm() {
  editingCoinId = null;
  const form = document.getElementById('coin-form');
  if (form) form.reset();
  const submitBtn = document.getElementById('coin-submit');
  if (submitBtn) submitBtn.textContent = 'Add Coin';
}

// --- Settings ---

function renderSettingsForm() {
  const settings = storage.getSettings();
  const balInput = document.getElementById('setting-balance');
  const feeInput = document.getElementById('setting-fee');
  const levInput = document.getElementById('setting-leverage');
  const mmrInput = document.getElementById('setting-mmr');

  if (balInput) balInput.value = settings.initialBalance;
  if (feeInput) feeInput.value = (settings.feeRate * 100).toFixed(2);
  if (levInput) levInput.value = settings.leverage;
  if (mmrInput) mmrInput.value = (settings.mmr * 100).toFixed(2);
}

function bindSettings() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('settings-alert');
    const initialBalance = parseFloat(document.getElementById('setting-balance')?.value);
    const feePercent = parseFloat(document.getElementById('setting-fee')?.value);
    const leverage = parseInt(document.getElementById('setting-leverage')?.value, 10);
    const mmrPercent = parseFloat(document.getElementById('setting-mmr')?.value);

    if (isNaN(initialBalance) || initialBalance <= 0) {
      showAlert(alertEl, 'Initial Balance must be > 0.', 'danger');
      return;
    }
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
      showAlert(alertEl, 'Fee Rate must be 0–100%.', 'danger');
      return;
    }
    if (isNaN(leverage) || leverage < 1) {
      showAlert(alertEl, 'Leverage must be >= 1.', 'danger');
      return;
    }
    if (isNaN(mmrPercent) || mmrPercent < 0 || mmrPercent > 50) {
      showAlert(alertEl, 'MMR must be 0–50%.', 'danger');
      return;
    }

    storage.setSettings({
      initialBalance,
      feeRate: feePercent / 100,
      leverage,
      mmr: mmrPercent / 100,
    });

    showAlert(alertEl, 'Settings saved successfully.', 'success');
  });
}

// --- Reset ---

function bindReset() {
  const resetBtn = document.getElementById('btn-reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Are you sure? This will delete all positions and reset the balance. Coin configurations and settings will be preserved.')) return;
      storage.resetAllData();
      const alertEl = document.getElementById('reset-alert');
      showAlert(alertEl, 'All trading data has been reset.', 'success');
    });
  }

  const resetAllBtn = document.getElementById('btn-reset-all');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', async () => {
      if (!confirm('⚠️ This will delete EVERYTHING including coins and settings. Are you absolutely sure?')) return;
      await storage.resetEverything();
      renderAll();
      const alertEl = document.getElementById('reset-alert');
      showAlert(alertEl, 'All data including coins and settings has been reset to defaults.', 'success');
    });
  }
}

// --- Helpers ---

function showAlert(el, message, type) {
  if (!el) return;
  el.className = `admin-alert admin-alert--${type}`;
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 4000);
}

document.addEventListener('DOMContentLoaded', init);
