export function positionValue(quantity, entryPrice) {
  return quantity * entryPrice;
}

export function margin(posValue, leverage) {
  if (leverage <= 0) return posValue;
  return posValue / leverage;
}

export function pnl(direction, entryPrice, markPrice, quantity) {
  if (direction === 'Long') {
    return (markPrice - entryPrice) * quantity;
  }
  return (entryPrice - markPrice) * quantity;
}

export function roi(pnlValue, marginValue) {
  if (marginValue === 0) return 0;
  return (pnlValue / marginValue) * 100;
}

export function openFee(posValue, feeRate) {
  return posValue * feeRate;
}

export function closeFee(closePrice, quantity, feeRate) {
  return closePrice * quantity * feeRate;
}

export function funding(posValue, fundingRate) {
  return posValue * fundingRate;
}

export function realizedPnl(pnlAtClose, fees, fundingCost) {
  return pnlAtClose - fees - fundingCost;
}


export function unrealizedPnl(positions, prices) {
  return positions.reduce((sum, pos) => {
    const mark = prices[pos.symbol] || pos.entryPrice;
    return sum + pnl(pos.direction, pos.entryPrice, mark, pos.quantity);
  }, 0);
}

export function liqPriceLong(entryPrice, leverage, mmr) {
  if (leverage <= 0) return 0;
  return entryPrice * (1 - 1 / leverage + mmr);
}

export function liqPriceShort(entryPrice, leverage, mmr) {
  if (leverage <= 0) return 0;
  return entryPrice * (1 + 1 / leverage - mmr);
}

export function liqPrice(direction, entryPrice, leverage, mmr) {
  return direction === 'Long'
    ? liqPriceLong(entryPrice, leverage, mmr)
    : liqPriceShort(entryPrice, leverage, mmr);
}

export function maxPositionSize(availableBalance, leverage) {
  return availableBalance * leverage;
}

export function marginInUse(positions, leverage) {
  return positions.reduce((sum, pos) => {
    const posVal = positionValue(pos.quantity, pos.entryPrice);
    return sum + margin(posVal, leverage);
  }, 0);
}

export function availableBalance(currentBalance, positions, leverage) {
  return currentBalance - marginInUse(positions, leverage);
}

// --- Formatting ---

export function formatPrice(value, precision = 2) {
  if (value == null || isNaN(value)) return '--';
  const num = Number(value);
  if (Object.is(num, -0)) return '0.' + '0'.repeat(precision);
  const parts = num.toFixed(precision).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export function formatPnl(value, precision = 2) {
  if (value == null || isNaN(value)) return '--';
  const num = Number(value);
  const formatted = formatPrice(Math.abs(num), precision);
  if (num > 0) return `+${formatted}`;
  if (num < 0) return `-${formatted}`;
  return formatted;
}

export function formatPercent(value, precision = 2) {
  if (value == null || isNaN(value)) return '--';
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(precision)}%`;
}

export function formatUsd(value, precision = 4) {
  return `${formatPrice(value, precision)} USDT`;
}

export function formatQuantity(value, precision = 5) {
  if (value == null || isNaN(value)) return '--';
  return Number(value).toFixed(precision);
}
