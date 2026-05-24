# QA Report: Binance Futures Clone

**QA Engineer:** Senior QA Engineer
**Date:** 2026-05-18
**Version Tested:** 1.0
**Files Tested:** 12 files (~3,940 lines)
**BA Reference:** docs/ba-requirements.md (37 tasks)
**Code Review Reference:** docs/code-review-report.md

---

## Overall Result: PARTIAL PASS

The application delivers a functional Binance Futures trading simulator with correct core formulas, working API integration, and a visually accurate light-theme UI. **30 of 37 BA tasks pass fully**, 5 pass partially, and 2 fail. However, testing uncovered **3 critical bugs** (wrong-price close, margin mode mismatch, XSS vector), **5 major bugs** (missing symbol column, orphaned positions, no liquidation enforcement, funding never charged, silent data loss on localStorage full), and **9 minor/cosmetic issues**. The critical and major bugs must be fixed before delivery.

---

## QA Test Plan

| TC# | Test Case | Type | Expected Result |
|-----|-----------|------|-----------------|
| TC-01 | Open a Long position with valid size | Functional | Position created, appears in table, fee deducted from balance |
| TC-02 | Open a Short position with valid size | Functional | Position created, appears in table, fee deducted from balance |
| TC-03 | Open position with empty Size field | Form Validation | Error: "Enter a valid size." |
| TC-04 | Open position with letters in Size field | Form Validation | Error: "Enter a valid size." |
| TC-05 | Open position with negative Size | Form Validation | Error: "Enter a valid size." |
| TC-06 | Open position exceeding available balance | Form Validation | Error: "Insufficient balance." |
| TC-07 | Open position when API price not loaded | Form Validation | Error: "Price not available" |
| TC-08 | Rapid double-click on Buy/Long button | Form Validation | Only one position created (debounce) |
| TC-09 | TP/SL checkbox toggles input visibility | Functional | TP/SL fields expand/collapse with animation |
| TC-10 | TP below entry price for Long | Form Validation | Error: "TP must be above current price for Long" |
| TC-11 | SL above entry price for Long | Form Validation | Error: "SL must be below current price for Long" |
| TC-12 | TP above entry price for Short | Form Validation | Error: "TP must be below current price for Short" |
| TC-13 | SL below entry price for Short | Form Validation | Error: "SL must be above current price for Short" |
| TC-14 | Auto-close Long when Mark Price >= TP | Functional | Position closes, moves to history, balance updated |
| TC-15 | Auto-close Long when Mark Price <= SL | Functional | Position closes, moves to history, balance updated |
| TC-16 | Auto-close Short when Mark Price <= TP | Functional | Position closes, moves to history, balance updated |
| TC-17 | Auto-close Short when Mark Price >= SL | Functional | Position closes, moves to history, balance updated |
| TC-18 | Manual close position via Close button | Functional | Position closed at correct mark price for that coin |
| TC-19 | Close position for coin different from selected | Functional | Uses the position's own coin price, not current coin |
| TC-20 | PNL formula correctness (Long) | Formula | PNL = (Mark Price − Entry Price) × Quantity |
| TC-21 | PNL formula correctness (Short) | Formula | PNL = (Entry Price − Mark Price) × Quantity |
| TC-22 | ROI formula correctness | Formula | ROI% = PNL / Margin × 100 |
| TC-23 | Liq Price formula (Long) | Formula | Entry × (1 − 1/Leverage + MMR) |
| TC-24 | Liq Price formula (Short) | Formula | Entry × (1 + 1/Leverage − MMR) |
| TC-25 | Balance after opening trade | Formula | Balance = Previous Balance − Open Fee |
| TC-26 | Balance after closing trade | Formula | Balance = Previous Balance + Realized PNL |
| TC-27 | Realized PNL calculation | Formula | Realized PNL = PNL at Close − Close Fee − Funding Cost |
| TC-28 | Available Balance calculation | Formula | Available = Balance − Margin In Use |
| TC-29 | Max Position Size calculation | Formula | Max = Available Balance × Leverage |
| TC-30 | Number formatting — commas in thousands | UI | 75770.1 displays as "75,770.1" |
| TC-31 | Number formatting — negative zero | UI | -0.00 displays as "0.00" |
| TC-32 | Switch coin via dropdown | Functional | Prices, pair info, calculations all update to new coin |
| TC-33 | Dropdown closes on outside click | UI | Dropdown hides when clicking elsewhere |
| TC-34 | Position History tab switching | Functional | Positions view hides, History view shows |
| TC-35 | History period filter — 1 Day | Functional | Shows only positions closed within 24 hours |
| TC-36 | History period filter — 1 Week | Functional | Shows positions closed within 7 days |
| TC-37 | History period filter — 1 Month | Functional | Shows positions closed within 30 days |
| TC-38 | History period filter — 3 Months | Functional | Shows positions closed within 90 days |
| TC-39 | Share icon opens modal | Functional | Modal displays trade details |
| TC-40 | Share modal closes on ✕ click | Functional | Modal hides |
| TC-41 | Share modal closes on Escape | Functional | Modal hides |
| TC-42 | Share modal closes on backdrop click | Functional | Modal hides |
| TC-43 | Admin — Add a new coin | Functional | Coin appears in table and on trading page |
| TC-44 | Admin — Edit existing coin | Functional | Updated data reflected in table |
| TC-45 | Admin — Delete coin with confirmation | Functional | Coin removed after confirm dialog |
| TC-46 | Admin — Duplicate coin symbol rejected | Form Validation | Error: "SYMBOL already exists." |
| TC-47 | Admin — Save platform settings | Functional | Settings persist in localStorage |
| TC-48 | Admin — Settings validation (invalid values) | Form Validation | Appropriate error messages shown |
| TC-49 | Admin — Reset Trading Data | Functional | Positions and history cleared, balance reset, coins preserved |
| TC-50 | Admin — Reset Everything | Functional | All data cleared, defaults restored |
| TC-51 | Data persists across page reload | Persistence | Positions, history, balance, settings intact |
| TC-52 | Corrupt localStorage handled gracefully | Persistence | Falls back to defaults, no crash |
| TC-53 | Bottom ticker bar shows live prices | UI | Prices update in real-time for all coins |
| TC-54 | Funding countdown timer ticks | UI | HH:MM:SS format, decrements every second |
| TC-55 | Empty state — no positions | UI | "No open positions" message displayed |
| TC-56 | Empty state — no history | UI | "No closed positions" message displayed |
| TC-57 | Position count badge updates | UI | Positions(N) and Open Orders(N) update on trade |
| TC-58 | Connection status indicator | UI | Shows "Stable connection" when connected |
| TC-59 | XSS in Size input | Security | `<script>alert(1)</script>` treated as invalid number |
| TC-60 | XSS in TP/SL inputs | Security | Script tags not executed |
| TC-61 | XSS via admin coin name | Security | Malicious HTML in coin symbol should not execute |
| TC-62 | Keyboard navigation — tab through controls | Accessibility | All interactive elements reachable via Tab |
| TC-63 | Modal focus trap | Accessibility | Tab stays within modal while open |
| TC-64 | Margin mode display | UI | Shows "Isolated" per BA TASK-006 |
| TC-65 | Positions table — Symbol identification | UI | Each position row shows which coin it belongs to |
| TC-66 | Liquidation enforcement | Functional | Position auto-closes when Mark Price crosses Liq Price |

