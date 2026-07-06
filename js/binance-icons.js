/** Binance official coin logos — same CDN as binance.com / Binance Futures */

const BINANCE_LOGO_CDN = 'https://bin.bnbstatic.com/static/assets/logos';
const BINANCE_LOGO_API = 'https://www.binance.com/bapi/asset/v1/public/asset/asset/get-asset-logo';
const LOGO_CACHE_KEY = 'bf_binance_logos';
const LOGO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Coins missing from Binance static CDN (e.g. HYPE → 403) */
const LOCAL_ICON_OVERRIDES = {
  HYPE: 'assets/icons/hype.jpg',
};

let logoByAsset = null;

export async function loadBinanceLogos() {
  try {
    const cached = sessionStorage.getItem(LOGO_CACHE_KEY);
    if (cached) {
      const { ts, map } = JSON.parse(cached);
      if (Date.now() - ts < LOGO_CACHE_TTL_MS) {
        logoByAsset = map;
        return map;
      }
    }

    const resp = await fetch(BINANCE_LOGO_API, { headers: { clienttype: 'web' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const json = await resp.json();
    logoByAsset = {};
    for (const row of json.data || []) {
      if (row.asset && row.pic) logoByAsset[row.asset] = row.pic;
    }

    sessionStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({ ts: Date.now(), map: logoByAsset }));
  } catch (e) {
    console.warn('Binance logo API unavailable, using static CDN only:', e.message);
    logoByAsset = logoByAsset || {};
  }
  return logoByAsset;
}

export function getBinanceIconUrl(baseAsset) {
  const safe = String(baseAsset || '').trim().toUpperCase();
  if (!safe) return null;
  if (LOCAL_ICON_OVERRIDES[safe]) return LOCAL_ICON_OVERRIDES[safe];
  return `${BINANCE_LOGO_CDN}/${safe}.png`;
}

/** Next URL to try when the current image fails to load */
export function getBinanceIconRetryUrl(baseAsset, failedSrc = '') {
  const safe = String(baseAsset || '').trim().toUpperCase();
  if (!safe) return null;

  const staticUrl = `${BINANCE_LOGO_CDN}/${safe}.png`;
  const apiUrl = logoByAsset?.[safe];
  const localUrl = LOCAL_ICON_OVERRIDES[safe];

  if (failedSrc.includes('static/assets/logos') && apiUrl && failedSrc !== apiUrl) {
    return apiUrl;
  }
  if (localUrl && failedSrc !== localUrl) {
    return localUrl;
  }
  if (apiUrl && failedSrc !== apiUrl && !failedSrc.includes('static/assets/logos')) {
    return apiUrl;
  }
  if (!failedSrc.includes('static/assets/logos') && failedSrc !== staticUrl) {
    return staticUrl;
  }
  return null;
}
