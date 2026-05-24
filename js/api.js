const REST_BASE = 'https://fapi.binance.com';
const WS_BASE = 'wss://fstream.binance.com/ws';

const priceData = {};
const listeners = new Set();
const wsConnections = {};
let restFallbackTimer = null;
let connectionStatus = 'disconnected';

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

async function fetchAllRest(symbols) {
  for (const symbol of symbols) {
    const [ticker, premium] = await Promise.all([
      fetchTicker24h(symbol),
      fetchPremiumIndex(symbol),
    ]);

    if (ticker || premium) {
      const existing = priceData[symbol] || {};
      priceData[symbol] = {
        symbol,
        markPrice: premium ? parseFloat(premium.markPrice) : (ticker ? parseFloat(ticker.lastPrice) : existing.markPrice),
        lastPrice: ticker ? parseFloat(ticker.lastPrice) : existing.lastPrice,
        priceChange: ticker ? parseFloat(ticker.priceChange) : existing.priceChange,
        priceChangePercent: ticker ? parseFloat(ticker.priceChangePercent) : existing.priceChangePercent,
        highPrice: ticker ? parseFloat(ticker.highPrice) : existing.highPrice,
        lowPrice: ticker ? parseFloat(ticker.lowPrice) : existing.lowPrice,
        volume: ticker ? parseFloat(ticker.volume) : existing.volume,
        fundingRate: premium ? parseFloat(premium.lastFundingRate) : existing.fundingRate,
        nextFundingTime: premium ? premium.nextFundingTime : existing.nextFundingTime,
        timestamp: Date.now(),
      };
      connectionStatus = 'connected';
      notifyListeners(symbol);
    }
  }
}

// --- WebSocket ---

function connectWebSocket(symbol) {
  const lowerSymbol = symbol.toLowerCase();
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
    connectWebSocket(conn.symbol);
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

// --- Public API ---

export function startPriceFeed(symbols) {
  if (!symbols || symbols.length === 0) return;

  fetchAllRest(symbols);

  for (const symbol of symbols) {
    connectWebSocket(symbol);
  }

  startRestFallback(symbols);
}

function startRestFallback(symbols) {
  if (restFallbackTimer) clearInterval(restFallbackTimer);
  restFallbackTimer = setInterval(() => {
    fetchAllRest(symbols);
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

export function updateFeedSymbols(symbols) {
  const currentKeys = new Set(Object.keys(wsConnections));
  const newKeys = new Set(symbols);

  for (const key of currentKeys) {
    if (!newKeys.has(key)) disconnectWebSocket(key);
  }

  for (const symbol of symbols) {
    if (!currentKeys.has(symbol)) connectWebSocket(symbol);
  }

  if (restFallbackTimer) clearInterval(restFallbackTimer);
  startRestFallback(symbols);
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