---

## Bugs Found

### BUG-001 — Severity: Critical
**Title:** Position close uses wrong coin's price when viewing a different coin
**Steps to Reproduce:**
1. Open the admin panel, ensure both BTCUSDT and BNBUSDT are configured
2. Open the trading page, select BTCUSDT, open a Long position
3. Switch the coin selector to BNBUSDT
4. Click the "Close" button on the BTCUSDT position
5. Observe which price is used for the close
**Expected Result:** Position closes at BTCUSDT mark price regardless of which coin is currently selected
**Actual Result:** Code at `js/app.js:215` first retrieves `api.getMarkPrice(currentSymbol)` (BNBUSDT). If BTCUSDT's price is temporarily null, the fallback at line 218 uses BNBUSDT's price for the BTCUSDT position close — producing incorrect PNL and balance.
**Affected File:** `js/app.js` lines 209-225
**Root Cause:** The close handler gets price for `currentSymbol` first, then falls back to it if `pos.symbol` price is unavailable.
**Fix:** Remove the `currentSymbol` price lookup. Get price directly from `pos.symbol`:
```js
const pos = storage.getPositions().find(p => p.id === posId);
if (!pos) return;
const mp = api.getMarkPrice(pos.symbol);
if (!mp) { ui.showToast('Price not available', 'error'); return; }
trading.closePosition(posId, mp);
```

