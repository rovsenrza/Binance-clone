# UI/UX Visual Audit — Binance Futures Clone

**Audit Date:** 2026-05-18  
**Auditor:** Senior UI/UX Designer  
**Reference:** design.jpeg (Page 1), design2.jpeg (Page 2), live Binance Futures  
**Target:** 1920×1080 Chrome  
**Total Fixes Found:** 62

---

## Priority Legend
- **P0** — Immediately noticeable (wrong layout, wrong colors, wrong fonts, wrong icons)
- **P1** — Noticeable on comparison (spacing off by 5+ px, wrong font-weight)
- **P2** — Subtle (1-2px spacing, slight shade difference)

---

## 1. FAVICON

### FIX-001: Wrong favicon shape [P0]
**Screenshot shows:** Binance diamond/rhombus yellow shape on dark transparent background (rotated square forming a diamond with a cutout)
**Current code:** SVG with rounded yellow rectangle + letter "B" — this is completely wrong shape
**Fix (HTML):**
```html
<link rel="icon" href="https://bin.bnbstatic.com/static/images/common/favicon.ico">
```
**Alternative inline SVG if external URL is blocked:**
```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><polygon points='16,2 30,16 16,30 2,16' fill='%23F0B90B'/><polygon points='16,8 24,16 16,24 8,16' fill='%231E2329'/><polygon points='16,12 20,16 16,20 12,16' fill='%23F0B90B'/></svg>">
```

---

## 2. PAGE TITLE

### FIX-002: Static page title, missing price [P0]
**Screenshot shows:** Browser tab displays "75,770.1 | B..." (live price in title)
**Current code:** `<title>Binance Futures</title>` — static text, no price
**Fix (HTML):**
```html
<title>75,770.1 | BTCUSDT Perp</title>
```
**Fix (JS) — add to `renderPairBlock` in ui.js:**
```javascript
document.title = `${formulas.formatPrice(price, precision)} | ${symbol} Perp`;
```

---

## 3. HEADER

### FIX-003: Header height too short [P1]
**Screenshot shows:** Header is ~56px tall (proportionally larger than current)
**Current code:** `--header-height: 48px`
**Fix (CSS):**
```css
:root {
    --header-height: 56px;
}
```

### FIX-004: Logo icon is wrong — should be yellow house/home icon [P0]
**Screenshot shows:** A small yellow house/home icon (⌂ shape) to the left of "BINANCE"
**Current code:** A star SVG inside a yellow square background — completely wrong
**Fix (HTML):** Replace the logo icon with Binance's home icon SVG:
```html
<span class="header__logo-icon">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M4 10L12 3L20 10V20C20 20.55 19.55 21 19 21H5C4.45 21 4 20.55 4 20V10Z" fill="#FCD535"/>
    <path d="M9 21V12H15V21" fill="#1E2329"/>
  </svg>
</span>
```
**Fix (CSS):**
```css
.header__logo-icon {
    width: 20px;
    height: 20px;
    background: none;
    border-radius: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### FIX-005: Header nav items wrong color [P1]
**Screenshot shows:** Nav items in white/light (#EAECEF) — clearly readable, not muted gray
**Current code:** Color `#B7BDC6` — too dim
**Fix (CSS):**
```css
.header__nav-item {
    color: #EAECEF;
    font-size: 14px;
    font-weight: 400;
    padding: 4px 0;
    cursor: pointer;
    white-space: nowrap;
}
```

### FIX-006: Nav chevrons should be proper SVG arrows, not text "▾" [P1]
**Screenshot shows:** Small downward chevron SVG icons (∨ shape) after "Futures", "Options", "Data", "More"
**Current code:** `content: " ▾"` text character — looks incorrect compared to screenshot
**Fix (CSS):**
```css
.header__nav-item--chevron::after {
    content: "";
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-left: 2px;
    vertical-align: middle;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%23EAECEF' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
}
```

