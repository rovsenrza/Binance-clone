import * as storage from './storage.js?v=20260707';
import * as formulas from './formulas.js?v=20260707';
import { getMarkPrice, getTickerData, getPriceExtremes, resetPriceExtremes } from './api.js?v=20260707';

let tradeDebounce = false;

export function openPosition({ symbol, direction, sizeUsdt, tp, sl }) {
  if (tradeDebounce) return { error: 'Please wait...' };
  tradeDebounce = true;
  setTimeout(() => { tradeDebounce = false; }, 500);

  const settings = storage.getSettings();
  const markPrice = getMarkPrice(symbol);

  if (!markPrice || markPrice <= 0) {
    return { error: 'Price not available. Wait for API connection.' };
  }

  if (!sizeUsdt || sizeUsdt <= 0 || isNaN(sizeUsdt)) {
    return { error: 'Enter a valid size.' };
  }

  const leverage = settings.leverage;
  const feeRate = settings.feeRate;
  const positions = storage.getPositions();
  const currentBalance = storage.getBalance();
  const avbl = formulas.availableBalance(currentBalance, positions, leverage);

  const posValue = sizeUsdt;
  const requiredMargin = formulas.margin(posValue, leverage);
  const openFeeAmount = formulas.openFee(posValue, feeRate);
  const totalRequired = requiredMargin + openFeeAmount;

  if (totalRequired > avbl + 0.0001) {
    return { error: 'Insufficient balance.' };
  }

  const quantity = sizeUsdt / markPrice;

  if (tp !== null && tp !== undefined && tp > 0) {
    if (direction === 'Long' && tp <= markPrice) {
      return { error: 'TP must be above current price for Long.' };
    }
    if (direction === 'Short' && tp >= markPrice) {
      return { error: 'TP must be below current price for Short.' };
    }
  }

  if (sl !== null && sl !== undefined && sl > 0) {
    if (direction === 'Long' && sl >= markPrice) {
      return { error: 'SL must be below current price for Long.' };
    }
    if (direction === 'Short' && sl <= markPrice) {
      return { error: 'SL must be above current price for Short.' };
    }
  }

  const coin = storage.getCoinBySymbol(symbol);
  const tickerData = getTickerData(symbol);
  const openFundingRate = tickerData?.fundingRate || 0;

  const position = {
    symbol,
    baseAsset: coin?.baseAsset || symbol.replace('USDT', ''),
    direction,
    entryPrice: markPrice,
    quantity,
    sizeUsdt: posValue,
    leverage,
    marginMode: 'Cross',
    tp: (tp && tp > 0) ? tp : null,
    sl: (sl && sl > 0) ? sl : null,
    openFee: openFeeAmount,
    openTime: new Date().toISOString(),
    fundingRate: openFundingRate,
    status: 'Open',
  };

  storage.addPosition(position);

  const newBalance = currentBalance - openFeeAmount;
  storage.setBalance(newBalance);

  return { success: true, position };
}

export function closePosition(positionId, closePrice) {
  const positions = storage.getPositions();
  const pos = positions.find(p => p.id === positionId);
  if (!pos) return null;

  const settings = storage.getSettings();
  const feeRate = settings.feeRate;

  const pnlAtClose = formulas.pnl(pos.direction, pos.entryPrice, closePrice, pos.quantity);
  const closeFeeAmount = formulas.closeFee(closePrice, pos.quantity, feeRate);
  const posValue = formulas.positionValue(pos.quantity, pos.entryPrice);
  const currentTicker = getTickerData(pos.symbol);
  const effectiveFundingRate = currentTicker?.fundingRate || pos.fundingRate || 0;
  const fundingCost = formulas.funding(posValue, effectiveFundingRate);
  const openFeeAmount = pos.openFee || 0;
  const netRealized = formulas.realizedPnl(pnlAtClose, openFeeAmount, closeFeeAmount, fundingCost);
  const balanceDelta = pnlAtClose - closeFeeAmount - fundingCost;

  const marginAmount = formulas.margin(posValue, pos.leverage);

  const historyEntry = {
    ...pos,
    closePrice,
    closeTime: new Date().toISOString(),
    realizedPnl: netRealized,
    pnlAtClose,
    openFee: openFeeAmount,
    closeFee: closeFeeAmount,
    fundingCost,
    roiPercent: formulas.roi(netRealized, marginAmount),
    closedVolume: pos.quantity,
    avgClosePrice: closePrice,
    maxOI: pos.quantity,
    status: 'Closed',
  };

  storage.addHistory(historyEntry);
  storage.removePosition(positionId);

  const currentBalance = storage.getBalance();
  storage.setBalance(currentBalance + balanceDelta);

  return historyEntry;
}