---

### BUG-002 — Severity: Critical
**Title:** Margin mode displays "Cross" instead of "Isolated" as required by BA
**Steps to Reproduce:**
1. Open `index.html` in Chrome
2. Look at the left order panel, top row of badges
3. Also open a position and inspect the stored `marginMode` in localStorage
**Expected Result:** Badge shows "Isolated" per TASK-006 AC: `"Isolated" margin mode label`
**Actual Result:** Badge shows "Cross" (index.html line 55) and positions are stored with `marginMode: 'Cross'` (trading.js line 69)
**Affected Files:** `index.html` line 55, `js/trading.js` line 69
**Fix:** Change "Cross" to "Isolated" in both locations.

---

### BUG-003 — Severity: Critical
**Title:** XSS vulnerability via innerHTML with unsanitized coin data
**Steps to Reproduce:**
1. Open admin.html
2. Add a new coin with Symbol: `TESTUSDT` and Base Asset: `<img src=x onerror=alert(1)>`
3. Open index.html
4. Observe if JavaScript executes
**Expected Result:** Malicious HTML is escaped and rendered as plain text
**Actual Result:** The `coinIconHtml()` function in `js/ui.js:22-29` injects `baseAsset` directly into HTML via template literals. The result is assigned to `.innerHTML` at multiple points (`renderPairBlock`, `renderHistoryTable`, `renderCoinDropdown`, `renderTickerBar`, `showShareModal`). The `onerror` handler on the `<img>` tag is also an XSS vector. While the attack surface is admin-only (the admin controls localStorage), this violates OWASP best practices and is a security vulnerability if localStorage is ever tampered with.
**Affected File:** `js/ui.js` lines 22-29, and all innerHTML assignments throughout the file
**Fix:** Replace innerHTML-based rendering with DOM API calls (`createElement`, `textContent`, `appendChild`), or sanitize all interpolated values through an `escapeHtml` utility.

---

### BUG-004 — Severity: Major
**Title:** Positions table has no Symbol column — positions for different coins are indistinguishable
**Steps to Reproduce:**
1. Open BTCUSDT, create a Long position ($50)
2. Switch to BNBUSDT, create a Short position ($50)
3. View the Positions table
**Expected Result:** Each position row clearly shows which coin it belongs to (e.g., "BTCUSDT" and "BNBUSDT")
**Actual Result:** The positions table columns are: Size, Entry Price, Mark Price, PNL(ROI%), Liq.Price, TP/SL, Action. There is no Symbol/Pair column. Both positions show "50.00 USDT" with green/red color but no coin identifier. The only visual cue is the entry price amount, which is unreliable.
**Affected File:** `js/ui.js` lines 200-235, `index.html` lines 234-247
**Note:** BA TASK-012 lists columns as "Size, Entry Price, Mark Price, PNL(ROI%), Liq.Price, TP/SL for position, Action" — Symbol is not in the BA column list. However, real Binance always shows the symbol. This is a usability gap that should be escalated to the BA.

---

### BUG-005 — Severity: Major
**Title:** Deleting a coin in admin orphans existing positions with no cleanup
**Steps to Reproduce:**
1. Open trading page, open a BTCUSDT position
2. Open admin page, delete BTCUSDT
3. Return to trading page, observe the orphaned position
**Expected Result:** Either (a) positions for the deleted coin are force-closed, or (b) the admin is blocked from deleting a coin with open positions
**Actual Result:** The admin shows a warning in the confirm dialog ("Warning: N open position(s) exist"), but after confirming, the coin is deleted. The orphaned positions remain in localStorage with no price feed, cannot be closed (markPrice is null), and display stale data. The `getCoinBySymbol` lookup returns null, causing fallback formatting.
**Affected File:** `js/admin.js` lines 146-159

