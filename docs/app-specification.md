# App Specification

This document defines the settled product behavior, data model, interface, and regression guardrails for the inventory and sales app.

## 1. Data model

The application stores money as integer smallest currency units. Dates are ISO date or date-time strings. SQLite stores enum values as text.

### Enums

| Enum | Values |
|---|---|
| `OrderStatus` | `ongoing`, `closed` |
| `BundleStatus` | `pending`, `arrived`, `lost`, `refunded`, `replaced` |
| `ItemStatus` | `in_stock`, `sold`, `damaged`, `returned` |
| `SaleStatus` | `active`, `returned` |
| `LossType` | `full_bundle`, `partial` |
| `RecoveryStatus` | `none`, `pending_claim`, `refunded`, `replaced` |

### Order (`orders`)

| Field | Type | Required/default | Description |
|---|---|---|---|
| `orderId` | Integer | Required, auto-increment primary key | Order identifier. |
| `supplierOrCountry` | Text | Required | Supplier or source-country label. |
| `orderDate` | Text | Required | Purchasing event date. |
| `transportationFee` | Integer | Required, default `0` | Order-level transportation expense. It never changes item cost. |
| `expectedBundleCount` | Integer | Required | Planning count for expected bundles. |
| `status` | `OrderStatus` | Required, default `ongoing` | Order lifecycle state. |

### Bundle (`bundles`)

| Field | Type | Required/default | Description |
|---|---|---|---|
| `bundleId` | Integer | Required, auto-increment primary key | Purchase-unit identifier. |
| `orderId` | Integer | Required foreign key to `orders.orderId` | Parent order. Deletes are restricted. |
| `type` | Text | Required | Product/clothing type. |
| `designName` | Text | Required | Design name or identifier. |
| `itemsOrdered` | Integer | Required | Physical units ordered; fixed after creation. |
| `costPerItem` | Integer | Required | Per-unit acquisition cost. |
| `bundleTotalCost` | Integer | Required | Displayed total: `itemsOrdered × costPerItem`. |
| `status` | `BundleStatus` | Required, default `pending` | Bundle lifecycle state. |
| `itemsReceived` | Integer | Required, default `0` | Units received. |
| `arrivalDate` | Text | Nullable | Arrival or full-loss event date. |

### Inventory item (`inventory_items`)

| Field | Type | Required/default | Description |
|---|---|---|---|
| `itemId` | Integer | Required, auto-increment primary key | Individual selling-unit identifier. |
| `bundleId` | Integer | Required foreign key to `bundles.bundleId` | Parent bundle. Deletes are restricted. |
| `variant` | Text | Nullable | Optional item variant. A shared arrival variant is copied to generated items and can later be edited per item. |
| `costPrice` | Integer | Required | Immutable direct copy of `Bundle.costPerItem`. It never includes transportation or transit-loss adjustments. |
| `markedPrice` | Integer | Required | Mutable pricing guidance. |
| `listedPrice` | Integer | Required | Mutable customer-facing listed price. |
| `targetPrice` | Integer | Required | Mutable target selling price. |
| `floorPrice` | Integer | Required | Mutable minimum permitted selling price. |
| `maxDiscountPercent` | Integer | Required, default `0` | Discount warning threshold. |
| `status` | `ItemStatus` | Required, default `in_stock` | Physical item state. |

### Sale (`sales`)

| Field | Type | Required/default | Description |
|---|---|---|---|
| `saleId` | Integer | Required, auto-increment primary key | Sale-event identifier. |
| `itemId` | Integer | Required foreign key to `inventory_items.itemId` | Item sold in the event. Deletes are restricted. |
| `saleDate` | Text | Required | Sale event date. |
| `sellingPrice` | Integer | Required | Actual sale price. |
| `profit` | Nullable Integer | Nullable for returned sales | Active sale profit: `sellingPrice - costPrice`; set to null on return. |
| `originalListedPrice` | Integer | Required | Listed price captured when the sale was recorded. |
| `status` | `SaleStatus` | Required, default `active` | Sale audit state. |
| `returnedDate` | Text | Nullable | Date the item was returned. |

### Loss entry (`loss_entries`)

