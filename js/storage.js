const PREFIX = 'bf_';

const KEYS = {
  coins: `${PREFIX}coins`,
  positions: `${PREFIX}positions`,
  history: `${PREFIX}history`,
  settings: `${PREFIX}settings`,
  balance: `${PREFIX}balance`,
  selectedCoin: `${PREFIX}selectedCoin`,
};

const DEFAULT_COINS = [
  {
    id: 'btcusdt',
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    displayName: 'Bitcoin',
    apiSymbol: 'BTCUSDT',
    pricePrecision: 1,
    qtyPrecision: 3,
  },
  {
    id: 'bnbusdt',
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    displayName: 'BNB',
    apiSymbol: 'BNBUSDT',
    pricePrecision: 2,
    qtyPrecision: 2,
  },
];

const DEFAULT_SETTINGS = {
  initialBalance: 100,
  feeRate: 0.0004,
  leverage: 10,
  mmr: 0.005,
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to write to localStorage key: ${key}`, e);
    window.dispatchEvent(new CustomEvent('storage-error', {
      detail: { key, message: 'Storage full — data may not be saved' }
    }));
    return false;
  }
}

export function initStorage() {
  if (!safeGet(KEYS.coins, null)) {
    safeSet(KEYS.coins, DEFAULT_COINS);
  }
  if (!safeGet(KEYS.positions, null)) {
    safeSet(KEYS.positions, []);
  }
  if (!safeGet(KEYS.history, null)) {
    safeSet(KEYS.history, []);
  }
  if (!safeGet(KEYS.settings, null)) {
    safeSet(KEYS.settings, DEFAULT_SETTINGS);
  }
  if (safeGet(KEYS.balance, null) === null) {
    const settings = getSettings();
    safeSet(KEYS.balance, settings.initialBalance);
  }
  migrateMarginMode();
}

function migrateMarginMode() {
  let changed = false;
  const positions = safeGet(KEYS.positions, []);
  for (const p of positions) {
    if (p.marginMode === 'Isolated') { p.marginMode = 'Cross'; changed = true; }
  }
  if (changed) safeSet(KEYS.positions, positions);

  changed = false;
  const history = safeGet(KEYS.history, []);
  for (const h of history) {
    if (h.marginMode === 'Isolated') { h.marginMode = 'Cross'; changed = true; }
  }
  if (changed) safeSet(KEYS.history, history);
}

// --- Coins ---

export function getCoins() {
  return safeGet(KEYS.coins, DEFAULT_COINS);
}

export function setCoins(coins) {
  safeSet(KEYS.coins, coins);
}

export function addCoin(coin) {
  const coins = getCoins();
  coin.id = coin.symbol.toLowerCase();
  coins.push(coin);
  setCoins(coins);
  return coin;
}

export function updateCoin(id, updates) {
  const coins = getCoins();
  const idx = coins.findIndex(c => c.id === id);
  if (idx === -1) return null;
  coins[idx] = { ...coins[idx], ...updates };
  if (updates.symbol) coins[idx].id = updates.symbol.toLowerCase();
  setCoins(coins);
  return coins[idx];
}

export function deleteCoin(id) {
  const coins = getCoins().filter(c => c.id !== id);
  setCoins(coins);
}

export function getCoinBySymbol(symbol) {
  return getCoins().find(c => c.symbol === symbol) || null;
}

// --- Settings ---

export function getSettings() {
  return safeGet(KEYS.settings, DEFAULT_SETTINGS);
}

export function setSettings(settings) {
  safeSet(KEYS.settings, settings);
}

// --- Balance ---

export function getBalance() {
  return safeGet(KEYS.balance, getSettings().initialBalance);
}

export function setBalance(val) {
  safeSet(KEYS.balance, val);
}

// --- Positions ---

export function getPositions() {
  return safeGet(KEYS.positions, []);
}

export function setPositions(positions) {
  safeSet(KEYS.positions, positions);
}

export function addPosition(position) {
  const positions = getPositions();
  position.id = `pos_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  positions.push(position);
  setPositions(positions);
  return position;
}

export function removePosition(id) {
  const positions = getPositions().filter(p => p.id !== id);
  setPositions(positions);
}

// --- History ---

export function getHistory() {
  return safeGet(KEYS.history, []);
}

export function setHistory(history) {
  safeSet(KEYS.history, history);
}

export function addHistory(entry) {
  const history = getHistory();
  entry.historyId = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  history.unshift(entry);
  if (history.length > 500) history.length = 500;
  safeSet(KEYS.history, history);
  return entry;
}

// --- Selected coin ---

export function getSelectedCoin() {
  return safeGet(KEYS.selectedCoin, null);
}

export function setSelectedCoin(symbol) {
  safeSet(KEYS.selectedCoin, symbol);
}

// --- Reset ---

export function resetAllData() {
  const settings = getSettings();
  safeSet(KEYS.positions, []);
  safeSet(KEYS.history, []);
  safeSet(KEYS.balance, settings.initialBalance);
}

export function resetEverything() {
  Object.values(KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  });
  initStorage();
}