---

### BUG-006 — Severity: Major
**Title:** Funding rate on positions is hardcoded to 0 — funding is never actually charged
**Steps to Reproduce:**
1. Open a position for any coin
2. Wait for several funding intervals (8 hours apart)
3. Close the position
4. Check the realized PNL calculation
**Expected Result:** Funding cost = Position Value × Funding Rate is included in the realized PNL deduction
**Actual Result:** At open, `position.fundingRate` is set to `0` (trading.js line 74). At close, `formulas.funding(posValue, pos.fundingRate || 0)` always evaluates to `0`. The `realizedPnl` formula correctly subtracts funding, but the funding value is always zero. The actual Binance API funding rate is available but never stored on the position.
**Affected File:** `js/trading.js` line 74
**BA Reference:** TASK-017 AC: "Funding = Position Value × Funding Rate"

---

### BUG-007 — Severity: Major
**Title:** No liquidation enforcement despite showing Liq Price in the UI
**Steps to Reproduce:**
1. Open a Long position with 10x leverage
2. Note the displayed Liquidation Price
3. If the market moves such that Mark Price drops below the Liq Price, observe behavior
**Expected Result:** Position should be auto-liquidated (force-closed) when Mark Price crosses the Liquidation Price
**Actual Result:** The `monitorLoop` in `app.js` only checks TP/SL conditions via `trading.checkTpSl()`. There is no check for liquidation. The Liq Price is calculated and displayed but never enforced. A position can theoretically have a PNL that exceeds the margin without being liquidated.
**Affected File:** `js/trading.js` `checkTpSl()` — missing liquidation check
**Note:** BA TASK-019 only specifies TP/SL auto-close. However, displaying a Liq Price (TASK-009, TASK-012) that is never enforced is functionally misleading. Should be escalated to BA/PM.

---

### BUG-008 — Severity: Major
**Title:** localStorage write failure silently ignored — trades may appear to succeed but data is lost
**Steps to Reproduce:**
1. Fill localStorage near its 5MB limit
2. Attempt to open a new position
**Expected Result:** An error message tells the user that data could not be saved
**Actual Result:** `storage.safeSet()` returns `false` on write failure and logs to console, but no caller checks the return value. `addPosition`, `setBalance`, `setPositions` all silently fail. The position appears in the in-memory render but is lost on page reload.
**Affected File:** `js/storage.js` lines 53-61, and all calling functions
**BA Reference:** TASK-025: "If localStorage is disabled (private browsing), show a user-friendly error"

---

### BUG-009 — Severity: Minor
**Title:** Admin coin form does not validate symbol format — allows special characters and spaces
**Steps to Reproduce:**
1. Open admin.html → Coin Management
2. Enter symbol: "BTC USDT" (with space) or "BTC<>USDT"
3. Click Add Coin
**Expected Result:** Validation error: "Symbol must be uppercase letters/numbers only"
**Actual Result:** The symbol is accepted (only `.trim().toUpperCase()` is applied). Special characters pass through and may cause issues when used as API query parameters or rendered in innerHTML templates.
**Affected File:** `js/admin.js` lines 90-126
**BA Reference:** TASK-022: "Symbol format validation: must be uppercase, no spaces"

---

### BUG-010 — Severity: Minor
**Title:** Admin coin edit does not update pricePrecision or qtyPrecision
**Steps to Reproduce:**
1. Add a new coin (e.g., SOLUSDT with baseAsset SOL)
2. The coin is created with `pricePrecision: 2` (hard-coded for non-BTC)
3. Edit the coin — change any field — save
4. Inspect the coin in localStorage
**Expected Result:** pricePrecision and qtyPrecision are preserved or updateable
**Actual Result:** `updateCoin()` in admin.js line 106 sends `{ symbol, baseAsset, quoteAsset, displayName, apiSymbol }` — missing `pricePrecision` and `qtyPrecision`. After edit, these fields retain their original values (which is acceptable) but can never be changed. There is no UI to edit precision.
**Affected File:** `js/admin.js` line 106

---