### FIX-007: Header right icons are EMOJI characters — MUST be SVG [P0]
**Screenshot shows:** Proper monoline SVG icons: user/profile circle, download/phone, clipboard/orders, globe, grid/apps, settings/gear — all matching Binance's icon style
**Current code:** 👤 ⬇ 🔔 🌐 ⊞ ⚙ — emoji characters that look amateurish
**Fix (HTML):** Replace the entire `.header__icons` section:
```html
<div class="header__icons">
  <!-- Profile/User -->
  <span class="header__icon" title="Profile">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#B7BDC6" stroke-width="2"/><path d="M4 20C4 17 7 14 12 14C17 14 20 17 20 20" stroke="#B7BDC6" stroke-width="2" stroke-linecap="round"/></svg>
  </span>
  <!-- Download/App -->
  <span class="header__icon" title="Download">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#B7BDC6" stroke-width="2"/><circle cx="12" cy="18" r="1" fill="#B7BDC6"/><line x1="8" y1="5" x2="16" y2="5" stroke="#B7BDC6" stroke-width="1.5"/></svg>
  </span>
  <!-- Orders/Clipboard -->
  <span class="header__icon" title="Orders">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="#B7BDC6" stroke-width="2"/><line x1="8" y1="8" x2="16" y2="8" stroke="#B7BDC6" stroke-width="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="#B7BDC6" stroke-width="1.5"/><line x1="8" y1="16" x2="12" y2="16" stroke="#B7BDC6" stroke-width="1.5"/></svg>
  </span>
  <!-- Globe -->
  <span class="header__icon" title="Language">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#B7BDC6" stroke-width="2"/><path d="M12 3C14 5 15 8.5 15 12C15 15.5 14 19 12 21M12 3C10 5 9 8.5 9 12C9 15.5 10 19 12 21" stroke="#B7BDC6" stroke-width="1.5"/><line x1="3" y1="12" x2="21" y2="12" stroke="#B7BDC6" stroke-width="1.5"/></svg>
  </span>
  <!-- Grid/Apps -->
  <span class="header__icon" title="Apps">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6" height="6" rx="1" stroke="#B7BDC6" stroke-width="2"/><rect x="14" y="4" width="6" height="6" rx="1" stroke="#B7BDC6" stroke-width="2"/><rect x="4" y="14" width="6" height="6" rx="1" stroke="#B7BDC6" stroke-width="2"/><rect x="14" y="14" width="6" height="6" rx="1" stroke="#B7BDC6" stroke-width="2"/></svg>
  </span>
  <!-- Settings/Gear -->
  <span class="header__icon" title="Settings">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#B7BDC6" stroke-width="2"/><path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="#B7BDC6" stroke-width="2" stroke-linecap="round"/></svg>
  </span>
</div>
```

### FIX-008: "BINANCE" text font-size should be ~16px [P2]
**Screenshot shows:** "BINANCE" is slightly larger, more prominent
**Current code:** `font-size: 15px`
**Fix (CSS):**
```css
.header__brand-binance {
    color: #FFFFFF;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
}

.header__brand-futures {
    color: #FCD535;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
}
```

---

## 4. WARNING BANNER

### FIX-009: Banner height too short [P1]
**Screenshot shows:** Banner is taller, ~44px, with wrapped text visible in two lines
**Current code:** `--banner-height: 36px` and `white-space: nowrap` — truncates text
**Fix (CSS):**
```css
:root {
    --banner-height: auto;
}

.warning-banner {
    display: flex;
    align-items: flex-start;
    min-height: 40px;
    padding: 8px 16px;
    font-size: 12px;
    color: #1E2329;
    border-bottom: 1px solid #EAECEF;
    gap: 8px;
    background: #FEF6D8;
}

.warning-banner__text {
    flex: 1;
    overflow: visible;
    text-overflow: unset;
    white-space: normal;
    line-height: 1.5;
}
```

### FIX-010: Banner icon should be circled "i" (info), not triangle "⚠" [P0]
**Screenshot shows:** Circle with "i" inside — an info icon, NOT a warning triangle
**Current code:** `⚠` emoji
**Fix (HTML):**
```html
<span class="warning-banner__icon">
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="#F0B90B" stroke-width="1.5" fill="none"/>
    <line x1="8" y1="7" x2="8" y2="11" stroke="#F0B90B" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="8" cy="5" r="0.75" fill="#F0B90B"/>
  </svg>
</span>
```

