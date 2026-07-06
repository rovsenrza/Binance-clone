import * as storage from './storage.js?v=20260713';
import * as api from './api.js?v=20260713';
import * as trading from './trading.js?v=20260713';
import * as ui from './ui.js?v=20260713';
import { loadBinanceLogos } from './binance-icons.js?v=20260713';

let currentSymbol = null;
let activeTab = 'positions';
let historyPeriod = '1d';
let updateTimer = null;
let countdownTimer = null;
let slBootstrapTimer = null;

function coinFeedConfigs(coins) {
  return coins.map(c => ({
    symbol: c.symbol,
    apiSymbol: c.apiSymbol || c.symbol,
  }));
}

async function init() {
  try {
    await storage.initStorage();
  } catch (e) {
    console.error(e);
    const msg = String(e?.message || e);
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      ui.showToast('Firestore access denied — publish rules in Firebase Console', 'error');
    } else {
      ui.showToast('Failed to load saved data', 'error');
    }
    return;
  }

  if (storage.isCloudSyncEnabled() && !sessionStorage.getItem('bf_cloud_toast')) {
    sessionStorage.setItem('bf_cloud_toast', '1');
    ui.showToast('Connected to cloud storage', 'success');
  }

  window.addEventListener('storage-remote-update', (e) => {
    handleCloudUpdate(e.detail);
  });

  const coins = storage.getCoins();
  if (coins.length === 0) {
    ui.showToast('No coins configured. Please add coins in the Admin Panel.', 'warning');
    return;
  }

  await loadBinanceLogos();

  currentSymbol = storage.getSelectedCoin() || coins[0].symbol;
  if (!storage.getSelectedCoin() && currentSymbol) {
    storage.setSelectedCoin(currentSymbol);
  }

  api.startPriceFeed(coinFeedConfigs(coins));
  api.onPriceUpdate(onPriceUpdate);

  window.addEventListener('storage-error', (e) => {
    ui.showToast(e.detail?.message || 'Storage full — data may not be saved', 'error');
  });

  bindEvents();
  renderAll();
  ui.initMetricSlider();

  updateTimer = setInterval(monitorLoop, 1000);
  countdownTimer = setInterval(updateCountdown, 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) runTpSlCheck();
  });
  window.addEventListener('focus', () => runTpSlCheck());
  window.addEventListener('pageshow', () => runTpSlCheck());
  window.addEventListener('online', () => runTpSlCheck());

  bootstrapSlMonitor();

  setTimeout(renderAll, 500);
}

function handleCloudUpdate(detail = {}) {
  const coins = storage.getCoins();
  if (coins.length === 0) return;

  const symbols = coins.map(c => c.symbol);
  api.updateFeedSymbols(coinFeedConfigs(coins));

  const remoteCoin = storage.getSelectedCoin();
  if (remoteCoin && symbols.includes(remoteCoin)) {
    currentSymbol = remoteCoin;
  } else if (!symbols.includes(currentSymbol)) {
    currentSymbol = symbols[0];
  }

  renderAll();

  if (detail.fromRemote) {
    ui.showToast('Data updated from another device', 'success');
  }

  runTpSlCheck();
}

function onPriceUpdate(symbol) {
  runTpSlCheck();

  if (symbol === currentSymbol) {
    renderPairAndAccount();
    renderPositions();
    updateCalcFields();
  }
  renderTicker();
}

function runTpSlCheck() {
  const prices = api.getPriceData();
  const closed = trading.checkTpSl(prices);
  if (closed.length > 0) {
    closed.forEach(h => {
      const pnlText = h.realizedPnl >= 0 ? `+${h.realizedPnl.toFixed(2)}` : h.realizedPnl.toFixed(2);
      ui.showToast(`${h.symbol} ${h.direction} closed — PNL: ${pnlText} USDT`, h.realizedPnl >= 0 ? 'success' : 'error');
    });
    renderAll();
  }
}