### BUG-011 — Severity: Minor
**Title:** TP/SL fields remain expanded after successful trade execution
**Steps to Reproduce:**
1. Check the TP/SL checkbox
2. Enter TP and SL values
3. Enter a Size and click Buy/Long
4. After successful trade, observe the TP/SL area
**Expected Result:** (Debatable) Either TP/SL checkbox resets and fields collapse, or values clear but fields stay open for the next trade
**Actual Result:** TP and SL input values are cleared (app.js lines 284-285), but the checkbox remains checked and the fields remain expanded. The user might accidentally submit the next trade with empty TP/SL thinking they're still set.
**Affected File:** `js/app.js` lines 283-289
**BA Reference:** TASK-018: "The TP/SL checkbox resets after trade execution (or stays — TBD by PM)"

---

### BUG-012 — Severity: Minor
**Title:** History table has no `<thead>` element — missing column headers
**Steps to Reproduce:**
1. Open a position, close it (via TP/SL or manual close)
2. Switch to Position History tab
3. Observe the table layout
**Expected Result:** A proper table header row with columns: Symbol, Perp, Leverage, Margin Mode, Direction, Status, Open Time, Close Time, etc. (per TASK-014)
**Actual Result:** The `<table class="history-table">` only contains a `<tbody>`. Each history entry uses a single `<td colspan="100%">` with a complex card-style layout inside. While this card layout is functional and displays all data, it deviates from the tabular format specified in TASK-014 and the `.history-table th` CSS rules go unused.
**Affected File:** `index.html` lines 282-284, `js/ui.js` lines 248-320

---

### BUG-013 — Severity: Minor
**Title:** Warning banner has visible close icon (✕) but is non-dismissible — misleading UX
**Steps to Reproduce:**
1. Open index.html
2. Look at the yellow warning banner
3. Click the ✕ icon on the right
**Expected Result:** Per BA TASK-004: "Close 'X' icon on the right (visible but non-functional)" — this is per spec
**Actual Result:** The ✕ is visible but does nothing (`cursor: default`, no JS handler). While technically per-spec, having a close icon that does nothing is confusing UX. However, the BA explicitly requires this behavior, so this is a **cosmetic observation**, not a violation.
**Affected File:** `index.html` line 45, `css/styles.css` lines 234-238

---

### BUG-014 — Severity: Minor
**Title:** Full positions table and ticker bar re-render on every WebSocket tick (performance)
**Steps to Reproduce:**
1. Open the trading page with both BTCUSDT and BNBUSDT configured
2. Open 5+ positions
3. Open Chrome DevTools Performance tab
4. Record for 10 seconds
**Expected Result:** Only changed cells update, DOM mutations are minimal
**Actual Result:** Every WebSocket message (~1/second per stream) triggers `renderPositions()` and `renderTicker()` which set `tbody.innerHTML` and `container.innerHTML` to entirely rebuilt HTML strings. With 2 coins × 2 streams = ~4 messages/second, the entire positions table and ticker bar are torn down and rebuilt ~4 times per second. This causes layout thrashing, breaks text selection, and is unnecessary for unchanged rows.
**Affected File:** `js/ui.js` lines 176-235 (positions), 357-383 (ticker), `js/app.js` lines 37-43
**BA Reference:** TASK-032 AC: "only change DOM elements whose values actually changed"

---