| Field | Type | Required/default | Description |
|---|---|---|---|
| `lossId` | Integer | Required, auto-increment primary key | Loss-event identifier. |
| `bundleId` | Integer | Required foreign key to `bundles.bundleId` | Bundle that incurred the loss. |
| `lossType` | `LossType` | Required | `full_bundle` or `partial`. |
| `itemsLost` | Integer | Required | Units lost. |
| `lossValue` | Integer | Required | Historical loss value, fixed at creation. |
| `lossDate` | Text | Required | Date the loss is attributed to. |
| `recoveryStatus` | `RecoveryStatus` | Required, default `none` | Recovery lifecycle/outcome. |
| `recoveryValue` | Nullable Integer | Optional | Value recovered later. |
| `recoveryDate` | Nullable Text | Optional | Date the recovery is attributed to. |
| `replacementBundleId` | Nullable Integer foreign key to `bundles.bundleId` | Optional | Distinct pending replacement bundle created for a replacement recovery. |

### Relations

- One order has many bundles; every bundle belongs to one order.
- One bundle has many inventory items; every item belongs to one bundle.
- One bundle has many loss entries; every loss entry belongs to one bundle.
- One inventory item can have many sale rows; every sale belongs to one item.
- A loss entry can point to one distinct replacement bundle.
- No separate supplier, customer, category, payment, or stock-movement model is part of the core schema.

## 2. Backend behavior

All API errors use a status code and a human-readable `message`.

### Order service

- Creates an `ongoing` order after validating supplier/country, date, non-negative transportation fee, and positive integer expected bundle count.
- Lists orders newest-first by order date and identifier.
- Retrieves one order and returns not found when it does not exist.
- Updates supplier/country, order date, transportation fee, and expected bundle count. Updates never change lifecycle status.
- Closes an order explicitly. Closing is allowed while bundles remain pending and does not change bundle statuses.
- There is no reopening operation.
- Expected bundle count is guidance, not a maximum. Bundles can be added while the order is open; closing makes Add bundle unavailable in the UI.

### Bundle service

- Creates a `pending` bundle under an existing order with non-empty type/design, positive integer items ordered, non-negative cost per item, and computed bundle total.
- Lists bundles with parent order context.
- Bundle creation fixes its ordered quantity and acquisition cost for the later arrival and loss calculations.
- Arrival is transactional and only applies to a pending bundle. It validates that received units do not exceed ordered units, records the arrival date, creates exactly the received number of inventory items, and copies one trimmed optional variant to every generated item.
- Each generated item receives `costPrice` directly from `costPerItem`. Owner-controlled pricing fields are initialized to the bundle cost and can be changed later; inherited cost cannot be changed.
- Arrival creates one partial loss entry for a shortfall, with `itemsLost × costPerItem` as the historical loss value and the arrival date as the loss date.
- A zero-item arrival is prevented client-side. The backend also handles `itemsReceived: 0` as a full-bundle loss: bundle status becomes `lost`, no inventory is created, and one `full_bundle` loss entry is created.
- Full loss is transactional, records all ordered units as lost, and creates no inventory.
- Operational bundle outcomes are `pending → arrived` or `pending → lost`; later recovery changes the original bundle to `refunded` or `replaced`.

### Inventory service

- Lists individual items with bundle type, design, variant, arrival date, and all pricing facts; an exact item-status filter is supported.
- Updates variant and the mutable pricing guidance fields: marked, listed, target, floor, and maximum discount percent.
- Never accepts or changes `costPrice` from a client payload.
- Bundle bulk pricing updates only items scoped to the selected bundle whose status is `in_stock`. It updates only mutable pricing guidance and never changes cost or sold, damaged, or returned items.
- Marking damage is allowed only from `in_stock` and changes the item to terminal `damaged` state.
- Days in stock is derived from the parent bundle arrival date; it is not stored separately.

### Loss-entry service