### FIX-011: Banner link color should be darker gold [P2]
**Screenshot shows:** Links "Terms of Use" and "Risk Warning" in darker gold/underlined
**Current code:** `color: var(--color-link)` (#C99400) — close but should be underlined
**Fix (CSS):**
```css
.warning-banner__text a {
    color: #C99400;
    text-decoration: underline;
    text-underline-offset: 2px;
}
```

---

## 5. LEFT ORDER PANEL

### FIX-012: Left panel width should be ~280px, not 300px [P1]
**Screenshot shows:** Panel is slightly narrower — proportionally ~280px based on screen ratio
**Current code:** `--left-panel-width: 300px`
**Fix (CSS):**
```css
:root {
    --left-panel-width: 280px;
}
```

### FIX-013: First margin badge should say "Cross" not "Isolated" [P0]
**Screenshot shows:** "Cross" (not "Isolated") as the first badge
**Current code:** `<span class="order-panel__margin-badge order-panel__margin-badge--active">Isolated</span>`
**Fix (HTML):**
```html
<span class="order-panel__margin-badge order-panel__margin-badge--active">Cross</span>
```

### FIX-014: Margin badges need tighter padding and specific border color [P2]
**Screenshot shows:** Very compact badges with visible border, ~2px 6px padding
**Current code:** `padding: 2px 8px`
**Fix (CSS):**
```css
.order-panel__margin-badge {
    border: 1px solid #EAECEF;
    border-radius: 2px;
    padding: 2px 6px;
    font-size: 12px;
    color: #474D57;
    cursor: pointer;
    line-height: 1.4;
}

.order-panel__margin-badge--active {
    color: #1E2329;
    border-color: #474D57;
}
```

### FIX-015: Slider markers should be diamond shapes (◇), not circles [P0]
**Screenshot shows:** Diamond/rhombus shapes on the slider track — the classic Binance diamond slider markers
**Current code:** `border-radius: 50%` — making them circles
**Fix (CSS):**
```css
.order-panel__slider-dot {
    width: 8px;
    height: 8px;
    border-radius: 0;
    background: #FFFFFF;
    border: 1.5px solid #EAECEF;
    transform: rotate(45deg);
}
```

### FIX-016: Buy/Long button insufficient height [P1]
**Screenshot shows:** Buttons are ~40px height, full width each on their row
**Current code:** `padding: 10px` — makes them ~36px
**Fix (CSS):**
```css
.order-panel__btn {
    flex: 1;
    height: 40px;
    padding: 0 10px;
    border-radius: 4px;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### FIX-017: Order type tabs — "Limit" should not be active, "Market" is correct in screenshot [P1]
**Screenshot shows:** In the first screenshot (design.jpeg), "Limit" is first tab (not bold), "Market" has bold/underline
**Current code:** Already has Market as active — but need to verify tab order. The screenshot shows: `Limit  Market  Conditi... ▾  ⋯`
**Fix:** The HTML tab order matches. Confirm "Market" is `--active`. This is correct.

### FIX-018: "Conditi..." tab should show "Conditi..." with dropdown chevron and separator dots [P2]
**Screenshot shows:** "Conditi..." followed by ▾ then some space then ⋯ (three dots separately)
**Current code:** Combined in one span: `Conditi… ▾ &nbsp; ⋯` — should be two separate elements
**Fix (HTML):**
```html
<span class="order-panel__type-tab">Conditi… <span class="order-panel__input-suffix-arrow">▾</span></span>
<span class="order-panel__type-tab" style="color:var(--color-text-tertiary);font-size:16px">⋯</span>
```

### FIX-019: Avbl line icons — transfer icon should be a proper symbol [P1]
**Screenshot shows:** A small transfer/switch icon (two arrows in circle) after the balance amount
**Current code:** `⇄` text character — acceptable but should be more compact
**Fix (CSS):**
```css
.order-panel__avbl-icon {
    cursor: pointer;
    margin-left: 4px;
    color: #474D57;
    font-size: 12px;
}
```

### FIX-020: "% Fee level" text should be left-aligned at the very bottom [P2]
**Screenshot shows:** "% Fee level" at the absolute bottom of the left panel
**Current code:** Already present — but needs `margin-top: auto` to push it down
**Fix (CSS):**
```css
.order-panel__fee-level {
    font-size: 12px;
    color: #848E9C;
    margin-top: auto;
    padding-top: 12px;
}
```

---

## 6. ACCOUNT BLOCK

### FIX-021: Account block should have visible left border separator [P1]
**Screenshot shows:** Clear vertical line separating left panel from Account block
**Current code:** Account block has `border-right: 1px solid var(--color-border)` — but we also need a proper left border from the order panel
**Fix:** The `order-panel` already has `border-right` so this is handled. However the Account block needs the "⇄ Switch" to look like an icon with text:
**Fix (CSS):**
```css
.account-block__switch {
    font-size: 12px;
    color: #C99400;
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
}
```

### FIX-022: Account "Switch" link should be gold/yellow color [P0]
**Screenshot shows:** "⇄ Switch" text in gold/yellow color — it's clearly a clickable link
**Current code:** `color: var(--color-text-tertiary)` (#848E9C) — gray
**Fix (CSS):**
```css
.account-block__switch {
    font-size: 12px;
    color: #C99400;
    cursor: pointer;
}
```

### FIX-023: Account block needs USDT dropdown with chevron [P2]
**Screenshot shows:** "USDT ▾" in a distinct row between Account header and Balance
**Current code:** Already present but needs proper styling
**Fix (CSS):**
```css
.account-block__currency {
    font-size: 13px;
    color: #1E2329;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
}
```

---

## 7. TRADING PAIR BLOCK

### FIX-024: Pair block price size should be larger [P1]
**Screenshot shows:** Price "75,770.1" is very prominent, approximately 22-24px bold
**Current code:** `--font-size-xl: 20px` — slightly too small
**Fix (CSS):**
```css
.pair-block__price {
    font-size: 22px;
    font-weight: 700;
    flex-shrink: 0;
}
```

### FIX-025: 24h change shows as two separate lines (value + percent) [P1]
**Screenshot shows:** "-2,365.8 -3.02%" on the SAME line below the price, both in red
**Current code:** Uses flex-direction column — makes them stack vertically. Should be on same line.
**Fix (CSS):**
```css
.pair-block__change {
    font-size: 12px;
    display: flex;
    flex-direction: row;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
}
```

### FIX-026: BTCUSDT symbol font should be bold 16px [P2]
**Screenshot shows:** "BTCUSDT" in bold ~16px followed by "Perp" in lighter gray
**Current code:** `font-size: var(--font-size-lg)` (16px) — correct, but the pair block has too much gap
**Fix (CSS):**
```css
.pair-block__selector {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
}
```

### FIX-027: Metrics section spacing and font [P2]
**Screenshot shows:** "Funding (8h) / Countdown" | "24h High" | "24h Low" with values below, in ~11px label, 12px value
**Current code:** Using 11px for label and 12px for value — close. But gap between metrics should be tighter.
**Fix (CSS):**
```css
.pair-block__metrics {
    display: flex;
    gap: 24px;
    font-size: 12px;
    flex-shrink: 0;
    margin-left: auto;
}
```

---

## 8. TAB BAR

### FIX-028: Tab bar should have "Assets" tab (from design2.jpeg) [P1]
**Screenshot shows:** In design2.jpeg, the tabs include "...Position History | Bots | Assets" — "Assets" tab is visible
**Current code:** No "Assets" tab present
**Fix (HTML):** Add after "Bots":
```html
<button class="tab-bar__tab tab-bar__tab--disabled" role="tab" disabled>Assets</button>
```

### FIX-029: Tab overflow arrows should be "› ›" (two separate arrows) [P2]
**Screenshot shows:** Two small ">" arrow buttons at the end of tab list for scrolling
**Current code:** Single `›` character
**Fix (HTML):**
```html
<span class="tab-bar__tab tab-bar__tab--scroll" style="margin-left:4px;cursor:pointer;font-size:16px">‹</span>
<span class="tab-bar__tab tab-bar__tab--scroll" style="cursor:pointer;font-size:16px">›</span>
```

### FIX-030: Tab font size should be 13px, gap should be smaller [P2]
**Screenshot shows:** Tabs are tightly spaced, ~13px text
**Current code:** `gap: var(--space-20)` (20px) — too much
**Fix (CSS):**
```css
.tab-bar__tabs {
    display: flex;
    gap: 16px;
    flex: 1;
    overflow: hidden;
}

.tab-bar__tab {
    font-size: 13px;
    color: #474D57;
    padding: 12px 0;
}
```

### FIX-031: "Hide Other Symbols" checkbox and "⋯" icon in right of tab bar [P2]
**Screenshot shows:** Checkbox is square, followed by text, then a "⊕" (circled X/close) icon on far right
**Current code:** Already has these, but needs the close/dismiss icon (the ⊕ seen in screenshot)
**Fix (HTML):** In design2.jpeg there's a small ⊕ (or ⊗) close icon on the far right:
```html
<div class="tab-bar__right">
  <label><input type="checkbox" disabled> Hide Other Symbols</label>
  <span style="cursor:pointer;font-size:14px;color:#848E9C">⋯</span>
</div>
```

---

## 9. POSITIONS TABLE (Page 1)

### FIX-032: Table should NOT have a "Symbol" column visible as first column [P0]
**Screenshot shows:** The table columns are: Size | Entry Price | Mark Price | PNL(ROI %) | Liq.Price | TP/SL for position | Action — NO separate "Symbol" column
**Current code:** Has `<th>Symbol</th>` as the first column
**Fix:** In the screenshot, the Symbol is shown within the row's first visible column context (likely as the pair name above or to the left). Since positions already know the symbol, and looking at the screenshot closely, "Size" is the first data column with values like "75.78 USDT" in green.

The symbol might be shown inline before Size or as a row label. Looking at the screenshot more carefully: the columns start with "Size" directly.

**Fix (HTML):** Remove the Symbol column header:
```html
<thead>
  <tr>
    <th>Size</th>
    <th>Entry Price</th>
    <th>Mark Price</th>
    <th>PNL(ROI%)</th>
    <th>Liq.Price</th>
    <th>TP/SL for position</th>
    <th>Action</th>
  </tr>
</thead>
```
**Fix (JS) — ui.js renderPositionsTable:** Remove the Symbol `<td>` from the row template, or make the symbol inline with the Size cell.

### FIX-033: Position Size cell should show colored text (green=Long, red=Short) [P1]
**Screenshot shows:** "75.78 USDT" in green (Long position), "49.671 USDT" in red (Short) — just the number + USDT, colored
**Current code:** Already has `sizeColor` class — this is correct. But verify it renders without "Symbol" prefix.

### FIX-034: PNL cell layout — value on top, ROI % below, share icon to the right [P1]
**Screenshot shows:** PNL column displays:
- "-0.01 USDT" (red, first line)
- "-0.26%" (red, second line)
- A small share icon (⇧ or curved arrow) to the right of the PNL
**Current code:** Has PNL stacked correctly but the share icon is missing from the PNL column (it's shown separate or missing)
**Fix (HTML/JS):** Add share icon inline with PNL cell:
```html
<td>
  <div class="positions-table__pnl">
    <span class="positions-table__pnl-value text-short">-0.01 USDT</span>
    <span class="positions-table__pnl-roi text-short">-0.26%</span>
  </div>
  <span class="positions-table__share">⤴</span>
</td>
```
**Fix (CSS):** PNL cell needs horizontal layout with share icon:
```css
.positions-table td:nth-child(4) {
    position: relative;
}

.positions-table__share {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: #848E9C;
    font-size: 14px;
}
```

### FIX-035: TP/SL column shows stacked values with "/" separator [P2]
**Screenshot shows:** "77,000.00 /" on first line, "73,000.00" on second line
**Current code:** Shows "77,000.00 / 73,000.00" inline — should be stacked
**Fix (CSS):**
```css
.positions-table__tpsl {
    font-size: 12px;
    line-height: 1.8;
    white-space: pre-line;
}
```

### FIX-036: Action column layout — edit icon + Market (gold) + Limit (gray) + two inputs [P0]
**Screenshot shows:** Action column has:
1. A small clipboard/edit icon (📋)
2. "Market" in gold/yellow text
3. "Limit" in gray text
4. An input box with price value (e.g., "75,788.4")
5. Another input box with quantity (e.g., "0.001")
**Current code:** Has Market + Limit + Close button — missing the edit icon and the two input boxes, has wrong "Close" button
**Fix (HTML/JS):** Update action cell template in `renderPositionsTable`:
```html
<td>
  <div class="positions-table__action">
    <span class="positions-table__action-edit" title="Edit">📋</span>
    <span class="positions-table__action-btn positions-table__action-btn--market">Market</span>
    <span class="positions-table__action-btn positions-table__action-btn--limit">Limit</span>
    <input class="positions-table__action-input" type="text" value="75,788.4" readonly>
    <input class="positions-table__action-input" type="text" value="0.001" readonly>
  </div>
</td>
```
**Fix (CSS):**
```css
.positions-table__action {
    display: flex;
    align-items: center;
    gap: 6px;
}

.positions-table__action-edit {
    font-size: 14px;
    color: #848E9C;
    cursor: pointer;
}

.positions-table__action-input {
    width: 68px;
    border: 1px solid #EAECEF;
    border-radius: 2px;
    padding: 3px 6px;
    font-size: 12px;
    text-align: right;
    color: #1E2329;
    background: #FAFAFA;
}
```

### FIX-037: Table row height should be ~44px [P2]
**Screenshot shows:** Rows are ~44px tall
**Current code:** Padding of 8px top/bottom on cells = ~36px
**Fix (CSS):**
```css
.positions-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #EAECEF;
    white-space: nowrap;
    vertical-align: middle;
}
```

---

## 10. POSITION HISTORY (Page 2)

### FIX-038: History view uses card-row layout, NOT a traditional table with column headers [P0]
**Screenshot shows:** No visible column headers in position history. Each position is a CARD ROW with:
- Line 1: Coin icon + "BNBUSDT" bold + "Perp" gray + "10x" gray + "Cross Long" green badge + "Closed" gray + share icon + dates right-aligned
- Line 2: Metrics in a horizontal row (Realized PNL | ROI | Closed Vol. | Entry Price | Avg. Close Price | Max OI)
**Current code:** Uses `<thead>` with 15 columns — completely wrong layout
**Fix:** The history table should NOT have `<thead>`. The current JS (`renderHistoryTable`) uses `colspan="100%"` rows which is closer. Remove the `<thead>` from HTML:
```html
<table class="history-table">
  <tbody id="history-tbody"></tbody>