### BUG-015 — Severity: Minor
**Title:** Share modal lacks focus trap — Tab key escapes to background content
**Steps to Reproduce:**
1. Close a position so it appears in history
2. Switch to Position History tab
3. Click the share icon (⤴) to open the modal
4. Press Tab repeatedly
**Expected Result:** Focus stays trapped within the modal (close button and focusable elements cycle)
**Actual Result:** Tab moves focus to elements behind the modal overlay. The modal has no `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, and no focus trap implementation.
**Affected File:** `js/ui.js` lines 387-440, `index.html` lines 302-310
**BA Reference:** TASK-015 Edge Case: "Modal should trap focus for accessibility"

---

### BUG-016 — Severity: Minor
**Title:** Tab bar and history filters not keyboard-accessible
**Steps to Reproduce:**
1. Open index.html
2. Try to Tab-navigate to the "Position History" tab
3. Try pressing Enter or Space on it
**Expected Result:** Tab reachable via keyboard, activated by Enter/Space
**Actual Result:** Tabs are `<span>` elements with no `tabindex`, no `role="tab"`, and no keyboard event handlers. They are invisible to keyboard navigation. Same issue with history period filter buttons (`<span data-period="...">`) and coin dropdown items (`<div data-symbol="...">`).
**Affected File:** `index.html` lines 216-228 (tabs), lines 261-264 (period filters)

---

### BUG-017 — Severity: Cosmetic
**Title:** `balance()` formula function is exported but never used in the application
**Steps to Reproduce:** Code inspection of `js/formulas.js` line 38 and grep for its usage
**Expected Result:** The formula is used for balance calculation
**Actual Result:** `formulas.balance()` exists and is correctly implemented, but the actual balance tracking in `trading.js` uses imperative `storage.getBalance()` + manual arithmetic. This creates risk of formula drift — the formula says one thing, the code does another (though currently they produce the same result). Dead code.
**Affected File:** `js/formulas.js` line 38, `js/trading.js`

---

---

## Test Case Results

| TC# | Test Case | Result | Bug Ref |
|-----|-----------|--------|---------|
| TC-01 | Open Long position with valid size | PASS | — |
| TC-02 | Open Short position with valid size | PASS | — |
| TC-03 | Open position with empty Size | PASS | — |
| TC-04 | Open position with letters in Size | PASS | — |
| TC-05 | Open position with negative Size | PASS | — |
| TC-06 | Open position exceeding balance | PASS | — |
| TC-07 | Open position when API not loaded | PASS | — |
| TC-08 | Rapid double-click Buy/Long | PASS | — |
| TC-09 | TP/SL checkbox toggles visibility | PASS | — |
| TC-10 | TP below entry for Long rejected | PASS | — |
| TC-11 | SL above entry for Long rejected | PASS | — |
| TC-12 | TP above entry for Short rejected | PASS | — |
| TC-13 | SL below entry for Short rejected | PASS | — |
| TC-14 | Auto-close Long on TP hit | PASS | — |
| TC-15 | Auto-close Long on SL hit | PASS | — |
| TC-16 | Auto-close Short on TP hit | PASS | — |
| TC-17 | Auto-close Short on SL hit | PASS | — |
| TC-18 | Manual close position via button | FAIL | BUG-001 |
| TC-19 | Close position for non-selected coin | FAIL | BUG-001 |
| TC-20 | PNL formula (Long) | PASS | — |
| TC-21 | PNL formula (Short) | PASS | — |
| TC-22 | ROI formula | PASS | — |
| TC-23 | Liq Price formula (Long) | PASS | — |
| TC-24 | Liq Price formula (Short) | PASS | — |
| TC-25 | Balance after opening trade | PASS | — |
| TC-26 | Balance after closing trade | PASS | — |
| TC-27 | Realized PNL calculation | PARTIAL | BUG-006 |
| TC-28 | Available Balance calculation | PASS | — |
| TC-29 | Max Position Size calculation | PASS | — |
| TC-30 | Number formatting — commas | PASS | — |
| TC-31 | Number formatting — negative zero | PASS | — |
| TC-32 | Switch coin via dropdown | PASS | — |
| TC-33 | Dropdown closes on outside click | PASS | — |
| TC-34 | Position History tab switching | PASS | — |
| TC-35 | History filter — 1 Day | PASS | — |
| TC-36 | History filter — 1 Week | PASS | — |
| TC-37 | History filter — 1 Month | PASS | — |
| TC-38 | History filter — 3 Months | PASS | — |
| TC-39 | Share icon opens modal | PASS | — |
| TC-40 | Share modal close on ✕ | PASS | — |
| TC-41 | Share modal close on Escape | PASS | — |
| TC-42 | Share modal close on backdrop | PASS | — |
| TC-43 | Admin — Add coin | PASS | — |
| TC-44 | Admin — Edit coin | PARTIAL | BUG-010 |
| TC-45 | Admin — Delete coin | PARTIAL | BUG-005 |
| TC-46 | Admin — Duplicate symbol rejected | PASS | — |
| TC-47 | Admin — Save settings | PASS | — |
| TC-48 | Admin — Settings validation | PASS | — |
| TC-49 | Admin — Reset Trading Data | PASS | — |
| TC-50 | Admin — Reset Everything | PASS | — |
| TC-51 | Data persists across reload | PASS | — |
| TC-52 | Corrupt localStorage handled | PASS | — |
| TC-53 | Bottom ticker shows live prices | PASS | — |
| TC-54 | Funding countdown ticks | PASS | — |
| TC-55 | Empty state — no positions | PASS | — |
| TC-56 | Empty state — no history | PASS | — |
| TC-57 | Position count badge updates | PASS | — |
| TC-58 | Connection status indicator | PASS | — |
| TC-59 | XSS in Size input | PASS | — |
| TC-60 | XSS in TP/SL inputs | PASS | — |
| TC-61 | XSS via admin coin name | FAIL | BUG-003 |
| TC-62 | Keyboard navigation — tab controls | FAIL | BUG-016 |
| TC-63 | Modal focus trap | FAIL | BUG-015 |
| TC-64 | Margin mode shows "Isolated" | FAIL | BUG-002 |
| TC-65 | Position row shows coin symbol | FAIL | BUG-004 |
| TC-66 | Liquidation enforcement | FAIL | BUG-007 |

---

## BA Task Compliance

| Task | Feature | QA Result | Notes |
|------|---------|-----------|-------|
| TASK-001 | Project Structure | ✅ PASS | Clean module structure, works without server |
| TASK-002 | CSS Theme | ✅ PASS | Colors, fonts, spacing match Binance light theme |
| TASK-003 | Header | ✅ PASS | Logo, nav items, icons present and positioned |
| TASK-004 | Warning Banner | ✅ PASS | Yellow banner, non-dismissible, correct text |
| TASK-005 | Trading Pair Display | ✅ PASS | Live price, 24h data, funding, countdown |
| TASK-006 | Order Panel Layout | ❌ FAIL | "Cross" should be "Isolated" — BUG-002 |
| TASK-007 | TP/SL Functionality | ✅ PASS | Toggle, expand, inputs, validation all work |
| TASK-008 | Buy/Sell Buttons | ✅ PASS | Debounce, validation, fee deduction |
| TASK-009 | Calculated Fields | ✅ PASS | Liq Price, Cost, Max calculated correctly |
| TASK-010 | Account Balance | ✅ PASS | Balance and Unrealized PNL displayed |
| TASK-011 | Tab Bar | ✅ PASS | Counts update, active state correct |
| TASK-012 | Positions Table | ⚠️ PARTIAL | Data correct but no Symbol column — BUG-004 |
| TASK-013 | History Layout | ✅ PASS | Filters, period buttons, tab switching |
| TASK-014 | History Table | ⚠️ PARTIAL | Data correct but card layout instead of tabular columns — BUG-012 |
| TASK-015 | Share Modal | ⚠️ PARTIAL | Works but missing focus trap (AC edge case) — BUG-015 |
| TASK-016 | API Integration | ✅ PASS | WebSocket + REST fallback, reconnect logic |
| TASK-017 | Formula Engine | ⚠️ PARTIAL | Formulas correct but funding always 0 — BUG-006 |
| TASK-018 | Open Position | ✅ PASS | All validations pass, fee deduction correct |
| TASK-019 | TP/SL Trigger | ✅ PASS | Auto-close on tick, TP priority over SL |
| TASK-020 | Ticker Bar | ✅ PASS | Prices, changes, connection status |
| TASK-021 | Admin Layout | ✅ PASS | Sidebar + content, clean design |
| TASK-022 | Coin CRUD | ⚠️ PARTIAL | Works but no symbol format validation — BUG-009 |
| TASK-023 | Platform Settings | ✅ PASS | All fields, validation, persistence |
| TASK-024 | Reset Data | ✅ PASS | Two-tier reset, confirmation dialogs |
| TASK-025 | localStorage | ✅ PASS | Prefix, safe JSON, 500-entry cap |
| TASK-026 | Coin Dropdown | ✅ PASS | Selection updates all data |
| TASK-027 | Funding Timer | ✅ PASS | HH:MM:SS countdown, 1s interval |
| TASK-028 | Number Formatting | ✅ PASS | Commas, decimals, sign, -0 handling |
| TASK-029 | 1920px Layout | ✅ PASS | Viewport meta, flex layout, 300px panel |
| TASK-030 | Empty States | ✅ PASS | Both tables show empty message |
| TASK-031 | Navigation | ✅ PASS | In-page tab switching |
| TASK-032 | Monitoring Loop | ✅ PASS | 2s interval, checks all positions |
| TASK-033 | Direction Indicator | ✅ PASS | Green/red on size value |
| TASK-034 | Coin Icons | ✅ PASS | CDN icons with letter fallback |
| TASK-035 | Error Handling | ✅ PASS | Toasts, inline errors, API retry |
| TASK-036 | Page Load | ✅ PASS | Init sequence, empty state handling |
| TASK-037 | Multiple Positions | ✅ PASS | Independent positions, separate TP/SL |

**Score: 30/37 PASS, 5 PARTIAL, 2 FAIL**

---

## Known Issues from Code Review — Verification

| # | Issue | Verified | Status |
|---|-------|----------|--------|
| 1 | Position close may use wrong coin's price (app.js:215-218) | ✅ Confirmed | BUG-001 (Critical) |
| 2 | Margin mode says "Cross" instead of "Isolated" | ✅ Confirmed | BUG-002 (Critical) |
| 3 | coinIconHtml has unsafe innerHTML (ui.js:22-29) | ✅ Confirmed | BUG-003 (Critical) |
| 4 | Full table re-render on every tick (performance) | ✅ Confirmed | BUG-014 (Minor) |
| 5 | Modal lacks focus trap, tabs not keyboard-accessible | ✅ Confirmed | BUG-015, BUG-016 (Minor) |

All 5 known issues from the code review are **confirmed** by QA testing.

---

## Summary

| Metric | Count |
|--------|-------|
| Total Test Cases | 66 |
| Passed | 55 |
| Failed | 8 |
| Partial | 3 |
| Blocked | 0 |

| Severity | Count | Bug IDs |
|----------|-------|---------|
| Critical | 3 | BUG-001, BUG-002, BUG-003 |
| Major | 5 | BUG-004, BUG-005, BUG-006, BUG-007, BUG-008 |
| Minor | 6 | BUG-009, BUG-010, BUG-011, BUG-012, BUG-014, BUG-015, BUG-016 |
| Cosmetic | 2 | BUG-013, BUG-017 |

### Strengths
- **Formula engine is mathematically correct** — PNL, ROI, Margin, Liq Price, Fees all match BA formulas
- **API integration is robust** — WebSocket + REST fallback, exponential backoff reconnection
- **localStorage layer is well-designed** — safe JSON parsing, graceful corruption handling, `bf_` prefix namespacing, 500-entry history cap
- **Trade execution flow works end-to-end** — open, track PNL, auto-close on TP/SL, record history
- **CSS theme accurately reproduces Binance** — correct colors, typography, spacing, component states
- **Admin CRUD is functional** — add/edit/delete coins, settings, two-tier reset

### Action Required

**3 critical bugs** and **5 major bugs** must be fixed before delivery. Priority order:

1. **BUG-001** (Critical) — Fix close-position price lookup to use `pos.symbol` directly
2. **BUG-002** (Critical) — Change "Cross" to "Isolated" in HTML and JS
3. **BUG-003** (Critical) — Sanitize all innerHTML interpolations or switch to DOM APIs
4. **BUG-004** (Major) — Add Symbol column to positions table
5. **BUG-005** (Major) — Block coin deletion when open positions exist, or force-close them
6. **BUG-006** (Major) — Store actual API funding rate on positions at open time
7. **BUG-007** (Major) — Add liquidation check to monitoring loop (or escalate to BA/PM for scope decision)
8. **BUG-008** (Major) — Check `safeSet` return value and show user error on write failure

**Send back to engineer with 17 bugs to fix.** Schedule re-test after fixes are applied.

---

*End of QA Report*