function bootstrapSlMonitor() {
  let attempts = 0;
  const tryCheck = () => {
    attempts++;
    runTpSlCheck();
    const positions = storage.getPositions();
    if (!positions.length || attempts >= 30) {
      slBootstrapTimer = null;
      return;
    }
    const prices = api.getPriceData();
    const allReady = positions.every(p => prices[p.symbol]?.markPrice > 0);
    if (allReady) {
      slBootstrapTimer = null;
      return;
    }
    slBootstrapTimer = setTimeout(tryCheck, 500);
  };
  tryCheck();
}

function monitorLoop() {
  runTpSlCheck();
}

function updateCountdown() {
  const el = document.getElementById('pair-countdown');
  if (el) el.textContent = api.getFundingCountdown();
}

// --- Rendering ---

function renderAll() {
  renderPairAndAccount();
  renderPositions();
  renderTicker();
  updateCalcFields();
  if (activeTab === 'history') renderHistory();
}

function renderPairAndAccount() {
  ui.renderPairBlock(currentSymbol);

  const prices = api.getPriceData();
  const accountState = trading.calculateAccountState(prices);
  ui.renderAccountBlock(accountState);
  ui.renderAvailableBalance(accountState.availableBalance);
}

function renderPositions() {
  const positions = storage.getPositions();
  const prices = api.getPriceData();
  const settings = storage.getSettings();
  ui.renderPositionsTable(positions, prices, settings);
}

function renderHistory() {
  const items = ui.filterHistory(historyPeriod);
  ui.renderHistoryTable(items);
  updateDateRange();
}

function renderTicker() {
  const coins = storage.getCoins();
  const prices = api.getPriceData();
  ui.renderTickerBar(coins, prices);
}

function updateCalcFields() {
  const sizeInput = document.getElementById('order-size');
  const size = sizeInput ? parseDecimalValue(sizeInput.value) : 0;
  const markPrice = api.getMarkPrice(currentSymbol);
  const settings = storage.getSettings();
  ui.renderCalcFields(size, markPrice, settings, currentSymbol);
}

function updateDateRange() {
  const fromEl = document.getElementById('history-date-from');
  const toEl = document.getElementById('history-date-to');
  if (!fromEl || !toEl) return;

  const now = new Date();
  const msMap = { '1d': 86400000, '1w': 604800000, '1m': 2592000000, '3m': 7776000000 };
  const from = new Date(now.getTime() - (msMap[historyPeriod] || msMap['1d']));
  fromEl.value = formatDate(from);
  toEl.value = formatDate(now);
}

function formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function parseDecimalValue(value) {
  if (value == null || value === '') return NaN;
  return parseFloat(String(value).trim().replace(/,/g, '.'));
}

function bindDecimalInput(input, onInput) {
  if (!input) return;
  input.addEventListener('input', () => {
    const { selectionStart: start, selectionEnd: end } = input;
    const normalized = input.value.replace(/,/g, '.');
    if (input.value !== normalized) {
      input.value = normalized;
      input.setSelectionRange(start, end);
    }
    onInput?.();
  });
}

// --- Event Binding ---