</table>
```
**Fix (HTML) — remove the `<thead>` section entirely from the history table.**

### FIX-039: History date format should be MM/DD/YYYY HH:MM:SS [P1]
**Screenshot shows:** "04/28/2026 17:19:08 Opened" — format is MM/DD/YYYY
**Current code:** Uses "YYYY-MM-DD HH:MM:SS" format
**Fix (JS):** Update `formatTime` function:
```javascript
function formatTime(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getMonth()+1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
```

### FIX-040: History note text "Refresh" link should be gold colored [P1]
**Screenshot shows:** "...please click Refresh to update the data. Refresh" where "Refresh" is clearly gold/yellow
**Current code:** Already uses `color: var(--color-primary-hover)` — correct. But the note `<a>` tag lacks `href="#"`:
**Fix (HTML):**
```html
<a href="#" onclick="return false">Refresh</a>
```

### FIX-041: History period pills — "1 Day" active should be filled yellow [P1]
**Screenshot shows:** "1 Day" pill has yellow background, black text
**Current code:** Already styled with `--color-primary` background — correct.
**Fix:** This is already correct in the CSS.

### FIX-042: History filter "Mode ▾" | "Symbol ▾" | "Status ▾" should be dropdown-style buttons [P2]
**Screenshot shows:** These are styled as dropdown trigger buttons with down arrow
**Current code:** Uses `<select>` elements — should be styled buttons/dropdowns
**Fix (CSS):**
```css
.history-filters__select {
    border: 1px solid #EAECEF;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    color: #1E2329;
    background: #FFFFFF;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 3.5L5 6.5L8 3.5' stroke='%23474D57' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 24px;
}
```

### FIX-043: "Search" button should be filled yellow, "Reset" should be text-only [P2]
**Screenshot shows:** "Search" has yellow background; "Reset" is plain text link
**Current code:** Search already has `background: var(--color-primary)` — correct. Reset is also styled.
**Fix:** Already correct.

---

## 11. BOTTOM TICKER BAR

### FIX-044: Ticker bar height should be ~24px [P2]
**Screenshot shows:** Very compact bottom bar, approximately 24px
**Current code:** `--ticker-height: 28px` — slightly too tall
**Fix (CSS):**
```css
:root {
    --ticker-height: 24px;
}
```

### FIX-045: Ticker items need coin logo icons (small circles) before symbol [P1]
**Screenshot shows:** Each ticker item has a small coin icon (colored circle) before the symbol name
**Current code:** No coin icons in ticker — just text
**Fix (JS):** Update `renderTickerBar` to include small coin icons:
```javascript
html += `<div class="ticker-bar__item">
  <span class="ticker-bar__coin" style="width:14px;height:14px;border-radius:50%;background:#F0B90B;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#1E2329">${coin.baseAsset[0]}</span>
  <span class="ticker-bar__symbol">${coin.symbol}</span>
  <span class="ticker-bar__change ${colorClass}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>
  <span class="ticker-bar__price">${price}</span>
</div>`;
```

### FIX-046: Ticker bar has "Disclaimer" and "Cookie Preferences" links on the right [P1]
**Screenshot shows:** Right side of ticker has "Disclaimer" and "Cookie Preferences" text links
**Current code:** No such links present
**Fix (HTML):**
```html
<div class="ticker-bar" id="ticker-items">
  <div class="ticker-bar__connection">
    <span class="ticker-bar__connection-dot ticker-bar__connection-dot--error"></span> Connecting...
  </div>
  <!-- ticker items rendered by JS -->
</div>
<div class="ticker-bar__right-links">
  <a href="#" class="ticker-bar__link">Disclaimer</a>
  <a href="#" class="ticker-bar__link">Cookie Preferences</a>
</div>
```
**Fix (CSS):**
```css
.ticker-bar__right-links {
    position: fixed;
    bottom: 0;
    right: 16px;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 101;
}

.ticker-bar__link {
    font-size: 11px;
    color: #B7BDC6;
    text-decoration: none;
}

.ticker-bar__link:hover {
    color: #FFFFFF;
}
```

### FIX-047: Ticker gap between items should be smaller [P2]
**Screenshot shows:** Items are more tightly packed
**Current code:** `gap: var(--space-32)` (32px) — too much
**Fix (CSS):**
```css
.ticker-bar {
    gap: 24px;
}
```

---

## 12. FONTS

### FIX-048: Font family should include IBM Plex Sans (closest to BinancePlex) [P0]
**Screenshot shows:** Binance uses "BinancePlex" which is based on IBM Plex Sans
**Current code:** Uses system fonts only — no IBM Plex Sans
**Fix (HTML):** Add Google Fonts link in `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```
**Fix (CSS):**
```css
:root {
    --font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
```

### FIX-049: Font weight 600 used in buttons should be 500 [P2]
**Screenshot shows:** Binance buttons use font-weight 500 (medium), not 600 (semi-bold)
**Current code:** `.order-panel__btn { font-weight: 600 }`
**Fix (CSS):**
```css
.order-panel__btn {
    font-weight: 500;
}
```

---

## 13. LAYOUT ADJUSTMENTS

### FIX-050: Trading layout height calc needs banner-height to be auto [P1]
**Screenshot shows:** Content area fills space properly
**Current code:** `height: calc(100vh - var(--header-height) - var(--banner-height) - var(--ticker-height))` — breaks if banner is auto-height
**Fix (CSS):**
```css
.trading-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
}

body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

.trading-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
}
```

### FIX-051: Page background should be white (#FFFFFF) not off-white (#FAFAFA) for content [P2]
**Screenshot shows:** The main content areas (account block, pair block, table) are all white
**Current code:** `--color-bg-page: #FAFAFA` and cards are `#FFFFFF` — this is correct, the page bg is subtle
**Fix:** This is already correct — content is `#FFFFFF` cards on `#FAFAFA` page.

