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

function indicatorClassFromPnl(pnl, direction) {
  if (pnl > 0) return 'text-long';
  if (pnl < 0) return 'text-short';
  return direction === 'Long' ? 'text-long' : 'text-short';
}

function formatSizeValue(sizeUsdt, direction, precision = 2) {
  const formatted = formulas.formatPrice(sizeUsdt, precision);
  return direction === 'Short' ? `-${formatted}` : formatted;
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
  const markEl = el('pair-mark');
  const indexEl = el('pair-index');
  const volBaseEl = el('pair-vol-base');
  const volBaseLabel = el('pair-vol-base-label');
  const volQuoteEl = el('pair-vol-quote');
  const oiEl = el('pair-open-interest');
  const symbolEl = el('pair-symbol-text');
  const iconEl = el('pair-coin-icon');

  if (symbolEl) symbolEl.textContent = symbol;
  if (iconEl) iconEl.innerHTML = coinIconHtml(baseAsset, 24);
  if (volBaseLabel) volBaseLabel.textContent = `24h Vol(${baseAsset})`;

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

  document.title = `${formulas.formatPrice(price, precision)} | ${symbol} USDⓈ-Margined Perpetual Chart | Binance Futures`;

  if (changeEl) {
    const absChange = formulas.formatPrice(data.priceChange ?? 0, 1);
    const pctChange = (data.priceChangePercent ?? 0).toFixed(2);
    const sign = changeNeg ? '' : '+';
    changeEl.innerHTML = `<span class="${colorClass}">${sign}${absChange}</span>
                          <span class="${colorClass}">${sign}${pctChange}%</span>`;
  }

  if (markEl) markEl.textContent = formulas.formatPrice(data.markPrice ?? 0, precision);
  if (indexEl) indexEl.textContent = data.indexPrice ? formulas.formatPrice(data.indexPrice, precision) : '--';

  if (fundingEl) {
    const rate = data.fundingRate ?? 0;
    const fundingColor = rate >= 0 ? 'text-long' : 'text-short';
    fundingEl.textContent = (rate * 100).toFixed(4) + '%';
    fundingEl.className = fundingColor;
  }

  if (countdownEl) {
    countdownEl.textContent = getFundingCountdown();
  }

  if (highEl) highEl.textContent = formulas.formatPrice(data.highPrice ?? 0, precision);
  if (lowEl) lowEl.textContent = formulas.formatPrice(data.lowPrice ?? 0, precision);

  if (volBaseEl && data.volume != null) {
    volBaseEl.textContent = formulas.formatLargeNumber(data.volume);
  }
  if (volQuoteEl && data.quoteVolume != null) {
    volQuoteEl.textContent = formulas.formatLargeNumber(data.quoteVolume);
  }
  if (oiEl && data.openInterest != null && price > 0) {
    oiEl.textContent = formulas.formatLargeNumber(data.openInterest * price);
  }
}