- Lists loss history newest-first with bundle and order context.
- Original loss type, quantity, value, and date remain unchanged after recovery.
- Recovery accepts only final `refunded` or `replaced` outcomes. A loss with `none` or `pending_claim` can be finalized; a finalized recovery cannot be overwritten.
- Recovery stores its own value and date, so the recovery offsets P&L in its event month rather than rewriting the loss month.
- Recovery is transactional and updates the original bundle to the same final status.
- A replacement recovery creates one distinct new `pending` bundle under the same order, linked by `replacementBundleId`, using the lost quantity and original per-item cost. Inventory is not generated until that replacement follows normal arrival.

### Sale service

- Validates item, sale date, and non-negative selling price. Only `in_stock` items can be sold.
- Enforces `sellingPrice >= floorPrice` as a hard server-side block.
- Calculates a discount warning from the captured listed price and maximum discount threshold. The warning does not block a sale.
- Stores active profit once as `sellingPrice - costPrice` and captures the original listed price.
- Sale creation updates the item to `sold` and creates the sale row transactionally.
- Lists sales newest-first with item and bundle context.
- Processing a return preserves the sale row, marks it `returned`, stores `returnedDate`, nullifies its active profit, and restores the item to `in_stock`. A finalized return cannot be repeated.
- Active sale prices can be corrected above the floor price. Each correction appends an immutable old/new audit row and recalculates active profit. Returned sales cannot be corrected.

### Report services

- **Monthly P&L:** For the selected month, totals active sale profit, loss values by loss date, recovery values by recovery date, and transportation fees by order date. Net P&L is `item profit - transit losses + recoveries - transportation fees`. Returned sales are excluded.
- **Dead stock:** Lists `in_stock` items older than a non-negative whole-day threshold, using the parent bundle arrival date. Items without an arrival date are excluded. The report includes item, bundle, listed price, arrival date, and days in stock.
- **Movers:** Groups active sales by bundle type and design, counts active units sold, and calculates average days from bundle arrival to sale. Returned sales and bundles without arrival dates are excluded. The UI supports fastest-first and slowest-first ordering.
- **Transit loss:** Groups loss entries by order and bundle, totals loss and recovery values, and exposes net unrecovered loss as `total loss - total recovery`.
- **Discount leakage:** For active sales in the selected month, totals `original listed price - selling price`.
- **Bundle profitability:** Aggregates active sale profit and revenue once per bundle, aggregates loss value once per bundle, and reports bundle result as `item profit - loss value`. Returned sales are excluded from profit and revenue. The UI also shows margin percentage using the shared definition below.

## 3. UI/screen specification

The application is mobile-first, optimized for a narrow Android screen, and uses normal-flow content with comfortable touch targets. Empty, loading, error, and success states are explicit on each data-driven screen.

### Orders

- Header region: `Purchasing` eyebrow, `Orders` heading, and solid-black **New order** button.
- **New order** opens a focused Radix dialog with supplier/country, order date, transportation fee, and expected bundle count. The date defaults to today, the form is one column on narrow screens, and **Create order** is primary with **Cancel** as routine outline.
- On success, navigate directly to the new order detail page. The Add bundle dialog is closed; the saved summary is visible first.
- Order cards are full-card links. Each card uses order date eyebrow, supplier/country heading, status pill, transportation fee, and `N of M bundles added` guidance. Cards stack on narrow screens and use a wider multi-column layout on larger screens.
- Status pills distinguish `ongoing` and neutral gray `closed`. An empty list explains how to create the first order. Load failures appear above the list.

### Order detail

- Normal-flow layout starts with plain-text `← Back to orders`.
- The order-summary card contains `Order YYYY-MM-DD` eyebrow, supplier/country heading, top-right status pill, inline transportation fee and expected bundle count, and left-aligned actions.
- **Edit order** expands an inline contextual form while the summary and bundle list remain visible. It edits only purchase facts.
- **Close order** opens a confirmation dialog. If pending bundles exist, the dialog states their count and lists them. Confirming closes the order without changing pending bundle records. Closed orders show a neutral gray pill and hide Add bundle.
- The `SHIPMENT UNITS` section header and `Bundles` heading sit above a right-aligned **Add bundle** action. Add bundle opens a centered dialog with type, design name, items ordered, and cost per item. The dialog shows progress such as `Bundle 1 of 3`; expected count remains guidance and additional bundles are allowed. Saving appends the card without a reload and closes the dialog.
- Bundle cards use the shared card pattern: type/design heading, top-right status pill, `N ordered · Cost X.XX each · Total Y.YY` info line, and state-appropriate action row. Pending cards provide routine **Mark arrived** and destructive **Mark lost**; completed cards do not expose unavailable lifecycle actions.