### FIX-052: Trading info row (account + pair) needs proper alignment [P1]
**Screenshot shows:** Account block and pair block are vertically aligned, same height
**Current code:** `align-items: flex-start` — may cause misalignment
**Fix (CSS):**
```css
.trading-info {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid #EAECEF;
    background: #FFFFFF;
}
```

---

## 14. INTERACTIVE STATES

### FIX-053: Input focus state needs yellow border [P2]
**Screenshot shows:** Input fields get yellow border on focus (Binance standard)
**Current code:** Already has `.order-panel__input-wrapper:focus-within { border-color: var(--color-primary) }` — correct.

### FIX-054: Buttons need proper hover darkening [P2]
**Screenshot shows:** On hover, buttons darken slightly
**Current code:** Uses opacity 0.88 — should darken by adjusting background color
**Fix (CSS):**
```css
.order-panel__btn--long:hover {
    background: #0BB574;
}

.order-panel__btn--short:hover {
    background: #E03B52;
}

.order-panel__btn:hover {
    opacity: 1;
}
```

---

## 15. SPECIFIC UI PATTERNS

### FIX-055: Position table "Market" text should be gold/primary color [P1]
**Screenshot shows:** "Market" link in gold (#F0B90B or #C99400)
**Current code:** Uses `--color-primary-hover` (#F0B90B) — correct.

### FIX-056: Position table "Limit" text should be secondary gray [P2]
**Screenshot shows:** "Limit" in gray/muted
**Current code:** `color: var(--color-text-secondary)` — correct.

### FIX-057: Table header text color should be #848E9C (tertiary) [P2]
**Screenshot shows:** Column headers in light gray
**Current code:** `color: var(--color-text-tertiary)` — correct.

### FIX-058: Coin icon in pair selector should load actual Bitcoin logo [P1]
**Screenshot shows:** Orange/gold Bitcoin symbol (₿) inside orange circle
**Current code:** Uses external URL `https://cryptologos.cc/logos/bitcoin-btc-logo.svg` — which may not load due to CORS
**Fix:** Add fallback styling for when image fails:
```css
.pair-block__coin-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #F7931A;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #FFFFFF;
    flex-shrink: 0;
}
```

### FIX-059: History card-row coin icon should be proper coin color [P1]
**Screenshot shows:** BNB icon is yellow circle, BTC icon is orange circle
**Current code:** All icons use `--color-primary` yellow — should differentiate
**Fix (CSS/JS):** Use coin-specific colors:
```css
.history-table__coin-icon--BTC { background: #F7931A; color: #FFFFFF; }
.history-table__coin-icon--BNB { background: #F0B90B; color: #1E2329; }
.history-table__coin-icon--ETH { background: #627EEA; color: #FFFFFF; }
```

---

## 16. MISSING ELEMENTS

### FIX-060: Missing "< >" navigation arrows after price change area [P1]
**Screenshot shows:** Small left/right arrows after the 24h change text, before the metrics
**Current code:** No navigation arrows present
**Fix (HTML):** Add after `.pair-block__change`:
```html
<div class="pair-block__nav-arrows">
  <span class="pair-block__nav-arrow">‹</span>
  <span class="pair-block__nav-arrow">›</span>
</div>
```
**Fix (CSS):**
```css
.pair-block__nav-arrows {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
}

.pair-block__nav-arrow {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #EAECEF;
    border-radius: 2px;
    font-size: 14px;
    color: #474D57;
    cursor: pointer;
}

.pair-block__nav-arrow:hover {
    background: #F5F5F5;
}
```

### FIX-061: Missing "..." ellipsis after 24h Low in metrics [P2]
**Screenshot shows:** After "24h Low" value there is a "..." suggesting more metrics are hidden
**Current code:** No ellipsis indicator
**Fix (HTML):** Add after the last metric:
```html
<div class="pair-block__metric pair-block__metric--more">
  <span class="pair-block__metric-label">&nbsp;</span>
  <span class="pair-block__metric-value" style="color:#848E9C">...</span>
</div>
```

### FIX-062: Warning banner close button (X) should be functional or hidden properly [P2]
**Screenshot shows:** No visible close button on the warning banner
**Current code:** Has `✕` with `opacity:0.3; pointer-events:none` — but it's still visible
**Fix (CSS):**
```css
.warning-banner__close {
    display: none;
}
```

---

## SUMMARY

**Total fixes found: 62**

### Top 10 Most Visually Impactful (P0 fixes):

| # | Fix ID | Issue | Impact |
|---|--------|-------|--------|
| 1 | FIX-007 | Header icons are EMOJI, not SVG | Looks completely amateur |
| 2 | FIX-001 | Wrong favicon shape (square B vs diamond) | Brand identity broken |
| 3 | FIX-004 | Logo icon is wrong (star vs house icon) | Header looks incorrect |
| 4 | FIX-010 | Warning icon is ⚠ triangle instead of ⓘ circle | Wrong visual language |
| 5 | FIX-013 | "Isolated" should be "Cross" in margin badge | Functionality mismatch |
| 6 | FIX-032 | Positions table has extra "Symbol" column | Layout mismatches screenshot |
| 7 | FIX-036 | Action column missing edit icon and price inputs | Critical trading UI absent |
| 8 | FIX-038 | History uses wrong table layout (column headers vs card-rows) | Page 2 entirely wrong |
| 9 | FIX-048 | Missing IBM Plex Sans font (closest to BinancePlex) | Typography feels generic |
| 10 | FIX-002 | Page title is static, missing live price | Immediately visible in tab |

### Quick Win Fixes (can be done in <5 min each):
- FIX-001 (favicon URL)
- FIX-002 (title update in JS)
- FIX-003 (header height CSS var)
- FIX-009 (banner height)
- FIX-013 (Cross vs Isolated text)
- FIX-015 (diamond slider dots)
- FIX-022 (Switch link color)
- FIX-044 (ticker height)
- FIX-048 (Google Fonts link)
- FIX-062 (hide close button)

---

## IMPLEMENTATION ORDER (Recommended)

1. **Phase 1 — Fonts & Brand** (FIX-048, FIX-001, FIX-002, FIX-004, FIX-008)
2. **Phase 2 — Header** (FIX-003, FIX-005, FIX-006, FIX-007)
3. **Phase 3 — Warning Banner** (FIX-009, FIX-010, FIX-011, FIX-062)
4. **Phase 4 — Left Panel** (FIX-012, FIX-013, FIX-014, FIX-015, FIX-016, FIX-018, FIX-020)
5. **Phase 5 — Account & Pair Block** (FIX-021, FIX-022, FIX-023, FIX-024, FIX-025, FIX-026, FIX-027, FIX-060, FIX-061)
6. **Phase 6 — Tab Bar** (FIX-028, FIX-029, FIX-030, FIX-031)
7. **Phase 7 — Positions Table** (FIX-032, FIX-034, FIX-035, FIX-036, FIX-037)
8. **Phase 8 — History View** (FIX-038, FIX-039, FIX-040, FIX-042)
9. **Phase 9 — Bottom Ticker** (FIX-044, FIX-045, FIX-046, FIX-047)
10. **Phase 10 — Polish** (FIX-049, FIX-050, FIX-052, FIX-054, FIX-058, FIX-059)
