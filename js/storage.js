import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { initFirebase, getDb, isFirebaseConfigured } from './firebase.js';

const PREFIX = 'bf_';
const STATE_COLLECTION = 'bf_app';
const STATE_DOC_ID = 'state';

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
    mmr: 0.005,
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
    mmr: 0.005,
  },
];

const DEFAULT_MMR = 0.005;

const DEFAULT_SETTINGS = {
  initialBalance: 100,
  feeRate: 0.0004,
  leverage: 10,
};

const MIGRATED_FLAG = `${PREFIX}firestore_migrated`;

let cache = createDefaultCache();
let useFirestore = false;
let persistChain = Promise.resolve();
let unsubscribeSnapshot = null;
let initDone = false;
let lastLocalUpdatedAt = null;
let lastAppliedRemoteUpdatedAt = null;

function createDefaultCache() {
  return {
    coins: structuredClone(DEFAULT_COINS),
    positions: [],
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    balance: DEFAULT_SETTINGS.initialBalance,
    selectedCoin: null,
  };
}

function stateDocRef() {
  return doc(getDb(), STATE_COLLECTION, STATE_DOC_ID);
}

function dispatchStorageError(message) {
  window.dispatchEvent(new CustomEvent('storage-error', {
    detail: { message },
  }));
}

// --- localStorage (backup + offline fallback) ---

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
    dispatchStorageError('Storage full — data may not be saved');
    return false;
  }
}

function loadCacheFromLocalStorage() {
  const settings = safeGet(KEYS.settings, null) ?? { ...DEFAULT_SETTINGS };
  cache = {
    coins: safeGet(KEYS.coins, null) ?? structuredClone(DEFAULT_COINS),
    positions: safeGet(KEYS.positions, null) ?? [],
    history: safeGet(KEYS.history, null) ?? [],
    settings,
    balance: safeGet(KEYS.balance, null) ?? settings.initialBalance,
    selectedCoin: safeGet(KEYS.selectedCoin, null),
  };
}

function mirrorCacheToLocalStorage() {
  safeSet(KEYS.coins, cache.coins);
  safeSet(KEYS.positions, cache.positions);
  safeSet(KEYS.history, cache.history);
  safeSet(KEYS.settings, cache.settings);
  safeSet(KEYS.balance, cache.balance);
  if (cache.selectedCoin) {
    safeSet(KEYS.selectedCoin, cache.selectedCoin);
  } else {
    try { localStorage.removeItem(KEYS.selectedCoin); } catch { /* noop */ }
  }
}

function hasLocalStorageData() {
  return (
    safeGet(KEYS.coins, null) !== null
    || safeGet(KEYS.positions, null) !== null
    || safeGet(KEYS.history, null) !== null
  );
}

function normalizeFirestoreData(data) {
  const settings = data.settings ?? { ...DEFAULT_SETTINGS };
  return {
    coins: Array.isArray(data.coins) && data.coins.length ? data.coins : structuredClone(DEFAULT_COINS),
    positions: Array.isArray(data.positions) ? data.positions : [],
    history: Array.isArray(data.history) ? data.history : [],
    settings,
    balance: typeof data.balance === 'number' ? data.balance : settings.initialBalance,
    selectedCoin: data.selectedCoin ?? null,
  };
}

function cacheFingerprint() {
  return JSON.stringify(cache);
}

function applyRemoteCache(next, meta = {}) {
  const fp = cacheFingerprint();
  cache = next;
  mirrorCacheToLocalStorage();
  if (cacheFingerprint() !== fp) {
    window.dispatchEvent(new CustomEvent('storage-remote-update', {
      detail: {
        fromRemote: meta.fromRemote === true,
        updatedAt: meta.updatedAt ?? null,
      },
    }));
  }
}

// --- Firestore ---

async function loadFromFirestore() {
  const ref = stateDocRef();
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    cache = normalizeFirestoreData(data);
    lastAppliedRemoteUpdatedAt = data.updatedAt ?? null;
    mirrorCacheToLocalStorage();
    return;
  }

  // One-time migration: browser localStorage → Firestore (shared cloud state)
  if (hasLocalStorageData() && !safeGet(MIGRATED_FLAG, false)) {
    loadCacheFromLocalStorage();
  } else {
    cache = createDefaultCache();
  }

  migrateMarginMode();
  mirrorCacheToLocalStorage();
  await writeToFirestore();
  safeSet(MIGRATED_FLAG, true);
}

async function writeToFirestore() {
  if (!useFirestore) return true;
  try {
    const ref = stateDocRef();
    lastLocalUpdatedAt = new Date().toISOString();
    await setDoc(ref, {
      ...cache,
      updatedAt: lastLocalUpdatedAt,
    });
    return true;
  } catch (e) {
    console.error('Firestore write failed', e);
    dispatchStorageError('Cloud save failed — check Firebase config and rules');
    return false;
  }
}

function subscribeToFirestore() {
  if (!useFirestore) return;
  const ref = stateDocRef();
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  unsubscribeSnapshot = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists() || !initDone) return;
      const data = snap.data();
      const updatedAt = data.updatedAt ?? null;

      // Skip echo of our own write; apply updates from other devices/tabs
      if (updatedAt && updatedAt === lastLocalUpdatedAt) return;
      if (updatedAt && updatedAt === lastAppliedRemoteUpdatedAt) return;

      lastAppliedRemoteUpdatedAt = updatedAt;
      const fromRemote = Boolean(updatedAt && updatedAt !== lastLocalUpdatedAt);
      applyRemoteCache(normalizeFirestoreData(data), { fromRemote, updatedAt });
    },
    (err) => {
      console.error('Firestore listener error', err);
      dispatchStorageError('Cloud sync error');
    },
  );
}

