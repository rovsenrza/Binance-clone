import * as formulas from './formulas.js';
import * as storage from './storage.js';
import { getTickerData, getFundingCountdown, getConnectionStatus } from './api.js';

const COIN_ICONS = {
  BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg',
  BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
  ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  SOL: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg',
  DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.svg',
  ADA: 'https://cryptologos.cc/logos/cardano-ada-logo.svg',
  AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg',
  DOT: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg',
  MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
};

function el(id) { return document.getElementById(id); }
function qs(sel, parent) { return (parent || document).querySelector(sel); }
function qsa(sel, parent) { return (parent || document).querySelectorAll(sel); }

const SAFE_SYMBOL_RE = /^[A-Z0-9]+$/;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function coinIconHtml(baseAsset, size = 24) {
  const safe = SAFE_SYMBOL_RE.test(baseAsset) ? baseAsset : 'X';
  const url = COIN_ICONS[safe];
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = safe;
    img.width = size;
    img.height = size;
    img.style.borderRadius = '50%';
    const fallback = document.createElement('span');
    fallback.className = 'pair-block__coin-icon';
    fallback.style.cssText = `display:none;width:${size}px;height:${size}px`;
    fallback.textContent = safe[0];
    img.addEventListener('error', () => {
      img.style.display = 'none';
      fallback.style.display = 'flex';
    });
    const wrapper = document.createElement('span');
    wrapper.appendChild(img);
    wrapper.appendChild(fallback);
    return wrapper.innerHTML;
  }
  return `<span class="pair-block__coin-icon" style="width:${size}px;height:${size}px">${escapeHtml(safe[0])}</span>`;
}

function pnlClass(value) {
  if (value > 0) return 'text-long';
  if (value < 0) return 'text-short';
  return '';
}

// --- Toast ---

let toastContainer = null;

export function showToast(message, type = 'error') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Pair Block ---

export function renderPairBlock(symbol, selectedCoin) {
  const data = getTickerData(symbol);
  const coin = storage.getCoinBySymbol(symbol);
  const baseAsset = coin?.baseAsset || symbol.replace('USDT', '');

  const priceEl = el('pair-price');
  const changeEl = el('pair-change');
  const fundingEl = el('pair-funding');
  const countdownEl = el('pair-countdown');
  const highEl = el('pair-high');
  const lowEl = el('pair-low');
  const symbolEl = el('pair-symbol-text');
  const iconEl = el('pair-coin-icon');

  if (symbolEl) symbolEl.textContent = symbol;
  if (iconEl) iconEl.innerHTML = coinIconHtml(baseAsset, 24);

  if (!data) {
    if (priceEl) priceEl.textContent = '--';
    if (changeEl) changeEl.innerHTML = '<span class="text-tertiary">--</span>';
    return;
  }

  const price = data.markPrice || data.lastPrice || 0;
  const precision = coin?.pricePrecision ?? 1;
  const changeNeg = (data.priceChangePercent ?? 0) < 0;
  const colorClass = changeNeg ? 'text-short' : 'text-long';

  if (priceEl) {
    priceEl.textContent = formulas.formatPrice(price, precision);
    priceEl.className = `pair-block__price ${colorClass}`;
  }

  document.title = `${formulas.formatPrice(price, precision)} | ${symbol} Perp`;

  if (changeEl) {
    const absChange = formulas.formatPrice(data.priceChange ?? 0, 1);
    const pctChange = (data.priceChangePercent ?? 0).toFixed(2);
    const sign = changeNeg ? '' : '+';
    changeEl.innerHTML = `<span class="${colorClass}">${sign}${absChange}</span>
                          <span class="${colorClass}">${sign}${pctChange}%</span>`;
  }

  if (fundingEl) {
    const rate = data.fundingRate ?? 0;
    fundingEl.textContent = (rate * 100).toFixed(4) + '%';
  }

  if (countdownEl) {
    countdownEl.textContent = getFundingCountdown();
  }

  if (highEl) highEl.textContent = formulas.formatPrice(data.highPrice ?? 0, precision);
  if (lowEl) lowEl.textContent = formulas.formatPrice(data.lowPrice ?? 0, precision);
}

