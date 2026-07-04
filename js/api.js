const REST_BASE = 'https://fapi.binance.com';
const WS_BASE = 'wss://fstream.binance.com/ws';

const priceData = {};
const listeners = new Set();
const wsConnections = {};
let restFallbackTimer = null;
let oiTimer = null;
let connectionStatus = 'disconnected';
/** @type {{ symbol: string, apiSymbol: string }[]} */
let feedConfigs = [];

function normalizeFeedConfigs(configs) {
  if (!configs?.length) return [];
  if (typeof configs[0] === 'string') {
    return configs.map(symbol => ({ symbol, apiSymbol: symbol }));
  }
  return configs.map(({ symbol, apiSymbol }) => ({
    symbol,
    apiSymbol: apiSymbol || symbol,
  }));
}

export function getPriceData() {
  return priceData;
}

export function getMarkPrice(symbol) {
  return priceData[symbol]?.markPrice ?? null;
}

export function getTickerData(symbol) {
  return priceData[symbol] ?? null;
}

export function getConnectionStatus() {
  return connectionStatus;
}

export function onPriceUpdate(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(symbol) {
  for (const cb of listeners) {
    try { cb(symbol, priceData[symbol]); } catch (e) { console.error('Price listener error:', e); }
  }
}

// --- REST Fallback ---

async function fetchTicker24h(symbol) {
  try {
    const resp = await fetch(`${REST_BASE}/fapi/v1/ticker/24hr?symbol=${symbol}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn(`REST ticker fetch failed for ${symbol}:`, e.message);
    return null;
  }
}

async function fetchPremiumIndex(symbol) {
  try {
    const resp = await fetch(`${REST_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (e) {
    console.warn(`REST premiumIndex fetch failed for ${symbol}:`, e.message);
    return null;
  }
}

async function fetchAllRest(configs) {
  for (const { symbol, apiSymbol } of configs) {
    const [ticker, premium] = await Promise.all([
      fetchTicker24h(apiSymbol),
      fetchPremiumIndex(apiSymbol),
    ]);

    if (ticker || premium) {
      const existing = priceData[symbol] || {};
      priceData[symbol] = {
        symbol,
        markPrice: premium ? parseFloat(premium.markPrice) : (ticker ? parseFloat(ticker.lastPrice) : existing.markPrice),
        indexPrice: premium ? parseFloat(premium.indexPrice) : existing.indexPrice,
        lastPrice: ticker ? parseFloat(ticker.lastPrice) : existing.lastPrice,
        priceChange: ticker ? parseFloat(ticker.priceChange) : existing.priceChange,
        priceChangePercent: ticker ? parseFloat(ticker.priceChangePercent) : existing.priceChangePercent,
        highPrice: ticker ? parseFloat(ticker.highPrice) : existing.highPrice,
        lowPrice: ticker ? parseFloat(ticker.lowPrice) : existing.lowPrice,
        volume: ticker ? parseFloat(ticker.volume) : existing.volume,
        quoteVolume: ticker ? parseFloat(ticker.quoteVolume) : existing.quoteVolume,
        fundingRate: premium ? parseFloat(premium.lastFundingRate) : existing.fundingRate,
        nextFundingTime: premium ? premium.nextFundingTime : existing.nextFundingTime,
        openInterest: existing.openInterest,
        timestamp: Date.now(),
      };
      connectionStatus = 'connected';
      notifyListeners(symbol);
    }
  }
}

// --- WebSocket ---

function connectWebSocket(symbol, apiSymbol = symbol) {
  const lowerSymbol = apiSymbol.toLowerCase();
  const key = symbol;

  if (wsConnections[key]?.ws?.readyState === WebSocket.OPEN) return;

  const streamName = `${lowerSymbol}@markPrice@1s`;
  const tickerStream = `${lowerSymbol}@ticker`;
  const url = `${WS_BASE}/${streamName}/${tickerStream}`;

  let ws;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.warn(`WebSocket creation failed for ${symbol}:`, e.message);
    startRestFallback([symbol]);
    return;
  }

  const conn = {
    ws,
    symbol,
    apiSymbol,
    reconnectAttempts: 0,
    reconnectTimer: null,
  };
  wsConnections[key] = conn;

  ws.onopen = () => {
    connectionStatus = 'connected';
    conn.reconnectAttempts = 0;
    notifyListeners(symbol);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const existing = priceData[symbol] || {};

      if (data.e === 'markPriceUpdate') {
        priceData[symbol] = {
          ...existing,
          symbol,
          markPrice: parseFloat(data.p),
          fundingRate: parseFloat(data.r),
          nextFundingTime: data.T,
          timestamp: Date.now(),
        };
        notifyListeners(symbol);
      } else if (data.e === '24hrTicker') {
        priceData[symbol] = {
          ...existing,
          symbol,
          lastPrice: parseFloat(data.c),
          priceChange: parseFloat(data.p),
          priceChangePercent: parseFloat(data.P),
          highPrice: parseFloat(data.h),
          lowPrice: parseFloat(data.l),
          volume: parseFloat(data.v),
          quoteVolume: parseFloat(data.q),
          timestamp: Date.now(),
        };
        notifyListeners(symbol);
      }
    } catch (e) {
      console.warn('WS message parse error:', e);
    }
  };

  ws.onerror = () => {
    connectionStatus = 'error';
    notifyListeners(symbol);
  };

  ws.onclose = () => {
    connectionStatus = 'reconnecting';
    scheduleReconnect(key);
  };
}

function scheduleReconnect(key) {
  const conn = wsConnections[key];
  if (!conn) return;

  conn.reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, conn.reconnectAttempts), 30000);

  conn.reconnectTimer = setTimeout(() => {
    connectWebSocket(conn.symbol, conn.apiSymbol);
  }, delay);
}