export function initMetricSlider() {
  const scrollEl = el('pair-metrics-scroll');
  const prevBtn = el('metrics-prev');
  const nextBtn = el('metrics-next');
  if (!scrollEl || !prevBtn || !nextBtn) return;

  function updateChevrons() {
    const atStart = scrollEl.scrollLeft <= 1;
    const atEnd = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 1;
    prevBtn.classList.toggle('metric-bar__chevron--hidden', atStart);
    nextBtn.classList.toggle('metric-bar__chevron--hidden', atEnd);
  }

  prevBtn.addEventListener('click', () => scrollEl.scrollBy({ left: -220, behavior: 'smooth' }));
  nextBtn.addEventListener('click', () => scrollEl.scrollBy({ left: 220, behavior: 'smooth' }));
  scrollEl.addEventListener('scroll', updateChevrons, { passive: true });
  updateChevrons();
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

export function renderCalcFields(size, markPrice, settings, symbol) {
  const liqLongEl = el('calc-liq-long');
  const liqShortEl = el('calc-liq-short');
  const costLongEl = el('calc-cost-long');
  const costShortEl = el('calc-cost-short');
  const maxLongEl = el('calc-max-long');
  const maxShortEl = el('calc-max-short');

  const leverage = settings.leverage;
  const avbl = formulas.availableBalance(storage.getBalance(), storage.getPositions(), leverage);
  const maxVal = formulas.maxPositionSize(avbl, leverage);
  if (maxLongEl) maxLongEl.textContent = formulas.formatPrice(maxVal, 2) + ' USDT';
  if (maxShortEl) maxShortEl.textContent = formulas.formatPrice(maxVal, 2) + ' USDT';

  if (!markPrice || !size || size <= 0) {
    [liqLongEl, liqShortEl].forEach(e => { if (e) e.textContent = '-- USDT'; });
    [costLongEl, costShortEl].forEach(e => { if (e) e.textContent = '0.00 USDT'; });
    return;
  }

  const mmr = symbol ? storage.getCoinMmr(symbol) : 0.005;
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
}

// --- Positions Table ---

export function renderPositionsTable(positions, prices, settings) {
  const container = el('positions-tbody');
  const emptyEl = el('positions-empty');
  const headerEl = document.querySelector('.positions-header');
  const countEl = el('tab-positions-count');
  const ordersEl = el('tab-orders-count');

  if (countEl) countEl.textContent = `(${positions.length})`;

  let ordersCount = 0;
  positions.forEach(p => {
    if (p.tp && p.tp > 0) ordersCount++;
    if (p.sl && p.sl > 0) ordersCount++;
  });
  if (ordersEl) ordersEl.textContent = `(${ordersCount})`;

  if (!container) return;

  if (positions.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (headerEl) headerEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (headerEl) headerEl.style.display = 'flex';

  const feeRate = settings.feeRate ?? 0.0004;

  const rows = positions.map(pos => {
    const markPrice = prices[pos.symbol]?.markPrice || pos.entryPrice;
    const fundingRate = prices[pos.symbol]?.fundingRate ?? pos.fundingRate ?? 0;
    const mmr = storage.getCoinMmr(pos.symbol);
    const metrics = calcPosMetrics(pos, markPrice, settings, fundingRate, feeRate, mmr);
    const coin = storage.getCoinBySymbol(pos.symbol);
    const pricePrecision = coin?.pricePrecision ?? 2;
    const pnlColor = pnlClass(metrics.pnl);
    const roiColor = pnlClass(metrics.pnl);
    const sizeColor = indicatorClassFromPnl(metrics.pnl, pos.direction);
    const barClass = pos.direction === 'Long'
      ? 'positions-row__direction-bar--long'
      : 'positions-row__direction-bar--short';
    const safeId = escapeHtml(pos.id);
    const safeSymbol = escapeHtml(pos.symbol);
    const safeLeverage = escapeHtml(String(pos.leverage));
    const markPriceFormatted = formulas.formatPrice(markPrice, pricePrecision);
    const qtyFormatted = formulas.formatQuantity(pos.quantity, coin?.qtyPrecision ?? 3);
    const sizeFormatted = formatSizeValue(metrics.currentSizeUsdt, pos.direction, 2);
    const tpVal = pos.tp ? formulas.formatPrice(pos.tp, pricePrecision) : '--';
    const slVal = pos.sl ? formulas.formatPrice(pos.sl, pricePrecision) : '--';

    return `<div class="positions-row" data-position-id="${safeId}">
      <div class="positions-row__col positions-row__col--symbol">
        <div class="positions-row__symbol">
          <span class="positions-row__direction-bar ${barClass}"></span>
          <div class="positions-row__symbol-info">
            <span class="positions-row__symbol-name">${safeSymbol}</span>
            <span class="positions-row__symbol-meta">
              <span class="positions-row__tag">Perp</span>
              <span class="positions-row__tag">${safeLeverage}x</span>
            </span>
          </div>
        </div>
      </div>
      <div class="positions-row__col positions-row__col--size">
        <div class="positions-table__size ${sizeColor}">
          <span class="positions-table__size-value ${sizeColor}">${sizeFormatted}</span>
          <span class="positions-table__size-unit ${sizeColor}">USDT</span>
        </div>
      </div>
      <div class="positions-row__col positions-row__col--entry">${formulas.formatPrice(pos.entryPrice, pricePrecision)}</div>
      <div class="positions-row__col positions-row__col--mark">${markPriceFormatted}</div>
      <div class="positions-row__col positions-row__col--pnl">
        <div class="positions-table__pnl-wrap">
          <div class="positions-table__pnl">
            <span class="positions-table__pnl-value ${pnlColor}">${formulas.formatPnl(metrics.pnl, 2)} USDT</span>
            <span class="positions-table__pnl-roi ${roiColor}">${formulas.formatPercent(metrics.roi, 2)}</span>
          </div>
          <button class="positions-table__share" data-share-position-id="${safeId}" type="button" title="Share" aria-label="Share position">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 512 512"><path d="M361.824 344.395c-24.531 0-46.633 10.593-61.972 27.445l-137.973-85.453A83.321 83.321 0 0 0 167.605 256a83.29 83.29 0 0 0-5.726-30.387l137.973-85.457c15.34 16.852 37.441 27.45 61.972 27.45 46.211 0 83.805-37.594 83.805-83.805C445.629 37.59 408.035 0 361.824 0c-46.21 0-83.804 37.594-83.804 83.805a83.403 83.403 0 0 0 5.726 30.386l-137.969 85.454c-15.34-16.852-37.441-27.45-61.972-27.45C37.594 172.195 0 209.793 0 256c0 46.21 37.594 83.805 83.805 83.805 24.53 0 46.633-10.594 61.972-27.45l137.97 85.454a83.408 83.408 0 0 0-5.727 30.39c0 46.207 37.593 83.801 83.804 83.801s83.805-37.594 83.805-83.8c0-46.212-37.594-83.805-83.805-83.805zm-53.246-260.59c0-29.36 23.887-53.246 53.246-53.246s53.246 23.886 53.246 53.246c0 29.36-23.886 53.246-53.246 53.246s-53.246-23.887-53.246-53.246zM83.805 309.246c-29.364 0-53.25-23.887-53.25-53.246s23.886-53.246 53.25-53.246c29.36 0 53.242 23.887 53.242 53.246s-23.883 53.246-53.242 53.246zm224.773 118.95c0-29.36 23.887-53.247 53.246-53.247s53.246 23.887 53.246 53.246c0 29.36-23.886 53.246-53.246 53.246s-53.246-23.886-53.246-53.246z" fill="currentColor"></path></svg>
          </button>
        </div>
      </div>
      <div class="positions-row__col positions-row__col--liq"><span class="positions-table__liq">${formulas.formatPrice(metrics.liqPrice, 2)}</span></div>
      <div class="positions-row__col positions-row__col--tpsl">
        <div class="positions-table__tpsl">
          <div class="positions-table__tpsl-values">
            <span>${tpVal} /</span>
            <span>${slVal}</span>
          </div>
          <img class="positions-table__tpsl-edit" src="assets/icons/edit-text.svg" width="13" height="13" alt="" aria-hidden="true">
        </div>
      </div>
      <div class="positions-row__col positions-row__col--close">
        <div class="positions-table__action">
          <span class="positions-table__action-btn positions-table__action-btn--market"
                data-close-id="${safeId}"
                title="Close at market price"
                style="cursor:pointer">Market</span>
          <span class="positions-header__sep"></span>
          <span class="positions-table__action-btn positions-table__action-btn--limit">Limit</span>
          <input class="positions-table__action-input"
                 data-close-price="${safeId}"
                 type="number"
                 value="${formulas.formatPrice(markPrice, pricePrecision).replace(/,/g, '')}"
                 step="any" />
          <input class="positions-table__action-input"
                 data-close-qty="${safeId}"
                 type="number"
                 value="${formulas.formatQuantity(pos.quantity, coin?.qtyPrecision ?? 3)}"
                 step="any" />
        </div>
      </div>
    </div>`;
  });

  container.innerHTML = rows.join('');
}

function calcPosMetrics(pos, markPrice, settings, fundingRate = 0, feeRate = 0.0004, mmr = 0.005) {
  const posVal = formulas.positionValue(pos.quantity, pos.entryPrice);
  const currentSizeUsdt = formulas.positionValue(pos.quantity, markPrice);
  const marginVal = formulas.margin(posVal, pos.leverage);
  const pnlVal = formulas.pnl(pos.direction, pos.entryPrice, markPrice, pos.quantity);
  const openFeeAmount = pos.openFee ?? formulas.openFee(posVal, feeRate);
  const netUnrealized = formulas.netUnrealizedPnl(
    pos.direction, pos.entryPrice, markPrice, pos.quantity,
    openFeeAmount, feeRate, fundingRate,
  );
  const roiVal = formulas.roi(pnlVal, marginVal);
  const liqVal = formulas.liqPrice(pos.direction, pos.entryPrice, pos.leverage, mmr);
  const breakEven = pos.direction === 'Long'
    ? pos.entryPrice + openFeeAmount / pos.quantity
    : pos.entryPrice - openFeeAmount / pos.quantity;
  const maintMargin = posVal * mmr;
  const marginRatio = marginVal > 0
    ? `${((maintMargin / marginVal) * 100).toFixed(2)}%`
    : '--';
  const estFunding = formulas.funding(posVal, fundingRate);
  return {
    positionValue: posVal,
    currentSizeUsdt,
    margin: marginVal,
    pnl: pnlVal,
    netUnrealized,
    roi: roiVal,
    liqPrice: liqVal,
    breakEven,
    marginRatio,
    estFunding,
  };
}

// --- History Table ---

export function renderHistoryTable(historyItems) {
  const tbody = el('history-tbody');
  const emptyEl = el('history-empty');

  if (!tbody) return;

  if (historyItems.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    const table = tbody.closest('.history-table');
    if (table) table.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  const table = tbody.closest('.history-table');
  if (table) table.style.display = '';

  const rows = historyItems.map(h => {
    const coin = storage.getCoinBySymbol(h.symbol);
    const baseAsset = h.baseAsset || h.symbol.replace('USDT', '');
    const safeBaseAsset = escapeHtml(baseAsset);
    const safeSymbol = escapeHtml(h.symbol);
    const safeMode = escapeHtml(h.marginMode || 'Cross');
    const safeDir = escapeHtml(h.direction);
    const dirClass = h.direction === 'Long' ? 'history-table__direction--long' : 'history-table__direction--short';
    const pnlColor = pnlClass(h.realizedPnl);
    const roiColor = pnlClass(h.realizedPnl);
    const pricePrecision = coin?.pricePrecision ?? 2;
    const qtyPrecision = coin?.qtyPrecision ?? 3;
    const safeShareId = escapeHtml(h.historyId || h.id);

    return `<tr>
      <td colspan="100%">
        <div class="history-table__row">
          <div class="history-table__header">
            <div class="history-table__header-left">
              <span class="history-table__coin">${coinIconHtml(baseAsset, 20)}</span>
              <span class="history-table__symbol">${safeSymbol}</span>
              <span class="history-table__tag">Perp</span>
              <span class="history-table__tag">${escapeHtml(h.leverage)}x</span>
              <span class="history-table__direction ${dirClass}">${safeMode} ${safeDir}</span>
              <span class="history-panel__divider"></span>
              <span class="history-table__status">Closed</span>
              <span class="history-panel__divider"></span>
              <button class="history-table__share" data-share-id="${safeShareId}" title="Share" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 512 512"><path d="M361.824 344.395c-24.531 0-46.633 10.593-61.972 27.445l-137.973-85.453A83.321 83.321 0 0 0 167.605 256a83.29 83.29 0 0 0-5.726-30.387l137.973-85.457c15.34 16.852 37.441 27.45 61.972 27.45 46.211 0 83.805-37.594 83.805-83.805C445.629 37.59 408.035 0 361.824 0c-46.21 0-83.804 37.594-83.804 83.805a83.403 83.403 0 0 0 5.726 30.386l-137.969 85.454c-15.34-16.852-37.441-27.45-61.972-27.45C37.594 172.195 0 209.793 0 256c0 46.21 37.594 83.805 83.805 83.805 24.53 0 46.633-10.594 61.972-27.45l137.97 85.454a83.408 83.408 0 0 0-5.727 30.39c0 46.207 37.593 83.801 83.804 83.801s83.805-37.594 83.805-83.8c0-46.212-37.594-83.805-83.805-83.805zm-53.246-260.59c0-29.36 23.887-53.246 53.246-53.246s53.246 23.886 53.246 53.246c0 29.36-23.886 53.246-53.246 53.246s-53.246-23.887-53.246-53.246zM83.805 309.246c-29.364 0-53.25-23.887-53.25-53.246s23.886-53.246 53.25-53.246c29.36 0 53.242 23.887 53.242 53.246s-23.883 53.246-53.242 53.246zm224.773 118.95c0-29.36 23.887-53.247 53.246-53.247s53.246 23.887 53.246 53.246c0 29.36-23.886 53.246-53.246 53.246s-53.246-23.886-53.246-53.246z" fill="currentColor"></path></svg>
              </button>
            </div>
            <div class="history-table__times">
              <span>${formatTime(h.openTime)} Opened</span>
              <span class="history-table__times-sep">|</span>
              <span>${formatTime(h.closeTime)} Closed</span>
            </div>
          </div>
          <div class="history-table__details">
            <div class="history-table__detail">
              <span class="history-table__detail-label history-table__detail-label--pnl">Realized PNL (USDT)</span>
              <span class="history-table__detail-value ${pnlColor}">${formulas.formatPnl(h.realizedPnl, 2)} USDT</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">ROI</span>
              <span class="history-table__detail-value ${roiColor}">${formulas.formatPercent(h.roiPercent, 2)}</span>
            </div>
            <div class="history-table__detail">
              <span class="history-table__detail-label">Closed Vol. (${safeBaseAsset})</span>
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
              <span class="history-table__detail-label">Max OI (${safeBaseAsset})</span>
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
    const baseAsset = coin.baseAsset || coin.symbol.replace('USDT', '');
    const active = coin.symbol === currentSymbol ? 'pair-dropdown__item--active' : '';
    return `<div class="pair-dropdown__item ${active}" data-symbol="${safeSym}">
      <span class="pair-dropdown__item-icon">${coinIconHtml(baseAsset, 20)}</span>
      <span>${safeSym} <span style="color:var(--color-text-tertiary)">Perp</span></span>
    </div>`;
  }).join('');
}

// --- Bottom Ticker ---

const TICKER_WIFI_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.923 3.097c2.11 0 4.19.445 5.97 1.19 1.77.741 3.309 1.805 4.273 3.091a.901.901 0 01-1.44 1.08c-.716-.954-1.951-1.851-3.527-2.51a13.877 13.877 0 00-5.276-1.05c-1.866 0-3.71.394-5.275 1.05-1.576.659-2.812 1.556-3.528 2.51a.9.9 0 11-1.44-1.08c.965-1.286 2.502-2.35 4.273-3.09a15.678 15.678 0 015.97-1.191z" fill="currentColor"></path><path d="M11.923 8.139c2.518 0 5.16 1.072 7 2.726l.358.338.062.068a.9.9 0 01-1.267 1.267l-.068-.062-.294-.278c-1.519-1.362-3.734-2.259-5.791-2.259-2.195 0-4.57 1.02-6.086 2.537a.9.9 0 01-1.274-1.273c1.845-1.844 4.674-3.064 7.36-3.064zM11.922 13.18c1.82 0 3.096.59 4.277 1.557l.234.198.067.063a.9.9 0 01-1.174 1.353l-.073-.058-.37-.303c-.86-.665-1.72-1.01-2.961-1.01-1.42.001-2.338.45-3.33 1.313l-.074.058a.9.9 0 01-1.108-1.416l.235-.198c1.18-.967 2.457-1.557 4.277-1.557z" fill="currentColor"></path><circle cx="11.992" cy="19.192" r="1.75" fill="currentColor"></circle></svg>`;

function buildTickerItemHtml(coin, data) {
  const pct = data.priceChangePercent ?? 0;
  const colorClass = pct >= 0 ? 'text-long' : 'text-short';
  const price = formulas.formatPrice(data.markPrice || data.lastPrice || 0, coin.pricePrecision ?? 1);
  const baseAsset = coin.baseAsset || coin.symbol.replace('USDT', '');
  const safeSymbol = escapeHtml(coin.symbol);
  return `<div class="ticker-bar__item" data-ticker-symbol="${safeSymbol}">
    <span class="ticker-bar__coin">${coinIconHtml(baseAsset, 14)}</span>
    <span class="ticker-bar__symbol">${safeSymbol}</span>
    <span class="ticker-bar__change ${colorClass}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>
    <span class="ticker-bar__price">${price}</span>
  </div>`;
}

function updateTickerConnection(status) {
  const iconEl = document.querySelector('.ticker-bar__connection-icon');
  const textEl = el('ticker-connection-text');
  const connected = status === 'connected';
  if (iconEl) {
    iconEl.classList.toggle('ticker-bar__connection-icon--error', !connected);
    iconEl.innerHTML = TICKER_WIFI_SVG;
  }
  if (textEl) {
    textEl.textContent = connected
      ? 'Stable connection'
      : (status === 'reconnecting' ? 'Reconnecting...' : 'Connecting...');
  }
}

export function renderTickerBar(coins, prices) {
  const track = el('ticker-track');
  if (!track) return;

  const status = getConnectionStatus();
  updateTickerConnection(status);

  const activeCoins = coins.filter(coin => prices[coin.symbol]);
  const itemsHtml = activeCoins.map(coin => buildTickerItemHtml(coin, prices[coin.symbol])).join('');
  const coinKey = activeCoins.map(c => c.symbol).join(',');

  if (track.dataset.coinKey === coinKey && track.querySelector('.ticker-bar__set')) {
    activeCoins.forEach(coin => {
      const data = prices[coin.symbol];
      const pct = data.priceChangePercent ?? 0;
      const colorClass = pct >= 0 ? 'text-long' : 'text-short';
      const price = formulas.formatPrice(data.markPrice || data.lastPrice || 0, coin.pricePrecision ?? 1);
      track.querySelectorAll(`[data-ticker-symbol="${coin.symbol}"]`).forEach(item => {
        const changeEl = item.querySelector('.ticker-bar__change');
        const priceEl = item.querySelector('.ticker-bar__price');
        if (changeEl) {
          changeEl.className = `ticker-bar__change ${colorClass}`;
          changeEl.textContent = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        }
        if (priceEl) priceEl.textContent = price;
      });
    });
    return;
  }

  track.dataset.coinKey = coinKey;
  track.innerHTML = `
    <div class="ticker-bar__set">${itemsHtml}</div>
    <div class="ticker-bar__set" aria-hidden="true">${itemsHtml}</div>`;
}

// --- Share Card ---

const SHARE_USERNAME = 'shortplays';
const SHARE_REFERRAL_CODE = '1251827823';
const SHARE_QR_SRC = 'https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https%3A%2F%2Fwww.binance.com';
const SHARE_FAVICON_SRC = 'https://bin.bnbstatic.com/static/images/common/favicon.ico';
const SHARE_AVATAR_SRC = 'assets/icons/share-avatar.png';
const SHARE_LOGO_SRC = 'assets/icons/lightlogo.png';

function formatShareDate() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildShareCardHtml({ symbol, direction, leverage, entryPrice, secondPrice, secondPriceLabel, pnl, pricePrecision }) {
  const pColor = pnl >= 0 ? 'text-long' : 'text-short';
  const dirClass = direction === 'Long' ? 'share-card__direction--long' : 'share-card__direction--short';
  const safeSymbol = escapeHtml(symbol);
  const safeDir = escapeHtml(direction);
  const safeLeverage = escapeHtml(String(leverage));
  const safeSecondLabel = escapeHtml(secondPriceLabel);

  return `
    <img class="share-card__watermark" src="${SHARE_FAVICON_SRC}" alt="" aria-hidden="true">
    <div class="share-card__header">
      <img class="share-card__avatar" src="${SHARE_AVATAR_SRC}" alt="" width="36" height="36">
      <div class="share-card__user">
        <span class="share-card__username">${SHARE_USERNAME}</span>
        <span class="share-card__date">${formatShareDate()}</span>
      </div>
    </div>
    <div class="share-card__pair">${safeSymbol} Perpetual</div>
    <div class="share-card__meta">
      <span class="share-card__direction ${dirClass}">${safeDir}</span>
      <span class="share-card__leverage"> | ${safeLeverage}x</span>
    </div>
    <div class="share-card__pnl">
      <span class="share-card__pnl-value ${pColor}">${formulas.formatPnl(pnl, 2)}</span>
      <span class="share-card__pnl-unit">USDT</span>
    </div>
    <div class="share-card__prices">
      <div class="share-card__price-col">
        <span class="share-card__price-label">Entry Price</span>
        <span class="share-card__price-value">${formulas.formatPrice(entryPrice, pricePrecision)}</span>
      </div>
      <div class="share-card__price-col">
        <span class="share-card__price-label">${safeSecondLabel}</span>
        <span class="share-card__price-value">${formulas.formatPrice(secondPrice, pricePrecision)}</span>
      </div>
    </div>
    <div class="share-card__footer">
      <div class="share-card__brand">
        <img class="share-card__logo-img" src="${SHARE_LOGO_SRC}" alt="Binance Futures" width="120" height="32">
        <span class="share-card__referral">Referral code ${SHARE_REFERRAL_CODE}</span>
      </div>
      <div class="share-card__qr">
        <img src="${SHARE_QR_SRC}" width="64" height="64" alt="Binance QR code">
      </div>
    </div>`;
}

function openShareOverlay(html) {
  const overlay = el('share-modal');
  const body = el('share-card-body');
  if (!overlay || !body) return;

  body.innerHTML = html;

  const previousFocus = document.activeElement;
  overlay.removeAttribute('hidden');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const closeBtn = qs('.share-overlay__close', overlay);
  if (closeBtn) closeBtn.focus();
  overlay._previousFocus = previousFocus;
  overlay._trapHandler = trapFocus.bind(null, overlay);
  overlay.addEventListener('keydown', overlay._trapHandler);
}

export function showShareModalForHistory(historyItem) {
  const coin = storage.getCoinBySymbol(historyItem.symbol);
  const pricePrecision = coin?.pricePrecision ?? 2;
  openShareOverlay(buildShareCardHtml({
    symbol: historyItem.symbol,
    direction: historyItem.direction,
    leverage: historyItem.leverage,
    entryPrice: historyItem.entryPrice,
    secondPrice: historyItem.closePrice,
    secondPriceLabel: 'Exit Price',
    pnl: historyItem.realizedPnl,
    pricePrecision,
  }));
}

export function showShareModalForPosition(position, markPrice, settings) {
  const coin = storage.getCoinBySymbol(position.symbol);
  const pricePrecision = coin?.pricePrecision ?? 2;
  const feeRate = settings.feeRate ?? 0.0004;
  const fundingRate = getTickerData(position.symbol)?.fundingRate ?? position.fundingRate ?? 0;
  const mmr = storage.getCoinMmr(position.symbol);
  const metrics = calcPosMetrics(position, markPrice, settings, fundingRate, feeRate, mmr);

  openShareOverlay(buildShareCardHtml({
    symbol: position.symbol,
    direction: position.direction,
    leverage: position.leverage,
    entryPrice: position.entryPrice,
    secondPrice: markPrice,
    secondPriceLabel: 'Last Price',
    pnl: metrics.pnl,
    pricePrecision,
  }));
}

export function showShareModal(historyItem) {
  showShareModalForHistory(historyItem);
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
  const positionsToolbar = el('positions-toolbar');
  const historyToolbar = el('history-toolbar');
  const tabs = qsa('[data-tab]');

  tabs.forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle('user-panel__tab--active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  if (positionsView) positionsView.style.display = tabName === 'positions' ? '' : 'none';
  if (historyView) historyView.style.display = tabName === 'history' ? '' : 'none';
  if (positionsToolbar) positionsToolbar.style.display = tabName === 'positions' ? '' : 'none';
  if (historyToolbar) historyToolbar.style.display = tabName === 'history' ? '' : 'none';
}
