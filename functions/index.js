/**
 * Server-side TP/SL + liquidation monitor.
 * Deploy: firebase deploy --only functions (from project root, Blaze plan required)
 */
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

const REST_BASE = 'https://fapi.binance.com';
const STATE_PATH = 'bf_app/state';
const DEFAULT_MMR = 0.005;
const DEFAULT_FEE = 0.0004;

function num(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function positionValue(quantity, entryPrice) {
  return quantity * entryPrice;
}

function margin(posValue, leverage) {
  if (leverage <= 0) return posValue;
  return posValue / leverage;
}

function pnl(direction, entryPrice, closePrice, quantity) {
  if (direction === 'Long') return (closePrice - entryPrice) * quantity;
  return (entryPrice - closePrice) * quantity;
}

function roi(pnlValue, marginValue) {
  if (marginValue === 0) return 0;
  return (pnlValue / marginValue) * 100;
}

function openFee(posValue, feeRate) {
  return posValue * feeRate;
}

function closeFee(closePrice, quantity, feeRate) {
  return closePrice * quantity * feeRate;
}

function funding(posValue, fundingRate) {
  return posValue * fundingRate;
}

function liqPriceLong(entryPrice, leverage, mmr) {
  if (leverage <= 0) return 0;
  return entryPrice * (1 - 1 / leverage + mmr);
}

function liqPriceShort(entryPrice, leverage, mmr) {
  if (leverage <= 0) return 0;
  return entryPrice * (1 + 1 / leverage - mmr);
}

function liqPrice(direction, entryPrice, leverage, mmr) {
  return direction === 'Long'
    ? liqPriceLong(entryPrice, leverage, mmr)
    : liqPriceShort(entryPrice, leverage, mmr);
}

function coinForSymbol(coins, symbol) {
  return coins.find((c) => c.symbol === symbol) || null;
}

function coinMmr(coins, symbol) {
  return coinForSymbol(coins, symbol)?.mmr ?? DEFAULT_MMR;
}

async function fetchMarkAndExtremes(apiSymbol) {
  const [premiumResp, klinesResp] = await Promise.all([
    fetch(`${REST_BASE}/fapi/v1/premiumIndex?symbol=${apiSymbol}`),
    fetch(`${REST_BASE}/fapi/v1/klines?symbol=${apiSymbol}&interval=1m&limit=5`),
  ]);

  if (!premiumResp.ok) throw new Error(`premiumIndex ${apiSymbol} HTTP ${premiumResp.status}`);

  const premium = await premiumResp.json();
  const mark = parseFloat(premium.markPrice);
  const fundingRate = parseFloat(premium.lastFundingRate) || 0;

  let high = mark;
  let low = mark;

  if (klinesResp.ok) {
    const klines = await klinesResp.json();
    for (const k of klines) {
      high = Math.max(high, parseFloat(k[2]));
      low = Math.min(low, parseFloat(k[3]));
    }
  }

  return { mark, fundingRate, high, low };
}

function peakPrice(tick) {
  const vals = [tick.mark, tick.high].filter((p) => p > 0);
  return vals.length ? Math.max(...vals) : null;
}

function troughPrice(tick) {
  const vals = [tick.mark, tick.low].filter((p) => p > 0);
  return vals.length ? Math.min(...vals) : null;
}

function closePositionState(state, pos, closePrice, feeRate, fundingRate, status = 'Closed') {
  const posValue = positionValue(pos.quantity, pos.entryPrice);
  const pnlAtClose = pnl(pos.direction, pos.entryPrice, closePrice, pos.quantity);
  const closeFeeAmount = closeFee(closePrice, pos.quantity, feeRate);
  const openFeeAmount = pos.openFee || 0;
  const fundingCost = funding(posValue, fundingRate);
  const netRealized = pnlAtClose - openFeeAmount - closeFeeAmount - fundingCost;
  const balanceDelta = pnlAtClose - closeFeeAmount - fundingCost;
  const marginAmount = margin(posValue, pos.leverage);

  const historyEntry = {
    ...pos,
    closePrice,
    closeTime: new Date().toISOString(),
    realizedPnl: netRealized,
    pnlAtClose,
    openFee: openFeeAmount,
    closeFee: closeFeeAmount,
    fundingCost,
    roiPercent: roi(netRealized, marginAmount),
    closedVolume: pos.quantity,
    avgClosePrice: closePrice,
    maxOI: pos.quantity,
    status,
    closedBy: 'server',
  };

  state.history = state.history || [];
  state.history.unshift(historyEntry);
  if (state.history.length > 500) state.history.length = 500;

  state.positions = (state.positions || []).filter((p) => p.id !== pos.id);
  state.balance = (state.balance || 0) + balanceDelta;

  return historyEntry;
}

function liquidatePositionState(state, pos, feeRate) {
  const posValue = positionValue(pos.quantity, pos.entryPrice);
  const marginAmount = margin(posValue, pos.leverage);
  const mmr = coinMmr(state.coins || [], pos.symbol);
  const liqVal = liqPrice(pos.direction, pos.entryPrice, pos.leverage, mmr);
  const openFeeAmount = pos.openFee || 0;
  const netRealized = -marginAmount - openFeeAmount;

  const historyEntry = {
    ...pos,
    closePrice: liqVal,
    closeTime: new Date().toISOString(),
    realizedPnl: netRealized,
    pnlAtClose: -marginAmount,
    openFee: openFeeAmount,
    closeFee: 0,
    fundingCost: 0,
    roiPercent: roi(netRealized, marginAmount),
    closedVolume: pos.quantity,
    avgClosePrice: liqVal,
    maxOI: pos.quantity,
    status: 'Liquidated',
    closedBy: 'server',
  };

  state.history = state.history || [];
  state.history.unshift(historyEntry);
  if (state.history.length > 500) state.history.length = 500;

  state.positions = (state.positions || []).filter((p) => p.id !== pos.id);
  state.balance = (state.balance || 0) - marginAmount;

  return historyEntry;
}

function evaluatePosition(state, pos, tick, feeRate) {
  const mark = tick.mark;
  if (!mark || mark <= 0) return null;

  const mmr = coinMmr(state.coins || [], pos.symbol);
  const liqVal = liqPrice(pos.direction, pos.entryPrice, pos.leverage, mmr);
  const tp = num(pos.tp);
  const sl = num(pos.sl);
  const peak = peakPrice(tick);
  const trough = troughPrice(tick);

  if (pos.direction === 'Long' && mark <= liqVal) {
    return liquidatePositionState(state, pos, feeRate);
  }
  if (pos.direction === 'Short' && mark >= liqVal) {
    return liquidatePositionState(state, pos, feeRate);
  }

  if (tp && tp > 0) {
    if (pos.direction === 'Long' && peak != null && peak >= tp) {
      return closePositionState(state, pos, peak, feeRate, tick.fundingRate);
    }
    if (pos.direction === 'Short' && trough != null && trough <= tp) {
      return closePositionState(state, pos, trough, feeRate, tick.fundingRate);
    }
  }

  if (sl && sl > 0) {
    if (pos.direction === 'Long' && trough != null && trough <= sl) {
      return closePositionState(state, pos, trough, feeRate, tick.fundingRate);
    }
    if (pos.direction === 'Short' && peak != null && peak >= sl) {
      return closePositionState(state, pos, peak, feeRate, tick.fundingRate);
    }
  }

  return null;
}

async function runMonitor() {
  const db = getFirestore();
  const ref = db.doc(STATE_PATH);
  const snap = await ref.get();
  if (!snap.exists) return { closed: 0 };

  const state = snap.data();
  const positions = [...(state.positions || [])];
  if (!positions.length) {
    await ref.set({
      meta: {
        ...(state.meta || {}),
        slTpMonitor: { lastRunAt: new Date().toISOString(), closed: 0 },
      },
    }, { merge: true });
    return { closed: 0 };
  }

  const coins = state.coins || [];
  const feeRate = state.settings?.feeRate ?? DEFAULT_FEE;
  const priceCache = {};
  const closedEntries = [];

  for (const pos of positions) {
    const coin = coinForSymbol(coins, pos.symbol);
    const apiSymbol = coin?.apiSymbol || pos.symbol;

    if (!priceCache[apiSymbol]) {
      try {
        priceCache[apiSymbol] = await fetchMarkAndExtremes(apiSymbol);
      } catch (e) {
        console.warn(`Price fetch failed for ${apiSymbol}:`, e.message);
        priceCache[apiSymbol] = null;
      }
    }

    const tick = priceCache[apiSymbol];
    if (!tick) continue;

    const result = evaluatePosition(state, pos, tick, feeRate);
    if (result) closedEntries.push(result);
  }

  if (closedEntries.length) {
    state.updatedAt = new Date().toISOString();
    state.meta = {
      ...(state.meta || {}),
      slTpMonitor: {
        lastRunAt: new Date().toISOString(),
        closed: closedEntries.length,
        lastClosed: closedEntries.map((h) => ({
          symbol: h.symbol,
          direction: h.direction,
          status: h.status,
          closePrice: h.closePrice,
        })),
      },
    };
    await ref.set(state);
  } else {
    await ref.set({
      meta: {
        ...(state.meta || {}),
        slTpMonitor: { lastRunAt: new Date().toISOString(), closed: 0 },
      },
    }, { merge: true });
  }

  return { closed: closedEntries.length };
}

exports.monitorTpSl = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'Europe/Moscow',
    retryCount: 2,
  },
  async () => {
    const result = await runMonitor();
    console.log('monitorTpSl', result);
  },
);