### Bundle arrival/loss

- **Mark arrived** opens a spacious inline workspace inside the pending bundle card with pale-green active treatment. The ordered count and fixed cost remain visible beside the form.
- The form contains items received (`1` through ordered count), arrival date, and one optional shared variant. It shows live created-item and shortfall calculations. The shared variant is copied to received items; individual variants can be edited later in Inventory.
- The client blocks zero received. **Mark lost** is the full-loss path and uses a clear confirmation; it creates no inventory.
- Arrival submission is transactional, updates the card in place, and closes the workspace. Errors remain in the card. A pending card offers Mark arrived and Mark lost according to the action hierarchy.

### Inventory

- Header region: `Stock control` eyebrow, `Inventory` heading, and visible item count.
- Filter region provides status and bundle selectors. A selected bundle exposes **Bulk price (N eligible)** for in-stock items only; its inline form updates marked, listed, target, floor, and maximum discount percent. The form states that cost and non-stock items are protected.
- Inventory cards always show item identity, bundle type/design, optional variant, status pill, prominent listed price, days in stock, and floor price as a compact `min` indicator.
- **View details / pricing** opens an inline detail workspace containing immutable fixed inherited cost, variant editing, all mutable prices, and save/cancel actions. The workspace is the place for marked, listed, and target values that are not in the compact summary.
- **Mark damaged** is available only for in-stock items and requires confirmation. Damage removes the item from sellable stock without deleting its history.

### Sales

- The Point of Sale screen has a fast-checkout header, a stock browser, a sale-completion panel, and a Recent sales ledger.
- The stock browser searches in-stock items by item ID or listed price and filters by bundle. Results show item, bundle/design, floor price, and listed price; selecting one loads its pricing context and starts the selling price at target price.
- The sale panel shows fixed cost, listed, target, floor, selling price, and live safeguards. Below-floor prices are a hard block; over-limit discounts are warnings only. The large primary action is disabled while blocked.
- Sale cards show sale date, type/design, optional variant, active/returned pill, selling price, raw profit with margin percentage, and the applicable return action.
- **Process return** requires confirmation. It explains that history is preserved, active profit is removed from reports, and the item returns to stock. Returned cards remain visible with return date and audit note.

### Loss and recovery

- Header region: `Transit history` eyebrow, `Loss & Recovery` heading, and a statement that original losses and later recoveries remain separate dated events.
- Loss cards show loss date, bundle type/design, supplier, recovery-status pill, loss type, units lost, historical loss value, and prominent `Net loss = loss value - recovery value`. Unrecovered entries use zero recovery value.
- Final recovery cards also show recovery value and date. A replaced recovery links to its distinct replacement bundle.
- **Record recovery** expands an inline form beneath immutable loss facts. It selects refunded or replaced, accepts recovery value/date, and saves without rewriting the original loss. Recovery creation updates the card in place.

### Reports

- Reports is one read-only business-health workspace with a header, links to Loss & Recovery and Settings, month and dead-stock-day controls, and a Refresh reports action.
- The P&L card is prioritized first and shows item profit, transit losses, recoveries, transportation fees, and emphasized net P&L for the selected month.
- Dead Stock is a table of item, bundle, listed price, and days in stock.
- Fastest / Slowest Movers is a table of type, design, units sold, and average days to sell, with a toggle for fastest-first or slowest-first.
- Transit Loss is a table of order, bundle, design, loss, recovered, and unrecovered totals.
- Discount Leakage shows the selected month's total discount granted below listed price.
- Bundle Profitability is a table of bundle, design, item profit, margin, loss, and result. Margin uses the shared definition below.
- Reports expose loading, empty-row, and inline error states. Tables scroll horizontally rather than forcing narrow-screen layout breakage.

## 4. App-wide conventions

### Interaction policy