// --- Account Block ---

export function renderAccountBlock(accountState) {
  const balEl = el('account-balance');
  const unrealEl = el('account-unrealized');

  if (balEl) {
    balEl.textContent = formulas.formatUsd(accountState.balance, 4);
  }
  if (unrealEl) {
    unrealEl.textContent = formulas.formatUsd(accountState.unrealizedPnl, 4);
    unrealEl.className = `account-block__value ${pnlClass(accountState.unrealizedPnl)}`;
  }
}

// --- Available Balance ---

export function renderAvailableBalance(avbl) {
  const avblEl = el('order-avbl');
  if (avblEl) avblEl.textContent = `${formulas.formatPrice(avbl, 2)} USDT`;
}

// --- Calculated Fields ---

export function renderCalcFields(size, markPrice, settings, direction) {
  const liqLongEl = el('calc-liq-long');
  const liqShortEl = el('calc-liq-short');
  const costLongEl = el('calc-cost-long');
  const costShortEl = el('calc-cost-short');
  const maxLongEl = el('calc-max-long');
  const maxShortEl = el('calc-max-short');

  if (!markPrice || !size || size <= 0) {
    [liqLongEl, liqShortEl].forEach(e => { if (e) e.textContent = '-- USDT'; });
    [costLongEl, costShortEl, maxLongEl, maxShortEl].forEach(e => { if (e) e.textContent = '0.00 USDT'; });
    return;
  }

  const leverage = settings.leverage;
  const mmr = settings.mmr;
  const posValue = size;
  const marginVal = formulas.margin(posValue, leverage);
  const feeVal = formulas.openFee(posValue, settings.feeRate);
  const cost = marginVal + feeVal;

  const liqLong = formulas.liqPriceLong(markPrice, leverage, mmr);
  const liqShort = formulas.liqPriceShort(markPrice, leverage, mmr);

  if (liqLongEl) liqLongEl.textContent = formulas.formatPrice(liqLong, 2) + ' USDT';
  if (liqShortEl) liqShortEl.textContent = formulas.formatPrice(liqShort, 2) + ' USDT';
  if (costLongEl) costLongEl.textContent = formulas.formatPrice(cost, 2) + ' USDT';
  if (costShortEl) costShortEl.textContent = formulas.formatPrice(cost, 2) + ' USDT';

  const avbl = formulas.availableBalance(storage.getBalance(), storage.getPositions(), leverage);
  const maxVal = formulas.maxPositionSize(avbl, leverage);
  if (maxLongEl) maxLongEl.textContent = formulas.formatPrice(maxVal, 2) + ' USDT';
  if (maxShortEl) maxShortEl.textContent = formulas.formatPrice(maxVal, 2) + ' USDT';
}

// --- Positions Table ---

