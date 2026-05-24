# Binance Futures Clone — Business Requirements Document

**Project:** Binance Futures Demo Platform (2 pages + Admin Panel)
**Prepared by:** Senior Business Analyst
**Date:** 2026-05-18
**Version:** 1.0
**Stack:** Vanilla HTML / CSS / JavaScript — No frameworks, no backend server
**Data Storage:** localStorage
**API:** Binance Public REST & WebSocket API (called directly from browser)
**Target Display:** Chrome browser, 24" Dell monitor (≈1920×1080)

---

## Executive Summary

The client requires a pixel-perfect replica of two Binance Futures trading screens:
1. **Active Positions** — live trading view with order entry panel, real-time price feeds, account balance, and a positions table.
2. **Position History** — archived closed trades with filtering and a share modal.

Plus a separate **Admin Panel** page to manage coins/trading pairs.

All trades are simulated (nominal) — no real money is exchanged. Positions open/close using formulas defined in the TZ, with live price data from the Binance Public API. The interface must be **visually identical** to the provided Binance screenshots.

---

## Glossary

| Term | Definition |
|------|-----------|
| TZ | Техническое задание (Technical Specification) |
| PNL | Profit and Loss |
| ROI | Return on Investment |
| TP | Take Profit |
| SL | Stop Loss |
| Liq Price | Liquidation Price |
| Mark Price | Current market price from API |
| Entry Price | Price at which a position was opened |
| Funding Rate | Periodic fee rate for perpetual contracts |
| Maintenance Margin Rate | Configurable rate used in liquidation formula |
| Perp | Perpetual (contract type label, always static) |

---

## Task List

---

### TASK-001: Project Structure & Scaffolding

**Feature:** Project Setup

**User Story:**
As a developer, I want a clean project structure with all necessary HTML, CSS, and JS files so that I can begin implementing features immediately.

**Acceptance Criteria:**
- [ ] Given the project is initialized, when I open it in a browser, then a blank page loads without errors
- [ ] Given the project structure, when I inspect the file tree, then I see: `index.html` (Page 1), `history.html` (Page 2), `admin.html` (Admin Panel), organized CSS files, organized JS files
- [ ] Given no build tools are required, when I open any HTML file directly in Chrome, then it works without a dev server
- [ ] Given localStorage is the storage mechanism, when the app loads for the first time, then it initializes default data structures (coins list, positions array, settings)

**UI Notes:**
- No UI for this task — structural only
- Include a shared `styles/` folder for common Binance theme variables (colors, fonts, spacing)
- Include a shared `js/` folder for modules (api, storage, formulas, trade-engine)

**Edge Cases:**
- First-time load with empty localStorage must not crash — initialize defaults
- Corrupted localStorage data should be handled gracefully (reset to defaults)

**Priority:** P0
**Estimated Complexity:** Low

---

### TASK-002: Global CSS Theme & Typography

**Feature:** Binance Visual Theme System

**User Story:**
As a user, I want the interface to look identical to the real Binance Futures platform so that I have an authentic experience.