function num(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/** Highest price seen (mark / last / tick extremes) — used for Short SL & Long TP */
function peakTriggerPrice(tick, extremes) {
  const candidates = [tick?.markPrice, tick?.lastPrice, extremes?.high]
    .map(num)
    .filter(p => p != null && p > 0);
  return candidates.length ? Math.max(...candidates) : null;
}

/** Lowest price seen (mark / last / tick extremes) — used for Long SL & Short TP */
function troughTriggerPrice(tick, extremes) {
  const candidates = [tick?.markPrice, tick?.lastPrice, extremes?.low]
    .map(num)
    .filter(p => p != null && p > 0);
  return candidates.length ? Math.min(...candidates) : null;
}

export function checkTpSl(prices) {
  const positions = storage.getPositions();
  const closed = [];
  const checkedSymbols = [];

  for (const pos of positions) {
    const tick = prices[pos.symbol];
    const markPrice = num(tick?.markPrice);
    if (!markPrice) continue;

    checkedSymbols.push(pos.symbol);
    const extremes = getPriceExtremes(pos.symbol);
    const peak = peakTriggerPrice(tick, extremes);
    const trough = troughTriggerPrice(tick, extremes);
    const tp = num(pos.tp);
    const sl = num(pos.sl);

    const liqVal = formulas.liqPrice(pos.direction, pos.entryPrice, pos.leverage, storage.getCoinMmr(pos.symbol));
    let liquidated = false;
    if (pos.direction === 'Long' && markPrice <= liqVal) liquidated = true;
    if (pos.direction === 'Short' && markPrice >= liqVal) liquidated = true;

    if (liquidated) {
      const result = liquidatePosition(pos);
      if (result) closed.push(result);
      continue;
    }

    let shouldClose = false;
    let closePrice = markPrice;

    if (tp && tp > 0) {
      if (pos.direction === 'Long' && peak != null && peak >= tp) {
        shouldClose = true;
        closePrice = peak;
      }
      if (pos.direction === 'Short' && trough != null && trough <= tp) {
        shouldClose = true;
        closePrice = trough;
      }
    }

    if (!shouldClose && sl && sl > 0) {
      if (pos.direction === 'Long' && trough != null && trough <= sl) {
        shouldClose = true;
        closePrice = trough;
      }
      if (pos.direction === 'Short' && peak != null && peak >= sl) {
        shouldClose = true;
        closePrice = peak;
      }
    }

    if (shouldClose) {
      const result = closePosition(pos.id, closePrice);
      if (result) closed.push(result);
    }
  }

  if (checkedSymbols.length) resetPriceExtremes(checkedSymbols);
  return closed;
}

function liquidatePosition(pos) {
  const settings = storage.getSettings();
  const posValue = formulas.positionValue(pos.quantity, pos.entryPrice);
  const marginAmount = formulas.margin(posValue, pos.leverage);
  const liqVal = formulas.liqPrice(pos.direction, pos.entryPrice, pos.leverage, storage.getCoinMmr(pos.symbol));

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
    roiPercent: formulas.roi(netRealized, marginAmount),
    closedVolume: pos.quantity,
    avgClosePrice: liqVal,
    maxOI: pos.quantity,
    status: 'Liquidated',
  };

  storage.addHistory(historyEntry);
  storage.removePosition(pos.id);

  const currentBalance = storage.getBalance();
  storage.setBalance(currentBalance - marginAmount);

  return historyEntry;
}

export function calculateAccountState(prices) {
  const settings = storage.getSettings();
  const positions = storage.getPositions();
  const currentBalance = storage.getBalance();
  const leverage = settings.leverage;
  const marginUsed = formulas.marginInUse(positions, leverage);
  const avbl = formulas.availableBalance(currentBalance, positions, leverage);
  const unrealized = formulas.unrealizedPnl(positions, prices, settings.feeRate);

  return {
    balance: currentBalance,
    unrealizedPnl: unrealized,
    marginInUse: marginUsed,
    availableBalance: avbl,
  };
}

export function getPositionMetrics(position, markPrice, settings, fundingRate = 0) {
  const posVal = formulas.positionValue(position.quantity, position.entryPrice);
  const marginVal = formulas.margin(posVal, position.leverage);
  const pnlVal = formulas.pnl(position.direction, position.entryPrice, markPrice, position.quantity);
  const openFeeAmount = position.openFee ?? formulas.openFee(posVal, settings.feeRate);
  const netUnrealized = formulas.netUnrealizedPnl(
    position.direction, position.entryPrice, markPrice, position.quantity,
    openFeeAmount, settings.feeRate, fundingRate,
  );
  const roiVal = formulas.roi(pnlVal, marginVal);
  const liqVal = formulas.liqPrice(position.direction, position.entryPrice, position.leverage, storage.getCoinMmr(position.symbol));

  return {
    positionValue: posVal,
    margin: marginVal,
    pnl: pnlVal,
    netUnrealized,
    roi: roiVal,
    liqPrice: liqVal,
    markPrice,
  };
}