export function renderPositionsTable(positions, prices, settings) {
  const tbody = el('positions-tbody');
  const emptyEl = el('positions-empty');
  const countEl = el('tab-positions-count');
  const ordersEl = el('tab-orders-count');

  if (countEl) countEl.textContent = `(${positions.length})`;

  let ordersCount = 0;
  positions.forEach(p => {
    if (p.tp && p.tp > 0) ordersCount++;
    if (p.sl && p.sl > 0) ordersCount++;
  });
  if (ordersEl) ordersEl.textContent = `(${ordersCount})`;

  if (!tbody) return;

  if (positions.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const rows = positions.map(pos => {
    const markPrice = prices[pos.symbol]?.markPrice || pos.entryPrice;
    const metrics = calcPosMetrics(pos, markPrice, settings);
    const coin = storage.getCoinBySymbol(pos.symbol);
    const pricePrecision = coin?.pricePrecision ?? 2;
    const sizeColor = pos.direction === 'Long' ? 'text-long' : 'text-short';
    const pnlColor = pnlClass(metrics.pnl);
    const safeId = escapeHtml(pos.id);
    const safeSymbol = escapeHtml(pos.symbol);

    const markPriceFormatted = formulas.formatPrice(markPrice, pricePrecision);
    const qtyFormatted = formulas.formatQuantity ? formulas.formatQuantity(pos.quantity, coin?.qtyPrecision ?? 3) : pos.quantity;

    return `<tr data-position-id="${safeId}">
      <td><span class="positions-table__size ${sizeColor}">${formulas.formatPrice(pos.sizeUsdt, 2)} USDT</span></td>
      <td>${formulas.formatPrice(pos.entryPrice, pricePrecision)}</td>
      <td>${markPriceFormatted}</td>
      <td>
        <div class="positions-table__pnl">
          <span class="positions-table__pnl-value ${pnlColor}">${formulas.formatPnl(metrics.pnl, 2)} USDT</span>
          <span class="positions-table__pnl-roi ${pnlColor}">${formulas.formatPercent(metrics.roi, 2)}</span>
        </div>
        <span class="positions-table__share">⤴</span>
      </td>
      <td>${formulas.formatPrice(metrics.liqPrice, 2)}</td>
      <td class="positions-table__tpsl">${pos.tp ? formulas.formatPrice(pos.tp, pricePrecision) : '--'} /\n${pos.sl ? formulas.formatPrice(pos.sl, pricePrecision) : '--'}</td>
      <td>
        <div class="positions-table__action">
          <span class="positions-table__action-edit" title="Edit">📋</span>
          <span class="positions-table__action-btn positions-table__action-btn--market"
                data-close-id="${safeId}"
                title="Close at market price"
                style="cursor:pointer">Market</span>
          <span class="positions-table__action-btn positions-table__action-btn--limit">Limit</span>
          <input class="positions-table__action-input" type="text" value="${markPriceFormatted}" readonly>
          <input class="positions-table__action-input" type="text" value="${qtyFormatted}" readonly>
        </div>
      </td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');
}

function calcPosMetrics(pos, markPrice, settings) {
  const posVal = formulas.positionValue(pos.quantity, pos.entryPrice);
  const marginVal = formulas.margin(posVal, pos.leverage);
  const pnlVal = formulas.pnl(pos.direction, pos.entryPrice, markPrice, pos.quantity);
  const roiVal = formulas.roi(pnlVal, marginVal);
  const liqVal = formulas.liqPrice(pos.direction, pos.entryPrice, pos.leverage, settings.mmr);
  return { positionValue: posVal, margin: marginVal, pnl: pnlVal, roi: roiVal, liqPrice: liqVal };
}

// --- History Table ---

export function renderHistoryTable(historyItems) {
  const tbody = el('history-tbody');
  const emptyEl = el('history-empty');

  if (!tbody) return;

  if (historyItems.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const rows = historyItems.map(h => {
    const coin = storage.getCoinBySymbol(h.symbol);
    const baseAsset = escapeHtml(h.baseAsset || h.symbol.replace('USDT', ''));
    const safeSymbol = escapeHtml(h.symbol);
    const safeMode = escapeHtml(h.marginMode);
    const safeDir = escapeHtml(h.direction);
    const dirClass = h.direction === 'Long' ? 'history-table__direction--long' : 'history-table__direction--short';
    const pnlColor = pnlClass(h.realizedPnl);
    const roiColor = pnlClass(h.roiPercent);
    const pricePrecision = coin?.pricePrecision ?? 2;
    const qtyPrecision = coin?.qtyPrecision ?? 3;
    const safeShareId = escapeHtml(h.historyId || h.id);

    return `<tr>
      <td colspan="100%">
        <div style="padding: 8px 0;">
          <div class="history-table__symbol-row" style="margin-bottom: 8px;">
            <span class="history-table__coin-icon history-table__coin-icon--${baseAsset}">${baseAsset[0]}</span>
            <strong>${safeSymbol}</strong>
            <div class="history-table__badges">
              <span class="history-table__badge">Perp</span>
              <span class="history-table__badge">${escapeHtml(h.leverage)}x</span>
              <span class="history-table__direction ${dirClass}">${safeMode} ${safeDir}</span>
              <span class="history-table__status">Closed</span>
              <button class="history-table__share" data-share-id="${safeShareId}" title="Share">⤴</button>
            </div>
            <span style="margin-left:auto;font-size:12px;color:var(--color-text-tertiary)">
              ${formatTime(h.openTime)} Opened &nbsp;&nbsp; ${formatTime(h.closeTime)} Closed
            </span>
          </div>
          <div class="history-table__details">
            <div class="history-table__detail">
              <span class="history-table__detail-label">Realized PNL (USDT)</span>
              <span class="history-table__detail-value ${pnlColor}">${formulas.formatPnl(h.realizedPnl, 2)} USDT</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">ROI</span>
              <span class="history-table__detail-value ${roiColor}">${formulas.formatPercent(h.roiPercent, 2)}</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">Closed Vol. (${baseAsset})</span>
              <span class="history-table__detail-value">${formulas.formatQuantity(h.closedVolume, qtyPrecision)}</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">Entry Price</span>
              <span class="history-table__detail-value">${formulas.formatPrice(h.entryPrice, pricePrecision)}</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">Avg. Close Price</span>
              <span class="history-table__detail-value">${formulas.formatPrice(h.avgClosePrice, pricePrecision)}</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">Max OI (${baseAsset})</span>
              <span class="history-table__detail-value">${formulas.formatQuantity(h.maxOI, qtyPrecision)}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');
}

function formatTime(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// --- History Filtering ---

export function filterHistory(period) {
  const history = storage.getHistory();
  const now = Date.now();
  const msMap = { '1d': 86400000, '1w': 604800000, '1m': 2592000000, '3m': 7776000000 };
  const ms = msMap[period] || msMap['1d'];
  const cutoff = now - ms;
  return history.filter(h => new Date(h.closeTime).getTime() >= cutoff);
}

// --- Coin Dropdown ---

export function renderCoinDropdown(coins, currentSymbol) {
  const dropdown = el('pair-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = coins.map(coin => {
    const safeSym = escapeHtml(coin.symbol);
    const safeBase = escapeHtml(coin.baseAsset);
    const active = coin.symbol === currentSymbol ? 'pair-dropdown__item--active' : '';
    return `<div class="pair-dropdown__item ${active}" data-symbol="${safeSym}">
      <span class="pair-dropdown__item-icon">${safeBase[0]}</span>
      <span>${safeSym} <span style="color:var(--color-text-tertiary)">Perp</span></span>
    </div>`;
  }).join('');
}

// --- Bottom Ticker ---

export function renderTickerBar(coins, prices) {
  const container = el('ticker-items');
  if (!container) return;

  const status = getConnectionStatus();
  const statusDot = status === 'connected' ? 'ticker-bar__connection-dot' : 'ticker-bar__connection-dot ticker-bar__connection-dot--error';
  const statusText = status === 'connected' ? 'Stable connection' : (status === 'reconnecting' ? 'Reconnecting...' : 'Connecting...');

  let html = `<div class="ticker-bar__connection">
    <span class="${statusDot}"></span> ${statusText}
  </div>`;

  coins.forEach(coin => {
    const data = prices[coin.symbol];
    if (!data) return;
    const pct = data.priceChangePercent ?? 0;
    const colorClass = pct >= 0 ? 'text-long' : 'text-short';
    const price = formulas.formatPrice(data.markPrice || data.lastPrice || 0, coin.pricePrecision ?? 1);
    const safeBase = escapeHtml(coin.baseAsset || coin.symbol.replace('USDT', ''));
    html += `<div class="ticker-bar__item">
      <span class="ticker-bar__coin" style="width:14px;height:14px;border-radius:50%;background:#F0B90B;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#1E2329">${safeBase[0]}</span>
      <span class="ticker-bar__symbol">${escapeHtml(coin.symbol)}</span>
      <span class="ticker-bar__change ${colorClass}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>
      <span class="ticker-bar__price">${price}</span>
    </div>`;
  });

  container.innerHTML = html;
}

// --- Share Modal ---

export function showShareModal(historyItem) {
  const overlay = el('share-modal');
  if (!overlay) return;

  const h = historyItem;
  const pColor = h.realizedPnl >= 0 ? 'text-long' : 'text-short';
  const dirClass = h.direction === 'Long' ? 'history-table__direction--long' : 'history-table__direction--short';
  const coin = storage.getCoinBySymbol(h.symbol);
  const pricePrecision = coin?.pricePrecision ?? 2;
  const safeSymbol = escapeHtml(h.symbol);
  const safeMode = escapeHtml(h.marginMode);
  const safeDir = escapeHtml(h.direction);

  const body = qs('.modal__body', overlay);
  if (body) {
    body.innerHTML = `
      <div class="share-modal__content">
        <div class="share-modal__pair">${safeSymbol}</div>
        <span class="share-modal__direction ${dirClass}">${safeMode} ${safeDir} ${escapeHtml(h.leverage)}x</span>
        <div class="share-modal__pnl ${pColor}">${formulas.formatPnl(h.realizedPnl, 4)} USDT</div>
        <div class="share-modal__roi ${pColor}">${formulas.formatPercent(h.roiPercent, 2)}</div>
        <div class="share-modal__grid">
          <div class="share-modal__field">
            <span class="share-modal__field-label">Entry Price</span>
            <span class="share-modal__field-value">${formulas.formatPrice(h.entryPrice, pricePrecision)}</span>
          </div>
          <div class="share-modal__field">
            <span class="share-modal__field-label">Close Price</span>
            <span class="share-modal__field-value">${formulas.formatPrice(h.closePrice, pricePrecision)}</span>
          </div>
          <div class="share-modal__field">
            <span class="share-modal__field-label">Leverage</span>
            <span class="share-modal__field-value">${escapeHtml(h.leverage)}x</span>
          </div>
          <div class="share-modal__field">
            <span class="share-modal__field-label">Direction</span>
            <span class="share-modal__field-value">${safeDir}</span>
          </div>
          <div class="share-modal__field">
            <span class="share-modal__field-label">Open Time</span>
            <span class="share-modal__field-value">${formatTime(h.openTime)}</span>
          </div>
          <div class="share-modal__field">
            <span class="share-modal__field-label">Close Time</span>
            <span class="share-modal__field-value">${formatTime(h.closeTime)}</span>
          </div>
        </div>
      </div>`;
  }

  const previousFocus = document.activeElement;
  overlay.removeAttribute('hidden');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const closeBtn = qs('.modal__close', overlay);
  if (closeBtn) closeBtn.focus();
  overlay._previousFocus = previousFocus;
  overlay._trapHandler = trapFocus.bind(null, overlay);
  overlay.addEventListener('keydown', overlay._trapHandler);
}

function trapFocus(container, e) {
  if (e.key !== 'Tab') return;
  const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

export function hideShareModal() {
  const overlay = el('share-modal');
  if (!overlay) return;
  if (overlay._trapHandler) {
    overlay.removeEventListener('keydown', overlay._trapHandler);
    overlay._trapHandler = null;
  }
  const prev = overlay._previousFocus;
  overlay.setAttribute('hidden', '');
  if (prev && typeof prev.focus === 'function') prev.focus();
}

// --- Tab Switching ---

export function setActiveTab(tabName) {
  const positionsView = el('positions-view');
  const historyView = el('history-view');
  const tabs = qsa('[data-tab]');

  tabs.forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle('tab-bar__tab--active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  if (positionsView) positionsView.style.display = tabName === 'positions' ? '' : 'none';
  if (historyView) historyView.style.display = tabName === 'history' ? '' : 'none';
}