- Use focused dialogs for creation: **New order** and **Add bundle**.
- Use inline forms/workspaces for contextual modification: order editing, arrival, pricing, bulk pricing, recovery, and other status-detail changes.
- Use confirmation for destructive or high-stakes actions: **Mark lost**, **Mark damaged**, **Process return**, and **Close order**. Structured close decisions use Radix AlertDialog; simple prompts may use native confirmation. Return confirmations must never describe history as deleted.

### Card pattern

Entity cards follow one reusable structure where applicable: muted eyebrow, bold heading, top-right status pill, compact info line or metric region, and left-aligned action row. Cards preserve immutable facts and reveal mutable detail progressively.

### Button hierarchy

- Outline/white buttons are routine or secondary actions.
- Solid black buttons are primary or forward-moving actions.
- Solid red buttons are reserved for destructive actions only.
- Buttons and inputs use comfortable touch-target heights and visible focus states.

### Design system

- Font: Geist Variable for body and headings.
- Light-theme semantic colors:

| Token | Value |
|---|---|
| `--background`, `--card`, `--popover` | `oklch(1 0 0)` |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `oklch(0.145 0 0)` |
| `--primary`, `--secondary-foreground`, `--accent-foreground` | `oklch(0.205 0 0)` |
| `--primary-foreground`, `--sidebar` | `oklch(0.985 0 0)` |
| `--secondary`, `--muted`, `--accent`, `--sidebar-accent` | `oklch(0.97 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` |
| `--border`, `--input`, `--sidebar-border` | `oklch(0.922 0 0)` |
| `--ring`, `--sidebar-ring` | `oklch(0.708 0 0)` |
| `--chart-1` through `--chart-5` | `oklch(0.87 0 0)`, `oklch(0.556 0 0)`, `oklch(0.439 0 0)`, `oklch(0.371 0 0)`, `oklch(0.269 0 0)` |

- Dark-theme semantic colors:

| Token | Value |
|---|---|
| `--background` | `oklch(0.145 0 0)` |
| `--foreground`, `--primary-foreground`, `--secondary-foreground`, `--card-foreground`, `--popover-foreground` | `oklch(0.985 0 0)` |
| `--card`, `--popover`, `--sidebar` | `oklch(0.205 0 0)` |
| `--primary` | `oklch(0.922 0 0)` |
| `--secondary`, `--muted`, `--accent`, `--sidebar-accent` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.708 0 0)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--border`, `--sidebar-border` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring`, `--sidebar-ring` | `oklch(0.556 0 0)` |
| `--chart-1` through `--chart-5` | `oklch(0.87 0 0)`, `oklch(0.556 0 0)`, `oklch(0.439 0 0)`, `oklch(0.371 0 0)`, `oklch(0.269 0 0)` |
- Radius scale starts at `--radius: 0.625rem`; `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, and `4xl` are respectively `0.375rem`, `0.5rem`, `0.625rem`, `0.875rem`, `1.125rem`, `1.375rem`, and `1.625rem`. Pills use a fully rounded radius.
- Styling uses plain CSS custom properties and CSS Modules. Radix state attributes are styled in CSS Modules; no utility-CSS dependency is required.
- Primary navigation is dependency-free icon and text navigation. It is fixed to the bottom on narrow screens and moves into normal flow on wider screens; content reserves space for it on mobile.

### Shared financial definition

Profit margin percentage is always:

```text
profit margin % = profit / selling price × 100
```

The same definition is used on sales cards and bundle-profitability reports. A zero selling price produces `0%`.

## 5. Test coverage

The existing regression suite covers these guardrails:

1. Returns preserve the sale audit row, set it to `returned`, nullify active profit, and restore the item to `in_stock`.
2. Zero-item arrival records a full-bundle loss and creates no inventory.
3. Orders can close while bundles remain pending.
4. Editing order facts does not change lifecycle status.
5. Partial arrival trims and copies one shared variant to every generated item.
6. Bundle bulk pricing changes only in-stock items and never changes inherited cost.
7. Item detail updates trim variant and leave inherited cost unchanged.
8. Bundle profitability excludes returned sale profit and revenue.
9. Replacement recovery preserves loss history and exposes replacement-bundle linkage.
10. Movers count only active sales and ignore returned audit rows.