function disconnectWebSocket(symbol) {
  const conn = wsConnections[symbol];
  if (!conn) return;

  if (conn.reconnectTimer) clearTimeout(conn.reconnectTimer);
  if (conn.ws) {
    conn.ws.onclose = null;
    conn.ws.close();
  }
  delete wsConnections[symbol];
}

// --- Open Interest ---

async function fetchOpenInterest(symbol, apiSymbol = symbol) {
  try {
    const resp = await fetch(`${REST_BASE}/fapi/v1/openInterest?symbol=${apiSymbol}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const existing = priceData[symbol] || {};
    priceData[symbol] = { ...existing, symbol, openInterest: parseFloat(data.openInterest) };
    notifyListeners(symbol);
  } catch (e) {
    console.warn(`OI fetch failed for ${symbol}:`, e.message);
  }
}

// --- Public API ---

export function startPriceFeed(configs) {
  feedConfigs = normalizeFeedConfigs(configs);
  if (feedConfigs.length === 0) return;

  fetchAllRest(feedConfigs);
  feedConfigs.forEach(({ symbol, apiSymbol }) => fetchOpenInterest(symbol, apiSymbol));

  for (const { symbol, apiSymbol } of feedConfigs) {
    connectWebSocket(symbol, apiSymbol);
  }

  startRestFallback(feedConfigs);

  if (oiTimer) clearInterval(oiTimer);
  oiTimer = setInterval(
    () => feedConfigs.forEach(({ symbol, apiSymbol }) => fetchOpenInterest(symbol, apiSymbol)),
    15000,
  );
}

function startRestFallback(configs) {
  if (restFallbackTimer) clearInterval(restFallbackTimer);
  restFallbackTimer = setInterval(() => {
    fetchAllRest(configs);
  }, 3000);
}

export function stopPriceFeed() {
  for (const key of Object.keys(wsConnections)) {
    disconnectWebSocket(key);
  }
  if (restFallbackTimer) {
    clearInterval(restFallbackTimer);
    restFallbackTimer = null;
  }
  connectionStatus = 'disconnected';
}

export function updateFeedSymbols(configs) {
  feedConfigs = normalizeFeedConfigs(configs);
  const currentKeys = new Set(Object.keys(wsConnections));
  const newKeys = new Set(feedConfigs.map(c => c.symbol));

  for (const key of currentKeys) {
    if (!newKeys.has(key)) disconnectWebSocket(key);
  }

  const added = [];
  for (const { symbol, apiSymbol } of feedConfigs) {
    const existing = wsConnections[symbol];
    if (!existing) {
      connectWebSocket(symbol, apiSymbol);
      added.push({ symbol, apiSymbol });
    } else if (existing.apiSymbol !== apiSymbol) {
      disconnectWebSocket(symbol);
      connectWebSocket(symbol, apiSymbol);
      added.push({ symbol, apiSymbol });
    }
  }

  if (added.length) {
    fetchAllRest(added);
    added.forEach(({ symbol, apiSymbol }) => fetchOpenInterest(symbol, apiSymbol));
  }

  if (restFallbackTimer) clearInterval(restFallbackTimer);
  startRestFallback(feedConfigs);
}

// --- Funding timer ---

export function getNextFundingTime() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const nextHour = [0, 8, 16].find(h => h > utcHour) ?? 24;
  const next = new Date(now);
  next.setUTCHours(nextHour === 24 ? 0 : nextHour, 0, 0, 0);
  if (nextHour === 24) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function getFundingCountdown() {
  const next = getNextFundingTime();
  const diff = Math.max(0, next.getTime() - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