function enqueuePersist() {
  mirrorCacheToLocalStorage();
  if (!useFirestore) return persistChain;

  persistChain = persistChain
    .then(() => writeToFirestore())
    .catch((e) => {
      console.error('Persist queue error', e);
      dispatchStorageError('Cloud save failed');
    });

  return persistChain;
}

export function isCloudSyncEnabled() {
  return useFirestore;
}

export async function whenReady() {
  if (initDone) return;
  await initStorage();
}

// --- Init ---

export async function initStorage() {
  useFirestore = isFirebaseConfigured();
  if (useFirestore) {
    const db = initFirebase();
    if (!db) {
      useFirestore = false;
    }
  }

  if (useFirestore) {
    try {
      await loadFromFirestore();
      subscribeToFirestore();
    } catch (e) {
      console.error('Firestore init failed', e);
      dispatchStorageError('Could not connect to cloud storage. Publish Firestore rules and reload.');
      throw e;
    }
  } else {
    loadCacheFromLocalStorage();
    ensureLocalDefaults();
    dispatchStorageError('Firebase not configured — data is local to this browser only');
  }

  migrateMarginMode();
  migrateCoinMmr();
  initDone = true;
}

function ensureLocalDefaults() {
  if (!safeGet(KEYS.coins, null)) safeSet(KEYS.coins, cache.coins);
  if (!safeGet(KEYS.positions, null)) safeSet(KEYS.positions, []);
  if (!safeGet(KEYS.history, null)) safeSet(KEYS.history, []);
  if (!safeGet(KEYS.settings, null)) safeSet(KEYS.settings, cache.settings);
  if (safeGet(KEYS.balance, null) === null) safeSet(KEYS.balance, cache.balance);
}

function migrateMarginMode() {
  let changed = false;
  for (const p of cache.positions) {
    if (p.marginMode === 'Isolated') {
      p.marginMode = 'Cross';
      changed = true;
    }
  }
  for (const h of cache.history) {
    if (h.marginMode === 'Isolated') {
      h.marginMode = 'Cross';
      changed = true;
    }
  }
  if (changed) enqueuePersist();
}

function migrateCoinMmr() {
  const fallbackMmr = cache.settings?.mmr ?? DEFAULT_MMR;
  let changed = false;
  for (const coin of cache.coins) {
    if (coin.mmr == null || isNaN(coin.mmr)) {
      coin.mmr = fallbackMmr;
      changed = true;
    }
  }
  if (cache.settings?.mmr !== undefined) {
    const { mmr, ...rest } = cache.settings;
    cache.settings = rest;
    changed = true;
  }
  if (changed) enqueuePersist();
}

// --- Coins ---

export function getCoins() {
  return cache.coins;
}

export function setCoins(coins) {
  cache.coins = coins;
  enqueuePersist();
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

export function getCoinMmr(symbol) {
  const coin = getCoinBySymbol(symbol);
  return coin?.mmr ?? DEFAULT_MMR;
}

// --- Settings ---

export function getSettings() {
  return cache.settings;
}

export function setSettings(settings) {
  cache.settings = settings;
  enqueuePersist();
}

// --- Balance ---

export function getBalance() {
  return cache.balance;
}

export function setBalance(val) {
  cache.balance = val;
  enqueuePersist();
}

// --- Positions ---

export function getPositions() {
  return cache.positions;
}

export function setPositions(positions) {
  cache.positions = positions;
  enqueuePersist();
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
  return cache.history;
}

export function setHistory(history) {
  cache.history = history;
  enqueuePersist();
}

export function addHistory(entry) {
  const history = getHistory();
  entry.historyId = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  history.unshift(entry);
  if (history.length > 500) history.length = 500;
  setHistory(history);
  return entry;
}

// --- Selected coin ---

export function getSelectedCoin() {
  return cache.selectedCoin;
}

export function setSelectedCoin(symbol) {
  cache.selectedCoin = symbol;
  enqueuePersist();
}

// --- Reset ---

export function resetAllData() {
  const settings = getSettings();
  cache.positions = [];
  cache.history = [];
  cache.balance = settings.initialBalance;
  enqueuePersist();
}

export async function resetEverything() {
  cache = createDefaultCache();
  mirrorCacheToLocalStorage();
  Object.values(KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  });
  try { localStorage.removeItem(MIGRATED_FLAG); } catch { /* noop */ }
  mirrorCacheToLocalStorage();
  if (useFirestore) {
    await writeToFirestore();
    safeSet(MIGRATED_FLAG, true);
  }
}

/** Push current browser localStorage into Firestore (admin recovery). */
export async function pushLocalToCloud() {
  if (!useFirestore) return false;
  loadCacheFromLocalStorage();
  migrateMarginMode();
  mirrorCacheToLocalStorage();
  const ok = await writeToFirestore();
  if (ok) safeSet(MIGRATED_FLAG, true);
  return ok;
}