function bindEvents() {
  // Buy/Long
  const btnLong = document.getElementById('btn-buy-long');
  if (btnLong) btnLong.addEventListener('click', () => executeTrade('Long'));

  // Sell/Short
  const btnShort = document.getElementById('btn-sell-short');
  if (btnShort) btnShort.addEventListener('click', () => executeTrade('Short'));

  // Decimal inputs: comma → dot (RU mobile keyboards show comma)
  bindDecimalInput(document.getElementById('order-size'), updateCalcFields);
  bindDecimalInput(document.getElementById('tp-input'));
  bindDecimalInput(document.getElementById('sl-input'));

  // TP/SL toggle
  const tpslCheck = document.getElementById('tpsl-checkbox');
  const tpslFields = document.getElementById('tpsl-fields');
  if (tpslCheck && tpslFields) {
    tpslCheck.addEventListener('change', () => {
      tpslFields.classList.toggle('order-panel__tpsl-fields--visible', tpslCheck.checked);
    });
  }

  // Coin dropdown
  const pairSelector = document.getElementById('pair-selector');
  const pairDropdown = document.getElementById('pair-dropdown');
  if (pairSelector && pairDropdown) {
    pairSelector.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = pairDropdown.hasAttribute('hidden');
      if (isHidden) {
        const coins = storage.getCoins();
        ui.renderCoinDropdown(coins, currentSymbol);
        pairDropdown.removeAttribute('hidden');
      } else {
        pairDropdown.setAttribute('hidden', '');
      }
    });

    pairDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('[data-symbol]');
      if (item) {
        currentSymbol = item.dataset.symbol;
        storage.setSelectedCoin(currentSymbol);
        pairDropdown.setAttribute('hidden', '');
        renderAll();
      }
    });

    document.addEventListener('click', () => {
      pairDropdown.setAttribute('hidden', '');
    });
  }

  // Tab switching
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName === 'positions' || tabName === 'history') {
        activeTab = tabName;
        ui.setActiveTab(tabName);
        if (tabName === 'history') renderHistory();
      }
    });
  });

  // History period filter
  document.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      historyPeriod = btn.dataset.period;
      document.querySelectorAll('[data-period]').forEach(b => {
        b.classList.toggle('history-panel__period--active', b.dataset.period === historyPeriod);
      });
      renderHistory();
    });
  });

  // Position actions (delegated)
  const tbody = document.getElementById('positions-tbody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const shareBtn = e.target.closest('[data-share-position-id]');
      if (shareBtn) {
        const posId = shareBtn.dataset.sharePositionId;
        const pos = storage.getPositions().find(p => p.id === posId);
        if (!pos) return;
        const mp = api.getMarkPrice(pos.symbol);
        if (!mp) {
          ui.showToast('Price not available for ' + pos.symbol, 'error');
          return;
        }
        ui.showShareModalForPosition(pos, mp, storage.getSettings());
        return;
      }

      const closeBtn = e.target.closest('[data-close-id]');
      if (closeBtn) {
        const posId = closeBtn.dataset.closeId;
        const pos = storage.getPositions().find(p => p.id === posId);
        if (!pos) return;
        const mp = api.getMarkPrice(pos.symbol);
        if (!mp) {
          ui.showToast('Price not available for ' + pos.symbol, 'error');
          return;
        }
        trading.closePosition(posId, mp);
        ui.showToast('Position closed', 'success');
        renderAll();
      }
    });
  }

  // Share modal (delegated on history table)
  const historyTbody = document.getElementById('history-tbody');
  if (historyTbody) {
    historyTbody.addEventListener('click', (e) => {
      const shareBtn = e.target.closest('[data-share-id]');
      if (shareBtn) {
        const id = shareBtn.dataset.shareId;
        const history = storage.getHistory();
        const item = history.find(h => (h.historyId || h.id) === id);
        if (item) ui.showShareModal(item);
      }
    });
  }

  ui.initShareModal();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') ui.hideShareModal();
  });
}

// --- Trade Execution ---

function executeTrade(direction) {
  const sizeInput = document.getElementById('order-size');
  const tpInput = document.getElementById('tp-input');
  const slInput = document.getElementById('sl-input');
  const tpslCheck = document.getElementById('tpsl-checkbox');
  const errorEl = document.getElementById('order-error');

  const size = parseDecimalValue(sizeInput?.value);
  const tp = tpslCheck?.checked ? parseDecimalValue(tpInput?.value) : null;
  const sl = tpslCheck?.checked ? parseDecimalValue(slInput?.value) : null;

  if (errorEl) errorEl.textContent = '';

  const result = trading.openPosition({
    symbol: currentSymbol,
    direction,
    sizeUsdt: size,
    tp: isNaN(tp) ? null : tp,
    sl: isNaN(sl) ? null : sl,
  });

  if (result.error) {
    if (errorEl) errorEl.textContent = result.error;
    return;
  }

  if (sizeInput) sizeInput.value = '';
  if (tpInput) tpInput.value = '';
  if (slInput) slInput.value = '';
  if (tpslCheck) tpslCheck.checked = false;
  const tpslFields = document.getElementById('tpsl-fields');
  if (tpslFields) tpslFields.classList.remove('order-panel__tpsl-fields--visible');

  ui.showToast(`${direction} position opened for ${currentSymbol}`, 'success');
  renderAll();
}

// --- Start ---

document.addEventListener('DOMContentLoaded', init);