**Acceptance Criteria:**
- [ ] Given the page loads, when I compare it to the Binance screenshot, then the background color is a light/white theme matching Binance Light mode
- [ ] Given the theme is applied, when I inspect text, then font family matches Binance UI (system fonts: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)
- [ ] Given the design, when I view the page, then I see: white card backgrounds, light gray separators (#EAECEF), green for profit/Long (#0ECB81), red for loss/Short (#F6465D), yellow accents for active tabs (#FCD535), dark text (#1E2329)
- [ ] Given the color scheme, when a value is positive PNL, then it displays in green; when negative, then in red

**UI Notes:**
- Light theme only (no dark mode toggle)
- Use CSS custom properties (variables) for all theme colors
- Binance-specific colors: primary yellow #FCD535, green #0ECB81, red #F6465D, text-primary #1E2329, text-secondary #474D57, bg-page #FAFAFA, bg-card #FFFFFF, border #EAECEF
- Font sizes: 12px for table data, 14px for labels, 20-24px for main price display
- Standard Binance spacing and border-radius (4px for inputs, 2px for small elements)

**Edge Cases:**
- Ensure colors render consistently across Chrome versions
- Ensure no browser default styles bleed through (use CSS reset)

**Priority:** P0
**Estimated Complexity:** Low

---

### TASK-003: Header Navigation Bar

**Feature:** Top Navigation Bar (Non-functional)

**User Story:**
As a user, I want to see the Binance Futures header bar so that the interface looks authentic.

**Acceptance Criteria:**
- [ ] Given Page 1 or Page 2 loads, when I look at the top, then I see a header bar with "BINANCE FUTURES" logo on the left
- [ ] Given the header, when I inspect the menu items, then I see: Futures, Options, Copy Trading, Data, More — all displayed but non-clickable
- [ ] Given the header, when I look at the right side, then I see icon placeholders (profile, download, notifications, language, etc.) — all non-functional, display only
- [ ] Given the header, when I resize the window to 1920px wide, then the layout matches the screenshot exactly

**UI Notes:**
- Dark header background (#1E2329 or #181A20)
- "BINANCE" in white, "FUTURES" in yellow (#FCD535)
- Menu items in gray/white text, 14px
- Right-side icons are SVG or Unicode placeholders, spaced identically to screenshot
- Header is fixed height, does not scroll

**Edge Cases:**
- None — purely decorative, no interactivity

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-004: Yellow Warning Banner

**Feature:** Risk Warning Banner (Non-functional)

**User Story:**
As a user, I want to see the yellow futures risk warning banner so that the interface matches the Binance design exactly.

**Acceptance Criteria:**
- [ ] Given Page 1 loads, when I look below the header, then I see a yellow banner with the warning text: "Futures trading comes with a high risk of losing money rapidly due to leverage…"
- [ ] Given the banner, when I try to click the close (X) button, then nothing happens (non-functional)
- [ ] Given the banner, when I inspect it, then it has a yellow background (#FEF6D8 or similar), dark text, and matches the screenshot layout

**UI Notes:**
- Full-width yellow/amber bar beneath header
- Warning icon (triangle with exclamation) on the left
- Close "X" icon on the right (visible but non-functional)
- Text is single line, 12-13px font

**Edge Cases:**
- Banner must not be dismissible — always visible
- Text should not wrap on 1920px screen

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-005: Trading Pair Display Block

**Feature:** Trading Pair Info & Coin Selector

**User Story:**
As a user, I want to see the selected trading pair (e.g., BTCUSDT) with live price data and be able to switch between coins so that I can view different markets.

**Acceptance Criteria:**
- [ ] Given a coin is selected, when I look at the trading pair block, then I see: yellow filled star icon, coin icon/logo, ticker (e.g., "BTCUSDT"), "Perp" label
- [ ] Given the page loads, when the API returns data, then I see: current price, 24h change in USDT, 24h change %, Funding Rate with countdown timer, 24h High, 24h Low
- [ ] Given I click on the ticker "BTCUSDT", when the dropdown opens, then I see a list of all active coins added from the admin panel
- [ ] Given I select a different coin from the dropdown, when the selection is made, then ALL data on the page updates to reflect the new coin (price, PNL, positions filtered, etc.)
- [ ] Given the API updates every 1-3 seconds, when a new price arrives, then the displayed price updates in real-time without full page reload

**UI Notes:**
- Star icon: always filled yellow, positioned left of the coin icon
- Coin icon: small circular logo (can use placeholder or fetch from a CDN like CoinGecko)
- Ticker: bold, 16-18px, e.g., "BTCUSDT"
- "Perp" badge: small gray label next to ticker
- Price: large font (20-24px), bold. Green if positive 24h change, red if negative
- 24h change: "-2,365.8" and "-3.02%" shown next to price in red
- Funding rate: "0.00439%" with countdown timer "01:14:16"
- 24h High / 24h Low: displayed in a row, smaller font
- Dropdown: overlay list with coin names, styled like Binance search dropdown
- Separator line below this block

**Edge Cases:**
- If no coins are configured in admin, show a "No coins available" message
- If API fails, show last known price with a stale indicator or keep last value
- Funding rate countdown should tick down every second (visual timer, can be approximate)
- Price formatting: use comma separators for thousands, appropriate decimal places (2 for BTC price, more for smaller coins)

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-006: Left Order Entry Panel — Layout & Static Elements

**Feature:** Order Entry Panel (Visual Structure)

**User Story:**
As a user, I want to see the left-side order entry panel that mirrors the Binance Futures order form so that I can place trades.

**Acceptance Criteria:**
- [ ] Given Page 1 loads, when I look at the left panel, then I see all elements from the screenshot in the correct order
- [ ] Given the panel, when I inspect the top row, then I see: "Isolated" margin mode label, "10x" leverage label, "S" button, "..." button — all non-functional, display only
- [ ] Given the panel, when I inspect the order type section, then I see: "Conditi..." truncated tab with down arrow and "..." — non-functional, display only
- [ ] Given the panel, when I look at the Available balance line, then it shows the current available balance value (functional — calculated from Balance minus margin in use)
- [ ] Given the panel, when I see the Size input field, then I can type a numeric value into it
- [ ] Given the panel, when I see the slider below Size, then it is displayed but non-functional
- [ ] Given the panel, when I see "Slippage Tolerance", then it is displayed but non-functional
- [ ] Given the panel, when I see "Reduce-Only" checkbox, then it is displayed but non-functional
- [ ] Given the panel, when I see the USDT currency indicator and arrow next to Size, then they are non-functional

**UI Notes:**
- Left panel width: ~300-320px, white/card background
- Top row: "Isolated" in a bordered box, "10x" in a bordered box, "S" icon, "…" icon — all in small gray text/borders
- Order type tabs: styled like Binance (Limit / Market / Conditi...) with underline on active
- "Available" label with balance value, a small transfer icon — balance is dynamic
- Size input: bordered text field, placeholder visible, "USDT" label and small arrow on right side
- Slider: gray track with yellow thumb position markers (0%, 25%, 50%, 75%, 100%) — display only
- All non-functional elements should look interactive but do nothing on click

**Edge Cases:**
- Size input must only accept numeric values (positive numbers, decimals allowed)
- If balance is 0, available balance shows "0.00 USDT"

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-007: Left Order Entry Panel — TP/SL Functionality

**Feature:** Take Profit / Stop Loss Toggle & Input

**User Story:**
As a user, I want to set Take Profit and Stop Loss values when placing a trade so that my position can auto-close at target prices.

**Acceptance Criteria:**
- [ ] Given the TP/SL checkbox is unchecked, when I look at the order panel, then only the checkbox label "TP/SL" is visible
- [ ] Given I check the TP/SL checkbox, when it becomes checked, then two input fields expand below: "Take Profit" and "Stop Loss"
- [ ] Given the TP/SL fields are visible, when I enter a numeric value in Take Profit, then it is stored for the trade
- [ ] Given the TP/SL fields are visible, when I enter a numeric value in Stop Loss, then it is stored for the trade
- [ ] Given I uncheck the TP/SL checkbox, when it becomes unchecked, then the TP/SL input fields collapse/hide

**UI Notes:**
- Checkbox styled like Binance (small square checkbox)
- TP/SL inputs appear with a smooth expand animation (optional but nice)
- Input fields: same style as Size input, with "USDT" label
- TP field labeled "Take Profit", SL field labeled "Stop Loss"
- Both fields accept decimal numbers

**Edge Cases:**
- For a Long position: TP must be > Entry Price, SL must be < Entry Price (validate on trade execution, not on input)
- For a Short position: TP must be < Entry Price, SL must be > Entry Price
- If user enters 0 or leaves blank, treat as "no TP/SL set"
- Negative values should not be accepted

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-008: Left Order Entry Panel — Buy/Long & Sell/Short Buttons

**Feature:** Trade Execution Buttons

**User Story:**
As a user, I want to click "Buy/Long" or "Sell/Short" to open a simulated futures position so that I can track its performance.

**Acceptance Criteria:**
- [ ] Given I have entered a Size value, when I click "Buy/Long", then a Long position is created with the current Mark Price as Entry Price
- [ ] Given I have entered a Size value, when I click "Sell/Short", then a Short position is created with the current Mark Price as Entry Price
- [ ] Given a position is created, when I check the Positions table, then the new position appears immediately
- [ ] Given a position is created, when I check localStorage, then the position data is persisted
- [ ] Given the position is created, when I look at the Balance, then it reflects the margin deducted and fees charged
- [ ] Given no Size is entered (empty or 0), when I click Buy/Long or Sell/Short, then nothing happens or an inline error is shown

**UI Notes:**
- "Buy/Long" button: full-width, green (#0ECB81) background, white text, rounded corners
- "Sell/Short" button: full-width, red (#F6465D) background, white text, rounded corners
- Buttons are stacked vertically (Buy/Long on top, Sell/Short below)
- Both buttons should have hover/active states (slightly darker shade)

**Edge Cases:**
- If available balance < required margin, show an error (insufficient balance)
- If no coin is selected, buttons should be disabled or show error
- If API price is not yet loaded, prevent trade execution
- Simultaneous rapid clicks should not create duplicate positions (debounce)
- Size must be > 0 and a valid number

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-009: Left Order Entry Panel — Calculated Fields (Liq Price, Cost, Max)

**Feature:** Real-time Calculated Order Preview

**User Story:**
As a user, I want to see the estimated Liquidation Price, Cost, and Max position size before placing a trade so that I can make informed decisions.

**Acceptance Criteria:**
- [ ] Given I have entered a Size value, when the calculation runs, then Liq Price is displayed using the formula: `Entry Price × (1 - 1/Leverage + MMR)` for Long, `Entry Price × (1 + 1/Leverage - MMR)` for Short
- [ ] Given I have entered a Size value, when the calculation runs, then Cost shows the required margin: `Position Value / Leverage`
- [ ] Given the current balance, when Max is calculated, then it shows the maximum position size affordable: `Available Balance × Leverage`
- [ ] Given the API price updates, when a new price arrives, then Liq Price, Cost, and Max recalculate automatically

**UI Notes:**
- Displayed below the Buy/Long and Sell/Short buttons
- Three rows: "Liq Price" / "Cost" / "Max" with values right-aligned
- Small font (12px), gray labels, white/dark values
- Values update in real-time as user types Size

**Edge Cases:**
- If Size field is empty, show "--" or "0.00" for all three
- If Leverage is 0 (should not happen), handle division by zero
- MMR defaults to a sensible value (e.g., 0.5%) if not set in admin

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-010: Account Balance Block

**Feature:** Account Balance & Unrealized PNL Display

**User Story:**
As a user, I want to see my account balance and total unrealized PNL so that I know my current financial state.

**Acceptance Criteria:**
- [ ] Given the page loads, when I look at the account block, then I see "Balance: X.XXXX USDT" showing the calculated balance
- [ ] Given the page loads, when I look at the account block, then I see "Unrealized PNL: X.XXXX USDT" showing the sum of PNL across all open positions
- [ ] Given the Balance formula, when calculated, then `Balance = Initial Balance + Realized PNL - Total Fees - Total Funding`
- [ ] Given the Unrealized PNL formula, when calculated, then `Unrealized PNL = Σ(PNL of each open position)`
- [ ] Given the API price updates, when new prices arrive, then Unrealized PNL recalculates in real-time
- [ ] Given a position is closed, when the Balance recalculates, then it includes the realized PNL from that position

**UI Notes:**
- Positioned above the positions table, center/right area of the screen
- "Balance" label in gray, value in dark text
- "Unrealized PNL" label in gray, value in green (positive) or red (negative)
- Values formatted to 4 decimal places for USDT
- Small font (12-13px)

**Edge Cases:**
- If no positions are open, Unrealized PNL = 0.0000 USDT
- If balance goes negative (unlikely but possible with fees), display in red
- Initial balance should be configurable (stored in localStorage, editable from admin)

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-011: Positions Table — Tab Bar

**Feature:** Positions Table Navigation Tabs

**User Story:**
As a user, I want to see tabs above the positions table (Positions, Open Orders, Order History, etc.) so that I can switch between views.

**Acceptance Criteria:**
- [ ] Given Page 1 loads, when I see the tab bar, then the following tabs are displayed: Positions(N), Open Orders(N), Order History, Trade History, Transaction History, Position History, Bots
- [ ] Given the "Positions" tab, when active, then it shows the count of open positions in parentheses, e.g., "Positions(2)"
- [ ] Given the "Open Orders" tab, when displayed, then it shows the count of active TP/SL orders in parentheses, e.g., "Open Orders(6)"
- [ ] Given I click "Position History", when the tab switches, then the page navigates to Page 2 (history.html) or the view switches to show position history
- [ ] Given tabs other than "Positions" and "Position History", when clicked, then nothing happens (non-functional, display only)
- [ ] Given the tab bar, when I see it, then there is a "Hide Other Symbols" checkbox to the right — non-functional, display only

**UI Notes:**
- Tabs styled as text links with the active tab having yellow underline or yellow text
- Count badges in parentheses next to Positions and Open Orders
- "Hide Other Symbols" checkbox with label, right-aligned
- Tab bar has a bottom border separator
- Font: 13-14px, colors: active = #1E2329, inactive = #474D57

**Edge Cases:**
- If no positions exist, show "Positions(0)"
- Open Orders count should reflect total TP + SL orders across all positions

**Priority:** P0
**Estimated Complexity:** Low

---

### TASK-012: Active Positions Table — Data Display

**Feature:** Active Positions Table

**User Story:**
As a user, I want to see all my open positions in a table with live-updating PNL so that I can monitor my trades.

**Acceptance Criteria:**
- [ ] Given I have open positions, when I look at the Positions table, then I see columns: Size, Entry Price, Mark Price, PNL(ROI%), Liq.Price, TP/SL for position, Action
- [ ] Given a Long position, when Mark Price changes, then PNL = (Mark Price - Entry Price) × Quantity, displayed in green if positive, red if negative
- [ ] Given a Short position, when Mark Price changes, then PNL = (Entry Price - Mark Price) × Quantity, displayed accordingly
- [ ] Given PNL is calculated, when ROI is shown, then ROI% = PNL / Margin × 100
- [ ] Given the table, when I look at the Size column, then it shows the position size in USDT (e.g., "75.78 USDT")
- [ ] Given the table, when I look at Entry Price, then it shows the price at which the position was opened
- [ ] Given the table, when I look at Mark Price, then it shows the current live API price
- [ ] Given the table, when I look at Liq.Price, then it shows the calculated liquidation price
- [ ] Given the table, when I look at TP/SL, then it shows the Take Profit and Stop Loss values (if set), or "--" if not
- [ ] Given the table, when I look at the Action column, then it displays action buttons/links — for visual display only (non-functional)
- [ ] Given live price updates, when prices change every 1-3 seconds, then Mark Price and PNL/ROI update in real-time

**UI Notes:**
- Table spans full width of the main content area
- Headers: gray text, 12px, uppercase or sentence case matching screenshot
- Data rows: 13px, alternating or white background
- PNL column: green text for profit, red for loss; show both absolute value and ROI%
- Size column shows position direction indicator (could be green/red dot or text)
- Each row represents one position for the currently selected coin (or all coins)
- Remove the "4 boxes with numbers" from the design as specified in TZ

**Edge Cases:**
- If no positions are open, show an empty state: "No open positions" with illustration
- If API is down, Mark Price shows last known value
- Very large PNL values should not break the table layout
- Negative ROI should show with a minus sign and red color

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-013: Position History Page — Tab Switch & Layout

**Feature:** Position History View (Page 2)

**User Story:**
As a user, I want to view my closed position history so that I can review past trades and their outcomes.

**Acceptance Criteria:**
- [ ] Given I click the "Position History" tab, when the view switches, then the positions table is replaced with the history table
- [ ] Given the history view, when I see the filter bar, then I see: 1 Day, 1 Week, 1 Month, 3 Months buttons, Time From/To inputs, Mode dropdown, Symbol dropdown, Status dropdown, Search button, Reset button
- [ ] Given the "1 Day" button is clicked, when history loads, then only positions closed within the last 24 hours are shown
- [ ] Given the "1 Week" button, when clicked, then positions closed within the last 7 days are shown
- [ ] Given the "1 Month" button, when clicked, then positions closed within the last 30 days are shown
- [ ] Given the "3 Months" button, when clicked, then positions closed within the last 90 days are shown
- [ ] Given Mode/Symbol/Status/Search/Reset, when displayed, then they are non-functional (visual only)
- [ ] Given the Time From/To fields, when displayed, then they show the selected date range (display only or functional date pickers that filter)

**UI Notes:**
- Filter bar: row of buttons (1 Day active by default with yellow highlight), date pickers, dropdowns
- Filter buttons: small pill-style or text buttons, active one highlighted in yellow
- Date fields: standard date input style
- Dropdowns: "Mode", "Symbol", "Status" — styled but non-functional
- Search button: styled but non-functional
- Reset button: styled but non-functional

**Edge Cases:**
- If no history exists for selected period, show "No closed positions" empty state
- Date range boundaries: include positions whose close time falls within range
- History should persist across page reloads (stored in localStorage)

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-014: Position History Table — Data Display

**Feature:** Closed Positions History Table

**User Story:**
As a user, I want to see detailed information about my closed positions so that I can analyze my trading performance.

**Acceptance Criteria:**
- [ ] Given the history table loads, when I see the columns, then I see: Symbol, Perp, Leverage, Margin Mode, Direction, Status, Open Time, Close Time, Realized PNL, ROI, Closed Volume, Entry Price, Avg. Close Price, Max OI
- [ ] Given a closed Long position, when displayed, then Direction shows "Long" in green
- [ ] Given a closed Short position, when displayed, then Direction shows "Short" in red
- [ ] Given all rows, when displayed, then Status shows "Closed"
- [ ] Given Realized PNL, when calculated, then it follows: `Realized PNL = PNL at Close - Fees - Funding`
- [ ] Given ROI, when displayed, then it shows the percentage return on margin
- [ ] Given a history row, when I see the share icon (3 connected circles), then clicking it opens a share modal

**UI Notes:**
- Table is wider than the active positions table — may need horizontal scroll or compact columns
- "Perp" column: always shows "Perp"
- "Leverage" column: shows "10x" (or whatever was used)
- "Margin Mode": "Cross" or "Isolated"
- Direction: "Long" (green) or "Short" (red)
- Status: "Closed" badge/text
- Times: formatted as date + time (e.g., "2026-05-18 14:30:22")
- PNL: green for profit, red for loss, with USDT suffix
- Share icon: three small circles connected by lines (standard share icon), clickable

**Edge Cases:**
- Positions with very small PNL (e.g., 0.0001 USDT) should still display correctly
- History should be sorted by Close Time descending (most recent first)
- If many positions exist, consider basic pagination or scroll

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-015: Share Modal for Position History

**Feature:** Position Share Modal

**User Story:**
As a user, I want to click the share icon on a closed position and see a modal with trade details so that I can review or screenshot the result.

**Acceptance Criteria:**
- [ ] Given a closed position row, when I click the share icon, then a modal overlay appears
- [ ] Given the modal is open, when I look at it, then it displays key trade metrics: Symbol, Direction, Entry Price, Close Price, PNL, ROI%, Leverage
- [ ] Given the modal is open, when I click outside the modal or an X button, then the modal closes
- [ ] Given the modal design, when displayed, then it matches the Binance share card style (if design provided)

**UI Notes:**
- Modal: centered overlay with dark semi-transparent backdrop
- Card-style content: white background, rounded corners, branded header
- Display metrics in a clean grid/list format
- Include the trading pair name prominently
- PNL in large font, green/red based on profit/loss
- Close button (X) in top-right corner

**Edge Cases:**
- Modal should trap focus for accessibility
- Pressing Escape should close the modal
- If data is missing for a field, show "--"

**Priority:** P1
**Estimated Complexity:** Medium

---

### TASK-016: Binance API Integration — Price Feed

**Feature:** Real-time Price Data from Binance API

**User Story:**
As a user, I want live price data for all configured coins so that position values update in real-time.

**Acceptance Criteria:**
- [ ] Given the app loads, when it connects to Binance API, then it fetches: Mark Price, 24h High, 24h Low, 24h Change, 24h Change %, Funding Rate for each configured coin
- [ ] Given the connection is active, when prices update, then data refreshes every 1-3 seconds
- [ ] Given Binance public API is used, when fetching prices, then no API key is required (public endpoints only)
- [ ] Given the API returns data, when it's processed, then prices are stored in memory and used for all calculations
- [ ] Given multiple coins are configured, when the app runs, then all coins' prices are fetched simultaneously

**UI Notes:**
- No visible UI for API connection itself
- Price updates should feel smooth (no flashing or jarring updates)
- Consider using WebSocket (`wss://fstream.binance.com`) for real-time streams or REST polling (`/fapi/v1/ticker/24hr`, `/fapi/v1/premiumIndex`)

**Edge Cases:**
- If Binance API is unreachable, retry with exponential backoff
- If API returns an error, show last known price and log the error
- CORS: Binance public API should allow CORS from browsers; if not, document the limitation
- Rate limiting: respect Binance API rate limits (1200 requests/minute for REST)
- WebSocket disconnection: auto-reconnect

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-017: Formula Engine — PNL, ROI, Margin, Fees

**Feature:** Trade Calculation Engine

**User Story:**
As a user, I want all trade metrics to be calculated automatically using the correct formulas so that my positions display accurate data.

**Acceptance Criteria:**
- [ ] Given a position, when Position Value is needed, then `Position Value = Quantity × Entry Price`
- [ ] Given a position, when Margin is needed, then `Margin = Position Value / Leverage`
- [ ] Given a Long position, when PNL is calculated, then `PNL = (Mark Price - Entry Price) × Quantity`
- [ ] Given a Short position, when PNL is calculated, then `PNL = (Entry Price - Mark Price) × Quantity`
- [ ] Given a position, when ROI is calculated, then `ROI% = (PNL / Margin) × 100`
- [ ] Given a position is closed, when Realized PNL is calculated, then `Realized PNL = PNL at Close - Fees - Funding`
- [ ] Given a trade, when Open Fee is calculated, then `Open Fee = Position Value × Fee Rate`
- [ ] Given a trade, when Close Fee is calculated, then `Close Fee = Close Position Value × Fee Rate`
- [ ] Given a position, when Funding is calculated, then `Funding = Position Value × Funding Rate`
- [ ] Given the account, when Balance is calculated, then `Balance = Initial Balance + Realized PNL - Fees - Funding`
- [ ] Given all open positions, when Unrealized PNL is calculated, then `Unrealized PNL = Σ(PNL of each open position)`
- [ ] Given a Long position, when Liq Price is calculated, then `Liq Price = Entry Price × (1 - 1/Leverage + MMR)`
- [ ] Given a Short position, when Liq Price is calculated, then `Liq Price = Entry Price × (1 + 1/Leverage - MMR)`

**UI Notes:**
- No direct UI — this is a JS calculation module used by other components
- All calculations should run on every price tick (1-3 seconds)
- Results should be formatted to appropriate decimal places before display

**Edge Cases:**
- Division by zero when Leverage = 0 (should never happen, but guard)
- Very small Quantity values (micro-positions)
- Funding Rate can be negative (position earns funding instead of paying)
- Fee Rate should default to 0.04% (Binance standard taker fee) if not configured
- MMR should default to 0.5% if not set in admin

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-018: Trade Execution — Open Position

**Feature:** Opening a New Trade Position

**User Story:**
As a user, I want to open a Long or Short position by entering a size and clicking the trade button so that a simulated position is tracked.

**Acceptance Criteria:**
- [ ] Given I enter a valid Size and click "Buy/Long", when the trade executes, then a new position is created with: Symbol (current coin), Direction: Long, Entry Price: current Mark Price from API, Quantity: Size / Entry Price, Leverage: 10 (default), Margin Mode: Isolated, TP/SL values (if set), Open Time: current timestamp, Status: Open
- [ ] Given I click "Sell/Short", when the trade executes, then the same as above but Direction: Short
- [ ] Given the position is created, when it's stored, then it persists in localStorage
- [ ] Given the position is created, when fees are calculated, then Open Fee is deducted: `Position Value × Fee Rate`
- [ ] Given the position is created, when balance updates, then available balance decreases by the required margin + fees
- [ ] Given the trade completes, when the positions table updates, then the new position appears at the top

**UI Notes:**
- Brief visual confirmation (button press state) when trade is placed
- The Size input clears after successful trade execution
- The TP/SL checkbox resets after trade execution (or stays — TBD by PM)

**Edge Cases:**
- If Size > available balance × leverage, reject with error
- If Size is 0, empty, or non-numeric, do nothing
- If the current price is unavailable (API down), prevent trade
- If TP = SL or TP/SL = Entry Price, warn or prevent
- Handle rapid consecutive clicks (debounce, prevent duplicate positions)

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-019: Trade Execution — Close Position (TP/SL Trigger)

**Feature:** Automatic Position Closing via TP/SL

**User Story:**
As a user, I want my positions to automatically close when the Mark Price hits my Take Profit or Stop Loss level so that gains are locked in or losses are limited.

**Acceptance Criteria:**
- [ ] Given a Long position with TP set, when Mark Price >= TP, then the position closes automatically at Mark Price
- [ ] Given a Long position with SL set, when Mark Price <= SL, then the position closes automatically at Mark Price
- [ ] Given a Short position with TP set, when Mark Price <= TP, then the position closes automatically at Mark Price
- [ ] Given a Short position with SL set, when Mark Price >= SL, then the position closes automatically at Mark Price
- [ ] Given a position is closed, when the close executes, then: Close Price = current Mark Price, Close Time = current timestamp, Realized PNL is calculated, Close Fee is deducted, Status changes to "Closed"
- [ ] Given a position is closed, when the UI updates, then the position disappears from the Active Positions table
- [ ] Given a position is closed, when the history updates, then the position appears in the Position History table
- [ ] Given a position is closed, when Balance recalculates, then it includes the Realized PNL, and the margin is released

**UI Notes:**
- Closing happens silently in the background (no modal or confirmation)
- The positions table row simply disappears
- The history table gains a new row
- Balance updates immediately

**Edge Cases:**
- Price gaps: if price jumps past TP/SL in a single tick, still close at the current Mark Price (not at TP/SL level — simulating slippage)
- If both TP and SL could theoretically trigger in the same tick (extremely unlikely), TP takes priority
- Position without TP/SL should remain open indefinitely until manually closed (if manual close is ever added) or admin removes it
- Check TP/SL on every price update tick

**Priority:** P0
**Estimated Complexity:** High

---

### TASK-020: Bottom Ticker Bar

**Feature:** Bottom Price Ticker Strip

**User Story:**
As a user, I want to see a scrolling bottom ticker bar showing prices for multiple coins so that I have market overview at a glance.

**Acceptance Criteria:**
- [ ] Given the page loads, when I look at the bottom of the screen, then I see a horizontal bar with coin prices
- [ ] Given multiple coins are configured, when the ticker displays, then each coin shows: symbol, price, and 24h change %
- [ ] Given the ticker bar, when prices update, then the displayed values update in real-time

**UI Notes:**
- Fixed to the bottom of the page
- Dark background matching Binance ticker bar
- Scrolling or static row of coin tickers
- Each item: "BTCUSDT 75,770.1 -3.02%" with appropriate coloring (green/red)
- Small font (11-12px)
- Ticker items spaced evenly across the bar width

**Edge Cases:**
- If only one coin is configured, show just that one
- If no coins are configured, hide the ticker bar or show empty
- Overflow: if too many coins, allow horizontal scroll or marquee-style scroll

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-021: Admin Panel — Page Layout

**Feature:** Admin Panel Page Structure

**User Story:**
As an admin, I want a separate admin page where I can manage the platform settings so that I control what data the trading interface displays.

**Acceptance Criteria:**
- [ ] Given I navigate to `admin.html`, when the page loads, then I see a clean admin interface with navigation
- [ ] Given the admin page, when I look at the layout, then I see sections for: Coin Management, Platform Settings
- [ ] Given the admin page, when I make changes, then they are saved to localStorage and reflected on the main trading pages

**UI Notes:**
- Simple, clean admin layout — does NOT need to look like Binance
- Can use a basic sidebar + content area layout
- White background, standard form elements
- Navigation: "Coins", "Settings" links in sidebar

**Edge Cases:**
- If localStorage is full, show an error
- Admin page should work independently (can be opened in a separate tab)

**Priority:** P0
**Estimated Complexity:** Low

---

### TASK-022: Admin Panel — Coin Management (CRUD)

**Feature:** Add/Edit/Delete Trading Pairs

**User Story:**
As an admin, I want to add, edit, and remove trading pairs (coins) so that the trading interface shows the correct markets.

**Acceptance Criteria:**
- [ ] Given the Coin Management section, when I click "Add Coin", then a form appears with fields: Symbol (e.g., BTCUSDT), Base Asset (e.g., BTC), Quote Asset (e.g., USDT), Display Name, API Source
- [ ] Given I fill in the form and click Save, when the coin is saved, then it appears in the coins list and is available on the trading page
- [ ] Given an existing coin, when I click Edit, then the form pre-fills with the coin's current data
- [ ] Given an existing coin, when I click Delete, then the coin is removed after confirmation
- [ ] Given the coins list, when I view it, then I see a table with all configured coins and their details
- [ ] Given the API Source field, when set, then it determines which Binance API symbol to query (usually same as Symbol)

**UI Notes:**
- Table: columns for Symbol, Base Asset, Quote Asset, Display Name, API Source, Actions (Edit/Delete)
- Add button: prominent, top-right of the table
- Form: can be inline or modal
- Delete confirmation: simple browser confirm() or styled modal

**Edge Cases:**
- Duplicate symbols should be prevented
- Symbol format validation: must be uppercase, no spaces
- Deleting a coin that has open positions — warn the admin
- At least one coin should be configured for the trading page to function

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-023: Admin Panel — Platform Settings

**Feature:** Platform Configuration Settings

**User Story:**
As an admin, I want to configure platform-wide settings (initial balance, fee rate, leverage, MMR) so that the trading simulation uses the correct parameters.

**Acceptance Criteria:**
- [ ] Given the Settings section, when I see it, then there are fields for: Initial Balance (USDT), Fee Rate (%), Default Leverage, Maintenance Margin Rate (MMR %)
- [ ] Given I change the Initial Balance, when saved, then the trading page uses this as the starting balance for new sessions
- [ ] Given I change the Fee Rate, when saved, then all fee calculations use the new rate
- [ ] Given I change the Default Leverage, when saved, then new trades use this leverage value
- [ ] Given I change the MMR, when saved, then liquidation price calculations use the new rate
- [ ] Given settings are saved, when the trading page loads, then it reads these values from localStorage

**UI Notes:**
- Simple form with labeled inputs
- Save button at the bottom
- Show current values as placeholders or pre-filled
- Success message on save ("Settings saved successfully")

**Edge Cases:**
- Fee Rate must be between 0 and 100 (typically 0.01–0.10%)
- Leverage must be a positive integer (1, 2, 5, 10, 20, etc.)
- MMR must be between 0 and 50%
- Initial Balance must be > 0
- Invalid values should show validation errors
- A "Reset Balance" button to restart trading simulation with fresh balance

**Priority:** P0
**Estimated Complexity:** Low

---

### TASK-024: Admin Panel — Reset / Clear Data

**Feature:** Data Reset Functionality

**User Story:**
As an admin, I want to reset all trading data (positions, history, balance) so that I can start a fresh simulation.

**Acceptance Criteria:**
- [ ] Given the admin panel, when I click "Reset All Data", then a confirmation dialog appears
- [ ] Given I confirm the reset, when it executes, then all positions (open and closed) are deleted, balance resets to Initial Balance, and the trading page shows a clean state
- [ ] Given the reset, when I navigate to the trading page, then Positions table is empty, History is empty, Balance shows the Initial Balance

**UI Notes:**
- Red "Reset All Data" button (danger action)
- Confirmation dialog: "Are you sure? This will delete all positions and reset the balance."

**Edge Cases:**
- Ensure the reset does not delete coin configurations or platform settings
- If reset is accidentally triggered mid-trade, data is still cleanly wiped

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-025: localStorage Data Architecture

**Feature:** Client-side Data Persistence Layer

**User Story:**
As a developer, I want a well-structured localStorage schema so that all app data persists reliably across page reloads.

**Acceptance Criteria:**
- [ ] Given the app initializes, when localStorage is checked, then the following keys exist: `bf_coins` (array of coin configs), `bf_positions` (array of open positions), `bf_history` (array of closed positions), `bf_settings` (platform settings object), `bf_balance` (current balance state)
- [ ] Given data is written, when the page is refreshed, then all data is intact
- [ ] Given data is read, when it's parsed from localStorage, then invalid JSON is handled gracefully
- [ ] Given multiple tabs are open, when one tab updates data, then other tabs should pick up changes on next read cycle (not required to be real-time across tabs)

**UI Notes:**
- No UI — this is an internal data layer
- Use a consistent prefix (`bf_` for "Binance Futures") to avoid conflicts

**Edge Cases:**
- localStorage 5MB limit: position history could grow large over time; implement cleanup for very old entries
- If localStorage is disabled (private browsing in some cases), show a user-friendly error
- Data migration: if schema changes in future, handle version mismatches

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-026: Coin Dropdown / Selector

**Feature:** Trading Pair Selector Dropdown

**User Story:**
As a user, I want to click on the trading pair ticker (e.g., BTCUSDT) and select a different coin from a dropdown so that I can switch markets.

**Acceptance Criteria:**
- [ ] Given I click on the trading pair name, when the dropdown opens, then I see a list of all coins configured in the admin panel
- [ ] Given the dropdown is open, when I select a different coin, then the entire page updates: trading pair display, price feed, account calculations, positions table filters to that coin
- [ ] Given the dropdown is open, when I click outside it, then it closes
- [ ] Given the dropdown, when I look at each item, then I see the coin symbol and optionally the coin icon

**UI Notes:**
- Dropdown appears below the trading pair area
- Styled like Binance's pair selector: white background, border, shadow
- Each item: coin icon + symbol name (e.g., "BTCUSDT Perp")
- Hover state on items (light gray background)
- Active/selected item may have a checkmark or highlight

**Edge Cases:**
- If only one coin is configured, dropdown still shows but with one item
- Switching coins while having open positions for another coin: positions should still exist but may be hidden if "Hide Other Symbols" is checked (visual only per TZ, but worth noting)
- If coin list is long, consider a scrollable dropdown with max-height

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-027: Funding Rate Countdown Timer

**Feature:** Funding Rate Timer Display

**User Story:**
As a user, I want to see a countdown timer next to the funding rate showing time until the next funding event so that I know when funding is applied.

**Acceptance Criteria:**
- [ ] Given the trading pair block, when I look at the funding rate, then I see the rate percentage and a countdown in HH:MM:SS format
- [ ] Given the timer is running, when a second passes, then the countdown decrements by one second
- [ ] Given the countdown reaches 00:00:00, when it resets, then it starts again from the next 8-hour interval (Binance funding occurs at 00:00, 08:00, 16:00 UTC)

**UI Notes:**
- Displayed inline next to the funding rate value
- Format: "0.00439% / 01:14:16"
- Small font, same style as other trading pair metrics
- Timer ticks every second

**Edge Cases:**
- Timer should calculate based on real UTC time and next funding interval
- If page loads close to a funding event, timer shows small remaining time
- Timer is purely visual — no actual funding settlement logic needed on the frontend (funding is calculated at position close)

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-028: Price Formatting & Number Display

**Feature:** Consistent Number Formatting Across App

**User Story:**
As a user, I want all prices and numbers to be formatted consistently (comma separators, appropriate decimals) so that the interface looks professional and matches Binance.

**Acceptance Criteria:**
- [ ] Given a BTC price (e.g., 75770.1), when displayed, then it shows "75,770.1" with comma thousands separator
- [ ] Given a USDT balance (e.g., 13.0054), when displayed, then it shows up to 4 decimal places
- [ ] Given a percentage (e.g., -3.02%), when displayed, then it shows with the % suffix and 2 decimal places
- [ ] Given a PNL value, when displayed, then positive values have no prefix or "+" and green color, negative values have "-" and red color
- [ ] Given a size value, when displayed, then it shows appropriate precision based on the asset

**UI Notes:**
- Follow Binance's number formatting conventions
- Use locale-aware formatting (or consistent custom formatter)
- Decimal precision: prices follow the asset's standard (BTC = 1-2 decimals, smaller coins = 3-4), PNL = 4 decimals, percentages = 2 decimals

**Edge Cases:**
- Very large numbers (billions) should still format correctly
- Very small numbers (0.00001) should not show as "0.00"
- Negative zero (-0.00) should display as "0.00"

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-029: Responsive Layout for 1920px Target

**Feature:** Fixed-Width Layout Optimized for Target Display

**User Story:**
As a user viewing on a 24" Dell monitor at 1920px width in Chrome, I want the layout to match the Binance screenshot pixel-perfectly so that it looks authentic.

**Acceptance Criteria:**
- [ ] Given the browser is at 1920×1080 resolution, when the page loads, then the layout matches the screenshot exactly
- [ ] Given the layout, when I measure the panels, then: left order panel ~300-320px, main content fills remaining space, proper spacing between elements
- [ ] Given the layout, when viewed at other resolutions (smaller), then the interface remains usable (no broken layouts) — but pixel-perfection is only required at 1920px

**UI Notes:**
- Primary target: 1920×1080, Chrome on macOS/Windows
- Use a fixed or max-width layout centered on the page, or full-width matching Binance
- Consider the header, warning bar, main content area (3-column or 2-column), and bottom ticker as distinct horizontal layers
- Left panel is fixed width, center content is flexible

**Edge Cases:**
- Zoom levels (100% default assumed, but 90% or 110% should not break layout)
- Scrollbar width might vary between OS — account for this
- If window is narrower than 1920px, content should not overlap (graceful degradation)

**Priority:** P1
**Estimated Complexity:** Medium

---

### TASK-030: Positions Table — Empty State & Position Count

**Feature:** Empty State and Dynamic Counts

**User Story:**
As a user, I want to see a meaningful empty state when no positions are open and accurate counts in the tab badges so that I always understand the current state.

**Acceptance Criteria:**
- [ ] Given no open positions exist, when I view the Positions tab, then I see an empty state illustration or message: "No open positions"
- [ ] Given 3 positions are open, when I see the Positions tab, then it reads "Positions(3)"
- [ ] Given 2 positions have TP/SL set (totaling 4 orders), when I see Open Orders tab, then it reads "Open Orders(4)"
- [ ] Given a position is opened or closed, when the count updates, then the tab badge number changes in real-time

**UI Notes:**
- Empty state: centered text, possibly with a subtle icon (like Binance's empty table illustration)
- Tab badge counts: in parentheses, same font size as tab text
- Counts update immediately after trade open/close

**Edge Cases:**
- Count should never show negative numbers
- If positions exist for other symbols (not currently selected), still count them in the total

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-031: Page Navigation Between Page 1 and Page 2

**Feature:** Seamless Navigation Between Active Positions and Position History

**User Story:**
As a user, I want to switch between Active Positions and Position History either by tab click or page navigation so that I can move between views smoothly.

**Acceptance Criteria:**
- [ ] Given I am on Page 1 (index.html), when I click the "Position History" tab, then I see the history view (either by navigating to history.html or by showing/hiding sections in-page)
- [ ] Given I am on Page 2 (history.html), when I click the "Positions" tab, then I return to the active positions view
- [ ] Given the navigation, when switching pages, then the header, left panel, trading pair block, and account block remain consistent (same data, same selected coin)

**UI Notes:**
- Preferred approach: single-page with tab switching (less jarring) OR two separate HTML files with shared state in localStorage
- If using two HTML files, ensure the shared state (selected coin, balance, etc.) is preserved
- Active tab should be highlighted with yellow underline

**Edge Cases:**
- If using separate HTML files, data written in one page should be immediately readable in the other
- Browser back/forward buttons should work intuitively

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-032: Real-time Position Monitoring Loop

**Feature:** Background Price Check & Position Update Engine

**User Story:**
As a user, I want the system to continuously check prices and update position metrics so that I see live-updating data without manual refresh.

**Acceptance Criteria:**
- [ ] Given positions are open, when the price update interval fires (every 1-3 seconds), then all position metrics (Mark Price, PNL, ROI, Unrealized PNL, Balance) recalculate
- [ ] Given TP/SL is set on a position, when the monitoring loop runs, then it checks if TP or SL conditions are met
- [ ] Given a TP/SL condition is met, when detected, then the position is automatically closed (TASK-019)
- [ ] Given the monitoring loop, when the tab is in the background, then it continues to run (or resumes when the tab becomes active)

**UI Notes:**
- No visible UI for the monitoring loop itself
- Updates should be smooth: only change DOM elements whose values actually changed (avoid re-rendering the entire table on every tick)
- Consider using requestAnimationFrame or setInterval at 1-3 second intervals

**Edge Cases:**
- If many positions are open (10+), ensure the calculation loop completes within the tick interval
- If the browser tab is inactive, setInterval may be throttled — handle this gracefully
- On page load, immediately run one calculation cycle before waiting for the first interval

**Priority:** P0
**Estimated Complexity:** Medium

---

### TASK-033: Trade Direction Indicator in Positions Table

**Feature:** Visual Long/Short Indicator

**User Story:**
As a user, I want to see clearly whether each position is Long or Short in the positions table so that I can quickly identify my directional exposure.

**Acceptance Criteria:**
- [ ] Given a Long position, when displayed in the table, then the Size value or a label shows "Long" or is colored green
- [ ] Given a Short position, when displayed in the table, then the Size value or a label shows "Short" or is colored red
- [ ] Given the position row, when I glance at it, then the direction is immediately obvious from color and/or text

**UI Notes:**
- Match Binance's approach: the Size column shows the value in green for Long, red for Short
- Alternatively, a small "Long"/"Short" label or colored dot next to the size
- Follow the exact design from the screenshot

**Edge Cases:**
- None significant — purely visual

**Priority:** P1
**Estimated Complexity:** Low

---

### TASK-034: Coin Icons / Logos

**Feature:** Cryptocurrency Icon Display

**User Story:**
As a user, I want to see the correct logo/icon for each trading pair so that the interface feels authentic.

**Acceptance Criteria:**
- [ ] Given a coin is displayed (e.g., BTCUSDT), when I look at the trading pair block, then I see the Bitcoin logo icon next to the ticker
- [ ] Given the bottom ticker bar, when coins are displayed, then each has its respective icon
- [ ] Given icons are loaded, when displayed, then they are crisp and appropriately sized (16-24px)

**UI Notes:**
- Use a free crypto icon CDN (e.g., CoinGecko, CryptoIcons, or inline SVGs for major coins)
- Fallback: show a generic coin placeholder if icon fails to load
- Icons should be circular, matching Binance's style

**Edge Cases:**
- If the icon CDN is down, show a text-based fallback (first letter of the base asset in a colored circle)
- Obscure coins may not have icons available — handle gracefully

**Priority:** P2
**Estimated Complexity:** Low

---

### TASK-035: Error Handling & User Feedback

**Feature:** Global Error Handling and Notifications

**User Story:**
As a user, I want to see clear error messages when something goes wrong (API failure, invalid input, insufficient balance) so that I understand what happened.

**Acceptance Criteria:**
- [ ] Given the API fails, when it cannot fetch prices, then a small non-intrusive notification appears (e.g., "Price feed disconnected. Retrying...")
- [ ] Given I try to open a trade with insufficient balance, when rejected, then an inline error appears near the Size field: "Insufficient balance"
- [ ] Given I enter invalid input in the Size field, when I try to trade, then a validation error is shown
- [ ] Given any error occurs, when it resolves, then the error notification disappears

**UI Notes:**
- Toast-style notifications for API errors (top-right corner, auto-dismiss after 5 seconds)
- Inline validation errors in red text below the relevant input field
- Do not use browser alert() — use styled in-page notifications

**Edge Cases:**
- Multiple errors at once should stack (not overlap)
- Errors should not block the entire UI
- Transient API errors should auto-clear when the connection is restored

**Priority:** P1
**Estimated Complexity:** Medium

---

### TASK-036: Page Load & Initialization Sequence

**Feature:** App Bootstrap and Data Loading

**User Story:**
As a user, I want the page to load quickly with all data ready so that I can start using the platform immediately.

**Acceptance Criteria:**
- [ ] Given the page loads, when initialization runs, then: (1) load settings from localStorage, (2) load coin configs, (3) start API price feeds, (4) load existing positions, (5) run initial calculations, (6) render all UI components
- [ ] Given first-time load (no localStorage), when the page initializes, then default settings are created and a prompt or admin redirect may be shown
- [ ] Given the page loads, when all data is ready, then the UI is fully interactive within 2 seconds

**UI Notes:**
- Consider a brief loading state or spinner while API connects (optional, only if noticeable delay)
- All UI should render structure immediately, then populate with data

**Edge Cases:**
- If no coins are configured, show a message directing user to the admin panel
- If localStorage has legacy/corrupt data, handle migration or reset
- If the page loads offline, show cached data with an offline indicator

**Priority:** P1
**Estimated Complexity:** Medium

---

### TASK-037: Multiple Positions Per Coin

**Feature:** Support Multiple Simultaneous Open Positions

**User Story:**
As a user, I want to open multiple positions (even for the same coin) so that I can have various Long and Short positions simultaneously.

**Acceptance Criteria:**
- [ ] Given I already have a Long BTC position, when I open another Long BTC position, then both appear in the positions table as separate rows
- [ ] Given I have positions for multiple coins, when I view the positions table, then all positions are shown (or filtered by current coin selection)
- [ ] Given multiple positions, when Unrealized PNL is calculated, then it sums PNL across ALL open positions
- [ ] Given multiple positions, when each has different TP/SL, then they are tracked independently

**UI Notes:**
- Each position is a separate row in the table
- No position merging/netting — each trade creates an independent position

**Edge Cases:**
- Having both a Long and Short position for the same coin simultaneously
- 10+ positions open at once — table should handle without performance issues
- Positions for coins not currently selected should still exist and be monitored for TP/SL

**Priority:** P0
**Estimated Complexity:** Medium

---

---

## Summary: Task Priority Matrix

### P0 — Must Have (Core Functionality)

| Task | Feature | Complexity |
|------|---------|-----------|
| TASK-001 | Project Structure & Scaffolding | Low |
| TASK-002 | Global CSS Theme & Typography | Low |
| TASK-005 | Trading Pair Display & Coin Selector | High |
| TASK-006 | Left Order Panel — Layout & Static Elements | Medium |
| TASK-007 | Left Order Panel — TP/SL Functionality | Medium |
| TASK-008 | Left Order Panel — Buy/Long & Sell/Short Buttons | High |
| TASK-009 | Left Order Panel — Calculated Fields | Medium |
| TASK-010 | Account Balance Block | Medium |
| TASK-011 | Positions Table Tab Bar | Low |
| TASK-012 | Active Positions Table — Data Display | High |
| TASK-013 | Position History Page — Tab Switch & Layout | Medium |
| TASK-014 | Position History Table — Data Display | Medium |
| TASK-016 | Binance API Integration — Price Feed | High |
| TASK-017 | Formula Engine — PNL, ROI, Margin, Fees | High |
| TASK-018 | Trade Execution — Open Position | High |
| TASK-019 | Trade Execution — Close Position (TP/SL Trigger) | High |
| TASK-021 | Admin Panel — Page Layout | Low |
| TASK-022 | Admin Panel — Coin Management (CRUD) | Medium |
| TASK-023 | Admin Panel — Platform Settings | Low |
| TASK-025 | localStorage Data Architecture | Medium |
| TASK-026 | Coin Dropdown / Selector | Medium |
| TASK-031 | Page Navigation (Page 1 ↔ Page 2) | Medium |
| TASK-032 | Real-time Position Monitoring Loop | Medium |
| TASK-037 | Multiple Positions Per Coin | Medium |

### P1 — Should Have (Polish & UX)

| Task | Feature | Complexity |
|------|---------|-----------|
| TASK-003 | Header Navigation Bar | Low |
| TASK-004 | Yellow Warning Banner | Low |
| TASK-015 | Share Modal for Position History | Medium |
| TASK-020 | Bottom Ticker Bar | Low |
| TASK-024 | Admin Panel — Reset/Clear Data | Low |
| TASK-027 | Funding Rate Countdown Timer | Low |
| TASK-028 | Price Formatting & Number Display | Low |
| TASK-029 | Responsive Layout for 1920px | Medium |
| TASK-030 | Empty States & Position Counts | Low |
| TASK-033 | Trade Direction Indicator | Low |
| TASK-035 | Error Handling & User Feedback | Medium |
| TASK-036 | Page Load & Initialization Sequence | Medium |

### P2 — Nice to Have

| Task | Feature | Complexity |
|------|---------|-----------|
| TASK-034 | Coin Icons / Logos | Low |

---

## Suggested Implementation Order (Sprints)

### Sprint 1: Foundation (Design & Layout)
- TASK-001: Project scaffolding
- TASK-002: CSS theme
- TASK-003: Header
- TASK-004: Warning banner
- TASK-006: Left panel layout (static)
- TASK-029: 1920px layout structure

### Sprint 2: Core Engine & Admin
- TASK-025: localStorage architecture
- TASK-021: Admin panel layout
- TASK-022: Coin management CRUD
- TASK-023: Platform settings
- TASK-016: Binance API integration
- TASK-017: Formula engine

### Sprint 3: Page 1 — Active Trading
- TASK-005: Trading pair display
- TASK-026: Coin selector dropdown
- TASK-007: TP/SL functionality
- TASK-008: Buy/Long & Sell/Short buttons
- TASK-009: Calculated fields (Liq, Cost, Max)
- TASK-010: Account balance block
- TASK-018: Trade execution — open
- TASK-011: Positions table tabs
- TASK-012: Active positions table
- TASK-032: Real-time monitoring loop
- TASK-019: Trade execution — close (TP/SL)
- TASK-037: Multiple positions

### Sprint 4: Page 2 — History & Polish
- TASK-013: Position history layout
- TASK-014: History table
- TASK-015: Share modal
- TASK-031: Page navigation
- TASK-020: Bottom ticker bar
- TASK-027: Funding countdown timer
- TASK-028: Number formatting
- TASK-030: Empty states
- TASK-033: Direction indicators
- TASK-034: Coin icons
- TASK-035: Error handling
- TASK-036: Page load sequence
- TASK-024: Admin reset data

---

## Open Questions / Flags for PM Review

1. **Manual Close:** The TZ describes closing via TP/SL only. Should there be a manual "Close Position" button in the Action column? Currently marked as non-functional per TZ — **recommend adding manual close as a future enhancement**.

2. **Leverage Selection:** The TZ says leverage (10x) is display-only. Should the admin be able to set different leverage per coin, or is it global? **Assumption: global default in settings, always 10x unless changed in admin.**

3. **Cross vs. Isolated Margin:** The TZ says "Isolated" is display-only. Should the UI always show "Isolated"? **Assumption: yes, always "Isolated" in the display.**

4. **TP/SL Reset After Trade:** After a position is opened, should the TP/SL checkbox and inputs reset to empty, or remain for the next trade? **Needs PM clarification.**

5. **Position Table Filtering:** When a coin is selected, should the positions table show only positions for that coin, or all positions? The TZ mentions "Hide Other Symbols" checkbox (non-functional). **Assumption: show all positions regardless of selected coin; the Hide Other Symbols checkbox is visual only.**

6. **Funding Settlement:** The TZ includes funding in the formulas but does not describe a funding settlement event. **Assumption: funding is calculated at position close time using the last known funding rate × position hold time (simplified).**

7. **Time From / Time To in History:** Are these functional date pickers or purely visual? The TZ says the period buttons (1 Day, etc.) filter history, but date pickers are ambiguous. **Assumption: period buttons are functional, Time From/To display the range but are not editable.**

8. **Multiple Users:** Is this a single-user demo, or should it support switching between user profiles? **Assumption: single-user demo, one localStorage state.**

---

*End of Business Requirements Document*
