# Old-App Reference for New-App Reconciliation

## Purpose and evidence labels

This document records the target that emerged from the prior conversation about the **old Prisma-based app**. It is intended to be handed to the person comparing that behavior and visual foundation with the independently rebuilt **Drizzle + `node:sqlite` + React 18 + CSS Modules + Radix UI** app.

> **Important:** Nothing in this document claims that the new app currently matches these details. The new app was built independently against the design document. Its current schema, queries, edge-case handling, pages, and UI must be inspected directly.

The following labels are used throughout:

- **Confirmed — old app:** Explicitly established from the old app's schema, code, or build output discussed in the conversation.
- **Inferred:** A conclusion supported by confirmed details, but not itself directly established.
- **Unknown:** Not established by the conversation. It must be checked in source code, recovered from another artifact, or decided from the design document.

The neutral type names below are conceptual. They are not proposed Drizzle syntax.

---

## 1. Data model — target schema

### Scope warning

**Confirmed — old app:** This is the five-model schema that was confirmed working in the **old Prisma app**. It is the comparison target recovered from that app, not a description of the independently rebuilt app.

**Unknown — new app:** The new Drizzle schema's actual columns, nullability, defaults, enum enforcement, foreign keys, indexes, and table names have not been established by this conversation. They need a direct side-by-side comparison; they must not be assumed to match.

### Enum value sets

| Conceptual enum | Exact old-app values |
|---|---|
| `OrderStatus` | `ongoing`, `closed` |
| `BundleStatus` | `pending`, `arrived`, `lost`, `refunded`, `replaced` |
| `ItemStatus` | `in_stock`, `sold`, `damaged`, `returned` |
| `LossType` | `full_bundle`, `partial` |
| `RecoveryStatus` | `none`, `pending_claim`, `refunded`, `replaced` |

### Order

**Mapped table name:** `orders`

| Field | Neutral type | Nullable? | Default / generation | Notes |
|---|---|---:|---|---|
| `id` | Text ID | No | Generated CUID | Primary key. |
| `supplierOrCountry` | Text | No | None | Supplier or source-country label. |
| `orderDate` | Date-time | No | None | Purchasing event date. |
| `transportationFee` | Floating-point number | No | None | Order-level lump expense; it does not flow into item cost. |
| `expectedBundleCount` | Integer | No | None | Expected number of purchasing bundles. |
| `status` | `OrderStatus` | No | `ongoing` | Order lifecycle state. |
| `bundles` | Relation collection | N/A | N/A | One order has zero or more bundles. ORM navigation field, not a stored scalar column. |

### Bundle

**Mapped table name:** `bundles`

| Field | Neutral type | Nullable? | Default / generation | Notes |
|---|---|---:|---|---|
| `id` | Text ID | No | Generated CUID | Primary key. |
| `orderId` | Text ID | No | None | Foreign key to `Order.id`. |
| `order` | Relation reference | No | N/A | Each bundle belongs to exactly one order. ORM navigation field. |
| `type` | Text | No | None | Clothing/product type. |
| `designName` | Text | No | None | Design identifier or name. |
| `itemsOrdered` | Integer | No | None | Ordered physical-unit count. Fixed after creation in old-app service behavior. |
| `costPerItem` | Floating-point number | No | None | Per-item acquisition cost copied directly into generated inventory items. |
| `status` | `BundleStatus` | No | `pending` | Bundle lifecycle state. |
| `itemsReceived` | Integer | Yes | Null | Unknown until an arrival/loss outcome is recorded. |
| `arrivalDate` | Date-time | Yes | Null | Arrival date when applicable. |
| `inventoryItems` | Relation collection | N/A | N/A | One bundle has zero or more inventory items. ORM navigation field. |
| `lossEntries` | Relation collection | N/A | N/A | One bundle has zero or more loss entries. ORM navigation field. |

### InventoryItem

**Mapped table name:** `inventory_items`

| Field | Neutral type | Nullable? | Default / generation | Notes |
|---|---|---:|---|---|
| `id` | Text ID | No | Generated CUID | Primary key. |
| `bundleId` | Text ID | No | None | Foreign key to `Bundle.id`. |
| `bundle` | Relation reference | No | N/A | Each inventory item belongs to exactly one bundle. ORM navigation field. |
| `variant` | Text | Yes | Null | Optional variant label applied during old-app arrival generation. |
| `costPrice` | Floating-point number | No | None | Direct copy of `Bundle.costPerItem` at item creation; read-only afterward. |
| `markedPrice` | Floating-point number | No | None at schema level | Old arrival service initialized it to `0`. |
| `listedPrice` | Floating-point number | No | None at schema level | Old arrival service initialized it to `0`. |
| `targetPrice` | Floating-point number | No | None at schema level | Old arrival service initialized it to `0`. |
| `floorPrice` | Floating-point number | No | None at schema level | Old arrival service initialized it to `0`; enforced by the sale service. |
| `maxDiscountPercent` | Floating-point number | No | None at schema level | Old arrival service initialized it to `0`; used for a frontend warning. |
| `status` | `ItemStatus` | No | `in_stock` | Physical selling-unit state. |
| `sales` | Relation collection | N/A | N/A | One inventory item can relate to zero or more sale rows in the old schema. ORM navigation field. |

**Confirmed — old schema nuance:** The five pricing fields were required, not nullable, in the working old schema. This differs from descriptions that mark those fields optional. The arrival service satisfied that requirement by creating items with `0` for all five owner-set pricing fields.

### Sale

**Mapped table name:** `sales`

| Field | Neutral type | Nullable? | Default / generation | Notes |
|---|---|---:|---|---|
| `id` | Text ID | No | Generated CUID | Primary key. |
| `itemId` | Text ID | No | None | Foreign key to `InventoryItem.id`. |
| `item` | Relation reference | No | N/A | Each sale belongs to exactly one inventory item. ORM navigation field. |
| `saleDate` | Date-time | No | None | Date attributed to the sale. |
| `sellingPrice` | Floating-point number | No | None | Actual selling price. |
| `profit` | Floating-point number | No | None | Stored once as `sellingPrice - InventoryItem.costPrice`. |

**Confirmed — old schema nuance:** `itemId` was not declared unique. At schema level, the relation was one inventory item to many sales, even though service-level status guards normally prevented a second active sale without a return.

### LossEntry

**Mapped table name:** `loss_entries`

| Field | Neutral type | Nullable? | Default / generation | Notes |
|---|---|---:|---|---|
| `id` | Text ID | No | Generated CUID | Primary key. |
| `bundleId` | Text ID | No | None | Foreign key to `Bundle.id`. |
| `bundle` | Relation reference | No | N/A | Each loss entry belongs to exactly one bundle. ORM navigation field. |
| `lossType` | `LossType` | No | None | `full_bundle` or `partial`. |
| `itemsLost` | Integer | No | None | Number of physical units lost. |
| `lossValue` | Floating-point number | No | None | Historical loss value fixed at creation. |
| `lossDate` | Date-time | No | None | Date the loss is attributed to. |
| `recoveryStatus` | `RecoveryStatus` | No | `none` | Recovery lifecycle/outcome. |
| `recoveryValue` | Floating-point number | Yes | Null | Added only when a recovery is recorded. |
| `recoveryDate` | Date-time | Yes | Null | Date the later recovery is attributed to. |

### Relation summary

**Confirmed — old app:**

- `Order` 1 → many `Bundle`; every bundle requires one order.
- `Bundle` 1 → many `InventoryItem`; every inventory item requires one bundle.
- `Bundle` 1 → many `LossEntry`; every loss entry requires one bundle.
- `InventoryItem` 1 → many `Sale`; every sale requires one inventory item.
- No separate supplier, customer, category, payment, stock-movement, or return-history model existed among these five confirmed models.

**Unknown — new app:** Whether the new Drizzle schema intentionally changed any relation cardinality or added database-level constraints is not known here. Such differences should be reviewed rather than automatically removed.

---

## 2. Backend logic — target behavior to reconcile toward

### Interpretation warning

**Confirmed — old app:** The responsibilities and behaviors below are what the conversation established from the old Prisma service code.

**Unknown — new app:** The new app was built independently with Drizzle from the start; it was not migrated line-for-line from the working Prisma services. Its query structure, transaction API usage, validation order, concurrency behavior, and edge-case handling may legitimately differ even where its schema matches. This section is an old-app reference point, not an accusation that the new implementation is failing a complete specification.

### 2.1 Order service responsibility

**Confirmed — old app:**

- Validated and created orders with supplier/country, order date, non-negative transportation fee, and non-negative integer expected bundle count.
- Created orders with the schema default status `ongoing`.
- Listed orders newest-first by `orderDate`.
- Retrieved one order and returned a not-found error when absent.
- Updated all editable order details while deliberately excluding `status`; status was controlled by a separate close operation.
- Closed an order by setting `status` to `closed`.
- Closing was a single write, not a multi-write transaction.
- Closing did **not** validate bundle completion or bundle statuses.
- No old-code reopening transition was observed.
- The observed create-bundle logic did not block adding a bundle to a closed order.

**Inferred:** `ongoing → closed` was the intended ordinary order transition. The enum did not express a cancelled state.

### 2.2 Bundle service responsibility

**Confirmed — old app:**

- Created a pending bundle beneath an existing order.
- Required text `type` and `designName`, a non-negative `costPerItem`, and a non-negative integer `itemsOrdered`.
- Listed an order's bundles after verifying that the parent order existed.
- Allowed editing only while the bundle was `pending`.
- Kept `itemsOrdered` fixed after creation by excluding it from updates, even if the client sent it.
- Allowed edits to `type`, `designName`, and `costPerItem` while pending.

#### Arrival transaction

Arrival used one callback-style database transaction. Within that transaction, the old service:

1. Re-read the bundle.
2. Required the bundle to be `pending`.
3. Rejected `itemsReceived > itemsOrdered`.
4. Updated the bundle to `arrived`, saving `itemsReceived` and `arrivalDate`.
5. Created exactly `itemsReceived` inventory rows when the count was greater than zero.
6. Copied `bundle.costPerItem` directly into every inventory item's `costPrice`.
7. Initialized `markedPrice`, `listedPrice`, `targetPrice`, `floorPrice`, and `maxDiscountPercent` to `0`.
8. Applied one optional, trimmed variant value to every item generated in that arrival operation.
9. If there was a shortfall, created one `partial` loss entry with:
   - `itemsLost = itemsOrdered - itemsReceived`
   - `lossValue = itemsLost × costPerItem`
   - `lossDate = arrivalDate`

All arrival writes committed or rolled back together.

**Confirmed edge behavior:** The service accepted `itemsReceived = 0`. For a non-empty bundle this produced status `arrived` plus a `partial` loss for the full quantity, rather than the `lost` status and `full_bundle` loss type used by the explicit loss operation.

#### Full-loss transaction

Full loss also used one callback-style transaction. Within it, the old service:

1. Re-read and required a `pending` bundle.
2. Set status to `lost` and `itemsReceived` to `0`.
3. Created no inventory items.
4. Created one `full_bundle` loss entry with all ordered items, `itemsOrdered × costPerItem`, and the server's current date-time as `lossDate`.

All full-loss writes committed or rolled back together.

**Inferred from observed transitions and enums:**

- Operational arrival/loss transitions were `pending → arrived` and `pending → lost` only.
- `refunded` and `replaced` were not direct arrival transitions; the loss-recovery service set those bundle outcomes later.

### 2.3 Inventory service responsibility

**Confirmed — old app:**

- Listed individual inventory items, optionally filtered by the exact `ItemStatus` values, with parent bundle context.
- Updated all five owner-controlled pricing values as non-negative numbers.
- Never updated `costPrice`; a client-supplied cost was deliberately ignored.
- Marked damage only from `in_stock`, producing `in_stock → damaged`.
- Treated damage as terminal in the observed service; no reversal operation was present.

#### Return transaction

Returns used one callback-style transaction. Within it, the old service:

1. Required the item to exist and be `sold`.
2. Found that item's latest sale by `saleDate`.
3. Rejected the return if no sale row existed.
4. Permanently deleted the latest sale row.
5. Changed item status from `sold` back to `in_stock`.
6. Left cost and all owner-set prices unchanged.

**Confirmed old behavior, not necessarily the desired final design:** A return erased the sale record instead of retaining immutable sale/return history. This is a particularly important reconciliation point to decide deliberately in the new app.

**Schema/service terminology nuance:** Although the enum contained `returned`, the observed return service restored status to `in_stock`; it did not set status to `returned`. No observed service transition produced `returned`.

### 2.4 Loss-entry service responsibility

**Confirmed — old app:**

- Listed loss history newest-first by `lossDate`, including bundle and parent-order context.
- Accepted only final recovery outcomes `refunded` or `replaced` through the recovery operation.
- Did not provide an observed operation for setting `pending_claim`; comments said pending claims were managed outside the app.
- Allowed recovery only while the existing status was `none` or `pending_claim`.
- Preserved `lossType`, `itemsLost`, `lossValue`, and `lossDate` unchanged.

#### Recovery transaction

Recovery used one callback-style transaction. Within it, the old service:

1. Loaded the loss entry with its bundle.
2. Blocked a second final recovery.
3. Updated only `recoveryStatus`, `recoveryValue`, and `recoveryDate` on the loss entry.
4. Set the original bundle's status to the same final outcome: `refunded` or `replaced`.
5. For `replaced`, created a **distinct new pending bundle** under the same order from newly supplied bundle details.
6. Did not generate inventory for that replacement automatically; it had to follow the normal pending-bundle arrival flow.

All recovery-related writes committed or rolled back together.

### 2.5 Sale service responsibility

**Confirmed — old app:**

- Validated an item ID, sale date, and non-negative selling price.
- Required the item to exist and be `in_stock`.
- Enforced the floor price on the server: below-floor sales returned a business-rule error before writes occurred.
- Did not enforce the max-discount warning on the server.
- Calculated and stored `profit = sellingPrice - costPrice` once at sale time.
- Listed sales newest-first with inventory-item and bundle context.

#### Sale transaction

After its initial item read and guards, the old service used one callback-style transaction to:

1. Set item status to `sold`.
2. Create the sale row with the supplied sale date, selling price, and precomputed profit.

Both writes committed or rolled back together.

**Confirmed implementation nuance:** The item read and floor/status checks occurred before the transaction opened; the transaction's item update did not itself include a status predicate. This describes the old implementation and should not be copied automatically if the new implementation can make concurrent-sale protection stronger.

### 2.6 Report-service evidence boundary

> **Confirmed only as existence, not behavior:** In the prior conversation, the report services named **bundle-profitability**, **dead-stock**, **movers**, and **transit-loss** were only confirmed to **exist** because TypeScript/build errors referenced them. Their implementations were never inspected in that conversation.

Therefore:

- There is no conversation-confirmed query logic for those four reports to compare against the new app.
- Their grouping, filtering, null handling, date attribution, formulas, sort order, and edge cases are **genuinely unknown from this conversation**.
- Their intended behavior must come from the design document, the user's memory, or separately recovered old source—not from assumptions made in this reference.
- A filename or successful build reference proves existence, not correctness or intended semantics.

The same evidence discipline should be used for any report not explicitly analyzed in the conversation: do not infer backend formulas from a page title alone.

---

## 3. Frontend — page inventory and design tokens to reimplement

### 3.1 Confirmed filename inventory

**Confirmed — old-app build output:** The following page filenames were visible. This is an inventory of source units, **not** evidence about their layout or visual quality.

#### Operational pages

- `OrdersPage.tsx`
- `OrderDetailPage.tsx`
- `InventoryPage.tsx`
- `SalesPage.tsx`
- `LossEntriesPage.tsx`

#### Report navigation and report pages

- `ReportsPage.tsx`
- `MonthlyPlPage.tsx`
- `DeadStockPage.tsx`
- `MoversPage.tsx`
- `TransitLossesReportPage.tsx`
- `DiscountLeakagePage.tsx`
- `BundleProfitabilityPage.tsx`

#### Separately confirmed component named in the logs

- `InventoryCard.tsx` — a component, not a route-level page.

**Unknown from filename inventory alone:** Which of these pages the owner liked, which interactions felt better, and whether the independently rebuilt app should retain exactly the same route/page boundaries.

### 3.2 Old-app design tokens

**Confirmed — old `index.css`:** The old app used **Geist Variable** as its sans-serif and heading font:

```css
--font-sans: "Geist Variable", sans-serif;
--font-heading: var(--font-sans);
```

#### Light theme (`:root`)

| Variable | Exact value |
|---|---|
| `--background` | `oklch(1 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` |
| `--card` | `oklch(1 0 0)` |
| `--card-foreground` | `oklch(0.145 0 0)` |
| `--popover` | `oklch(1 0 0)` |
| `--popover-foreground` | `oklch(0.145 0 0)` |
| `--primary` | `oklch(0.205 0 0)` |
| `--primary-foreground` | `oklch(0.985 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` |
| `--secondary-foreground` | `oklch(0.205 0 0)` |
| `--muted` | `oklch(0.97 0 0)` |
| `--muted-foreground` | `oklch(0.556 0 0)` |
| `--accent` | `oklch(0.97 0 0)` |
| `--accent-foreground` | `oklch(0.205 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` |
| `--border` | `oklch(0.922 0 0)` |
| `--input` | `oklch(0.922 0 0)` |
| `--ring` | `oklch(0.708 0 0)` |
| `--chart-1` | `oklch(0.87 0 0)` |
| `--chart-2` | `oklch(0.556 0 0)` |
| `--chart-3` | `oklch(0.439 0 0)` |
| `--chart-4` | `oklch(0.371 0 0)` |
| `--chart-5` | `oklch(0.269 0 0)` |
| `--sidebar` | `oklch(0.985 0 0)` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` |
| `--sidebar-primary` | `oklch(0.205 0 0)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-accent` | `oklch(0.97 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` |
| `--sidebar-border` | `oklch(0.922 0 0)` |
| `--sidebar-ring` | `oklch(0.708 0 0)` |

#### Dark theme (`.dark`)

| Variable | Exact value |
|---|---|
| `--background` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.985 0 0)` |
| `--card` | `oklch(0.205 0 0)` |
| `--card-foreground` | `oklch(0.985 0 0)` |
| `--popover` | `oklch(0.205 0 0)` |
| `--popover-foreground` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.922 0 0)` |
| `--primary-foreground` | `oklch(0.205 0 0)` |
| `--secondary` | `oklch(0.269 0 0)` |
| `--secondary-foreground` | `oklch(0.985 0 0)` |
| `--muted` | `oklch(0.269 0 0)` |
| `--muted-foreground` | `oklch(0.708 0 0)` |
| `--accent` | `oklch(0.269 0 0)` |
| `--accent-foreground` | `oklch(0.985 0 0)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.556 0 0)` |
| `--chart-1` | `oklch(0.87 0 0)` |
| `--chart-2` | `oklch(0.556 0 0)` |
| `--chart-3` | `oklch(0.439 0 0)` |
| `--chart-4` | `oklch(0.371 0 0)` |
| `--chart-5` | `oklch(0.269 0 0)` |
| `--sidebar` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-primary` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-accent` | `oklch(0.269 0 0)` |
| `--sidebar-accent-foreground` | `oklch(0.985 0 0)` |
| `--sidebar-border` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.556 0 0)` |

#### Radius scale

| Variable | Exact definition | Value with old `--radius` |
|---|---|---:|
| `--radius` | `0.625rem` | `0.625rem` |
| `--radius-sm` | `calc(var(--radius) * 0.6)` | `0.375rem` |
| `--radius-md` | `calc(var(--radius) * 0.8)` | `0.5rem` |
| `--radius-lg` | `var(--radius)` | `0.625rem` |
| `--radius-xl` | `calc(var(--radius) * 1.4)` | `0.875rem` |
| `--radius-2xl` | `calc(var(--radius) * 1.8)` | `1.125rem` |
| `--radius-3xl` | `calc(var(--radius) * 2.2)` | `1.375rem` |
| `--radius-4xl` | `calc(var(--radius) * 2.6)` | `1.625rem` |

### 3.3 Translation requirement for the new stack

**Confirmed — old app:** Styling used shadcn's Tailwind-based setup, Tailwind theme aliases, and Tailwind utility consumption of the tokens.

**Confirmed — new-stack direction supplied for reconciliation:** The new app uses plain CSS custom properties and CSS Modules, with Radix UI primitives, and must not depend on Tailwind.

Therefore, the values above should be translated as follows:

- Put global semantic values such as `--background`, `--card`, and `--radius` in the new global stylesheet.
- Let CSS Modules consume them with declarations such as `background: var(--card)` and `border-radius: var(--radius-xl)`.
- Style Radix states through Radix data attributes in CSS Modules where appropriate.
- Do **not** copy Tailwind directives, `@theme`, `@apply`, utility classes, or a Tailwind configuration into the new app.
- Preserving token values does not require preserving shadcn component implementation details.

### 3.4 UI evidence limitation

> **Genuinely unknown from the conversation:** The conversation contained no actual component layouts, full JSX structure, spacing decisions, responsive compositions, interaction recordings, or screenshots of the liked old UI.

> **Later evidence note:** Section 6 now includes a screenshot-confirmed order-detail target and separately labeled observations from the independently rebuilt app's current React code. Those code observations establish what the rebuild currently implements, but they do not establish what the owner wants unless the owner later confirms them.

Consequently:

- This reference can restore the old color system, typeface, radius scale, and known page inventory.
- It cannot determine why a current screen feels worse if the complaint concerns layout, spacing, information hierarchy, mobile density, controls, navigation, dialog behavior, or interaction flow.
- It cannot reconstruct exact old screens from filenames and tokens.
- Those aspects must come from the owner's memory of what worked, from direct feedback on the new screens, or from old component source outside the conversation—such as old Git history, another branch, a backup, or an archived build/source tree.

Even if old component source is recovered, it should be translated to CSS Modules and Radix primitives rather than copied as Tailwind/shadcn code.

---

## 4. Explicit reconciliation framing

This document is a **reference for comparison and reconciliation**, assembled from one conversation's worth of confirmed old-app details. It is **not a complete specification**, a full UX reconstruction, or a statement of the independently rebuilt app's current condition.

The new app should be evaluated by a careful side-by-side diff of its actual Drizzle schema, service queries, transactions, routes, components, and CSS against the confirmed points above. A difference does not automatically mean the new app is wrong: the difference may be intentional, the old behavior may itself need improvement, or this reference may simply be incomplete. Classify each difference before changing code: **confirmed regression**, **intentional new-stack translation**, **desired design change**, or **unknown requiring owner/design-document input**.

---

## 5. Proposed UI logic flow and screen placement — hypothesis, not recovered truth

### Evidence warning

> **Proposed / inferred — not confirmed conversation history:** This section is a candidate workflow for discussion. It was not recovered from screenshots, remembered JSX, or a confirmed old-app interaction specification. It does not claim that either the old app or the new app currently behaves this way.

The purpose is to give the implementer a coherent starting point for answering questions such as:

- What should happen immediately after an order is created?
- Should bundle creation happen in the same workflow?
- Which fields and actions should remain visible together?
- Where should saved bundles appear relative to their order?
- How can the flow remain easy to use on a 390px Android screen?

Every recommendation below should be validated with the owner before it becomes accepted behavior.

### 5.1 Proposed end-to-end owner journey

A simple primary journey could be:

1. **Create an order** — record the supplier/country, date, transportation fee, and expected bundle count.
2. **Add the order's bundles** — enter each purchasing unit while the order context remains visible.
3. **Record each bundle outcome** — mark it arrived or lost when its outcome is known.
4. **Price arrived inventory** — set selling guidance for the generated individual items without changing fixed cost.
5. **Record sales** — select an in-stock item, review its price context, and enter the actual selling price.
6. **Record later recoveries** — add refund/replacement outcomes to loss history without rewriting the loss.
7. **Review reports** — use event dates and stored historical values to understand the business.

This sequence reflects the business dependency between records. It does **not** mean the UI must lock the owner into a wizard or prevent navigation to other areas.

### 5.2 Proposed order creation flow

#### Orders landing screen

The `/orders` screen could remain a scanning and entry screen rather than carrying the entire purchasing workflow.

Suggested vertical order on mobile:

1. Page title and a prominent **New order** action.
2. Optional status filters such as ongoing/closed, only if the order list becomes long.
3. Newest-first order cards.
4. Empty-state guidance when no orders exist.

Each order card should make the next action obvious by showing:

- supplier or country as the main label;
- order date;
- transportation fee;
- bundle progress, for example `2 of 4 bundles added` if the current API can provide it;
- order status;
- a clear affordance to open the order workspace.

#### New-order form

The minimum field sequence should follow how the owner thinks about a purchase:

1. `Supplier or country`
2. `Order date`
3. `Transportation fee`
4. `Expected bundle count`

Proposed ease-of-use details:

- Use a single-column form at 390px; avoid placing narrow numeric fields side by side merely to save height.
- Default the date to today, but permit backdating.
- Use appropriate mobile keyboards (`inputMode="decimal"` or `inputMode="numeric"`) while still validating on the server.
- Explain transportation fee briefly as an order expense that does not change item cost.
- Keep labels visible; do not rely on placeholders as labels.
- Preserve entered values after a validation error.
- Put the primary action last and name it for the next step: **Create order and add bundles**.

**Proposed transition after success:** Navigate directly to the new order's detail workspace instead of leaving the owner on the general order list. The newly created order summary should be visible at the top, and the first bundle form should be ready immediately below it.

A secondary **Create and return to list** action is possible, but it may add unnecessary choice for a solo-owner workflow. Confirm whether it is genuinely useful before adding it.

### 5.3 Proposed order-detail workspace and placement

> **History note:** The owner later confirmed the order-detail page's static layout from a screenshot of the current app and separately confirmed the **Add bundle** interaction. Section 6.2 is the higher-confidence source and takes precedence for this screen. In particular, the confirmed default view has a bundles section header with an **Add bundle** button, not a permanently visible bundle-entry form; selecting it opens a centered dialog. The order summary shows the expected bundle count without the proposed progress text.

The order detail screen can act as one focused workspace for the order and all of its bundles.

Suggested mobile composition:

```text
← Orders

[ Order summary card ]
Supplier / country                         [ongoing]
Order date
Transportation fee
Expected bundles and progress
[Edit order] [Close order]

[ Bundle entry section ]
Add bundle 1 of 4
Type
Design name
Items ordered
Cost per item
Computed bundle total (display only)
[Save bundle]

[ Saved bundles section ]
Bundle 1 card
Bundle 2 card
...
```

This placement keeps three ideas visually distinct:

- the **order summary** provides parent context;
- the **bundle form** represents the current task;
- the **saved bundle cards below it** provide progress and lifecycle actions.

The order form itself should not be repeated permanently on this screen. Show the compact summary by default and open order editing only on request, using either an inline edit region or a Radix Dialog. Bundle creation is more central to this workflow, so it can remain inline and close to the saved bundle list.

### 5.4 Proposed bundle-creation interaction

> **History note:** Section 6.2 confirms from screenshot evidence the saved pending-bundle card's visible fields, status pill, action row, and button hierarchy. It also confirms from the owner's separate interaction description that **Add bundle** opens a centered dialog, saving appends the new card without a full-page reload, and the dialog then closes. This confirms the proposal's use of low-emphasis routine actions and destructive styling for **Mark lost**, while adding exact placement and text. Progress, clearing/refocusing, expected-count workflow, and animation remain hypothetical until the owner describes them.

#### Fields and business context

The bundle form should contain:

1. `Type`
2. `Design name`
3. `Items ordered`
4. `Cost per item`

Directly beneath the cost fields, display:

```text
Bundle total: items ordered × cost per item
```

This total is display-only and must never become a stored database field. Transportation fee should not appear in the calculation.

#### Repeated entry

Bundle entry is naturally repetitive. A low-friction flow could be:

- Save the bundle.
- Add its card immediately to the saved list below without a full-page reload.
- Update progress, for example `1 of 4 bundles added`.
- Clear the bundle form and focus its first field when more bundles are expected.
- Change the heading to `Add bundle 2 of 4`, then `Add bundle 3 of 4`, and so on.
- Once the expected count is reached, collapse the empty form behind an **Add another bundle** button rather than removing the ability to add one.

**Unknown product decision:** `expectedBundleCount` may be a planning estimate rather than a hard maximum. The proposed UI therefore treats it as progress guidance, not a client-side or server-side limit.

#### Saved bundle card placement and contents

Every saved bundle should appear below the entry form as a separate card. A compact pending card could show:

- type and design name as the heading;
- status badge;
- items ordered;
- cost per item;
- computed total cost;
- actions appropriate to the current state.

For a `pending` bundle, the primary actions could be:

- **Mark arrived**
- **Mark lost**
- **Edit** as a lower-emphasis action

Destructive or irreversible actions should not compete visually with the ordinary next action. `Mark lost` should use destructive styling and require a clear confirmation.

For non-pending bundles, replace edit/outcome controls with a read-only outcome summary. Examples:

- `arrived`: received count, arrival date, shortfall if any, and a link to generated inventory;
- `lost`: full loss quantity/value and loss date;
- `refunded`: original loss plus later refund value/date;
- `replaced`: original loss plus replacement outcome and, where available, a link to the distinct replacement bundle.

### 5.5 Proposed arrival and loss interactions

#### Mark arrived

Opening **Mark arrived** could use a Radix Dialog on larger screens and a near-full-screen dialog/sheet treatment on mobile. It should request:

- items received;
- arrival date;
- optional variant label, if one shared label for all generated items is still the intended data model.

Before submission, show a plain-language preview:

```text
12 inventory items will be created at a fixed cost of Rs X each.
2 missing items will create a transit-loss entry worth Rs Y.
```

If no items arrived, the UI should guide the owner toward **Mark lost** rather than casually recording a zero-item arrival. The exact server rule should be decided separately because the old service accepted zero-item partial arrival.

After a successful arrival:

- close the arrival UI;
- update the bundle card in place;
- show a success message with counts;
- offer **Price received items** as the most useful next action.

#### Mark lost

The confirmation should summarize the permanent history that will be created:

- no inventory items will be generated;
- all ordered items will be recorded as lost;
- the loss value is `itemsOrdered × costPerItem`;
- recovery, if it happens later, will be recorded separately.

### 5.6 Proposed transition from arrival to inventory pricing

The generated items are individual selling units, but entering the same five prices repeatedly may be burdensome. A proposed pricing workflow is:

1. From the arrived bundle card, select **Price received items**.
2. Open inventory already filtered to that bundle.
3. Show the fixed cost prominently and label it read-only.
4. Enter marked, listed, target, and floor prices plus max discount percent.
5. If all generated items share the same pricing, offer **Apply to all in-stock items from this bundle** with an explicit item count and confirmation.
6. Allow later per-item editing for exceptions.

> **Unknown / requires design and backend review:** Bulk pricing was not established as old-app behavior. It should only be implemented if the owner wants it and the new backend can update the intended items safely. It must never update `costPrice` or sold/damaged items unintentionally.

### 5.7 Proposed sales interaction

The sales screen should optimize for quick item selection without hiding the guardrails:

- Search by type, design, variant, or a short item identifier.
- Show only in-stock items by default.
- After selection, show cost, marked, listed, target, floor, and maximum discount values together.
- Keep sale date and selling price near the submit action.
- Show the excessive-discount warning before submission but permit the sale.
- Show a clear blocking message when below floor price and preserve the entered selling price for correction.
- After success, remove the sold item from selectable stock and show the stored profit/result.

### 5.8 Proposed loss-recovery interaction

Loss entries should read as a timeline rather than an editable loss form:

1. Original loss facts remain grouped and visibly read-only.
2. If no final recovery exists, show **Record recovery**.
3. Ask whether the outcome was refunded or replaced, then request recovery value/date.
4. For replacement, collect the distinct replacement-bundle fields and explain that it will be created as pending; inventory is not generated yet.
5. After saving, display the recovery below the original loss with its own date.

This presentation reinforces that recovery is a later event and does not rewrite the original loss.

### 5.9 Proposed mobile ease-of-use rules

These are design recommendations, not recovered facts:

- Design at 390px first and verify that no card or form causes horizontal scrolling.
- Use one obvious primary action per section.
- Keep destructive actions visually separated from routine actions.
- Use at least comfortable touch-target heights for buttons, inputs, and selects.
- Keep form labels and validation messages next to the affected field.
- Use sticky bottom actions only when they do not cover content or conflict with primary navigation.
- Preserve form state when dialogs close accidentally or requests fail, unless the owner explicitly cancels.
- Return focus to the action that opened a Radix Dialog after it closes.
- Announce save/error results accessibly and move focus to the first invalid field.
- Prefer progressive disclosure: summaries first, forms only when needed.
- Do not hide immutable business facts such as cost price, original loss value, or event dates inside secondary menus.

### 5.10 Decisions to confirm before implementation

The implementer should ask the owner to approve or revise these points:

1. After order creation, should the app automatically open that order and its first bundle form?
2. Should bundle entry stay open until the expected count is reached?
3. Is expected bundle count guidance only, or should exceeding it require confirmation?
4. Should order editing use an inline region or a Radix Dialog?
5. Should arrival use a dialog, a dedicated route, or inline expansion inside the bundle card?
6. Can one variant label correctly describe every item generated from one bundle arrival?
7. Should zero received items be blocked in the arrival UI and redirected to full loss?
8. Is bulk pricing by bundle desirable, and exactly which item statuses may it update?
9. What should closing an order mean visually when some bundles remain pending?
10. Which information must remain visible on each card without opening details?

Until these questions are answered, the layouts and transitions in this section should remain marked **proposed**, not converted into hidden assumptions in code.

---

## 6. Owner-described UI placement — confirmed intent, not hypothesis

### Evidence and confidence boundary

> **Step up in confidence from section 5:** This section records the owner's actual input. It is not another AI-generated layout proposal. For the order-detail page, the static visual placement comes from a screenshot of the **current app** and is therefore ground truth for what is visually present. The owner also confirmed that screen as satisfactory and wants it retained as the target. Interaction behavior not visible in the screenshot remains unconfirmed until separately described.

Section-local labels:

- **Confirmed — screenshot and owner-approved target:** Visually present in the current-app screenshot and explicitly accepted by the owner as the target.
- **Confirmed — owner intent:** Directly described or requested by the owner, even when it is an implementation/component-structure instruction rather than proof of current source code.
- **Observed from current code — not yet owner-confirmed:** Directly visible in the independently rebuilt app's current React components. This records implementation fact only. It must not be treated as approved placement or promoted to owner intent until the owner reviews it.
- **Owner expectation — not yet screen-specific:** The owner's expectation about likely scope or detail, not confirmation of a particular screen's layout.
- **Not yet described:** No owner placement or interaction description has been supplied. Do not fill the gap from section 5.

This section records the requested target without judging whether it is better than any other rendered layout. That comparison must wait until implementation can be viewed.

Current-code observations are included here only so the owner can review each unresolved screen against something concrete. They are annotations to the section, not confirmed owner-intent content within it.

#### Shared current-app shell — observed from current code, not yet owner-confirmed

The independently rebuilt app currently wraps every screen in the same `AppShell`:

- A normal-flow top header contains the `Thread & Stock` link.
- On narrow screens, the main navigation is fixed to the bottom of the viewport and contains **Orders**, **Inventory**, **Sales**, **Losses**, and **Reports** icon-and-text links. The main content includes extra bottom padding so this navigation does not cover it.
- At the `sm` breakpoint and above, that navigation moves into the top header and is no longer fixed.
- Page content is constrained to one centered maximum-width main region with horizontal padding.

This shell is an implementation observation shared by the screens below. It is not yet confirmed as the owner's desired persistent navigation placement.

### 6.1 Orders list page

**Owner-intent status: Not yet described or owner-confirmed.**

#### Current implementation — observed from code, not yet owner-confirmed

- **Region breakdown:** The page currently places a header region first, with the `Purchasing` eyebrow and `Orders` heading on the left and a **New order** trigger on the right. An inline order-form region conditionally appears directly below the header. An error region follows, then an order-list region containing linked cards or an empty state.
- **Element types:** **New order** is a button that changes to **Hide form** while the inline form is open. The form is a bordered card with supplier/country, order date, transportation fee, and expected bundle count fields; its actions are **Create order** and **Cancel**. Each saved order is one full-card navigation link containing supplier/country, an inline date-and-expected-bundle line, transportation fee, and an `ongoing` or `closed` badge.
- **State-driven behavior:** The form is absent initially and toggles inline. The list shows a dashed-border empty state when there are no orders and no load error. Order badges use warning treatment for `ongoing` and success treatment for `closed`.
- **Interaction notes:** Saving prepends the returned order to the current list and closes the form without a full-page reload. **Cancel** and **Hide form** close it. Selecting any part of an order card navigates to that order's detail route. A load failure appears above the list as an inline alert.
- **Responsive code structure:** The header and action may wrap. Order cards stack their content on narrow screens and switch to three columns at the `sm` breakpoint. The order form is one column on narrow screens and two columns at `sm`.
- **Source boundary:** These observations come from `OrdersPage.tsx` and `OrderForm.tsx`. They report the rebuild's current implementation only.

- **Section 5 cross-check:** Deferred until the owner describes this screen. Section 5.2 remains a hypothesis and must not be promoted into this section.

### 6.2 Order detail page

**Status: Confirmed — screenshot and owner-approved target.** The static layout below is locked in as the target for this page. Click outcomes and other behavior not visible in the screenshot are explicitly separated under **Interaction notes**.

#### Region breakdown

Regions appear in this vertical and reading order:

| Order | Region | Confirmed placement and content |
|---:|---|---|
| 1 | Back-navigation region | A standalone plain-text link, `← Back to orders`, above the order card. It is not inside the card. |
| 2 | Order-summary card | One bordered card. Its header block stacks the small muted eyebrow `Order YYYY-MM-DD` directly above the large bold supplier/country heading. The order-status pill occupies the card's top-right corner. |
| 3 | Order-info row | Inside the order card and below its header. Two same-weight muted label/value pairs appear inline, side by side: `Transportation fee: X.XX` and `Expected bundles: N`. They are not stacked. |
| 4 | Order-action row | Inside the order card and below the info row. **Edit order** and **Close order** are left-aligned. |
| 5 | Bundles-section header | Outside and below the order card. On the left, the small muted eyebrow `SHIPMENT UNITS` sits above the bold heading `Bundles`, mirroring the eyebrow-plus-heading pattern in the order card. **Add bundle** is right-aligned on the same section-header row. |
| 6 | Bundle-list region | Separate bordered bundle cards stack vertically below the section header with equal spacing. Each card repeats the same internal structure. |
| 7 | Bundle-card heading and status | The heading joins type and design name with a middot: `Type · Design name`. The bundle-status pill sits in the card's top-right corner. |
| 8 | Bundle-card info line | One inline line joins three values with middots: `N ordered · Cost X.XX each · Total Y.YY`. These values are not split into separate fields or rows. Total is computed for display as items ordered multiplied by cost per item. |
| 9 | Bundle-card action row | **Edit**, **Mark arrived**, and **Mark lost** appear left-aligned below the info line. |

No sticky or persistent viewport-attached region was described. All confirmed regions are part of the page's normal reading flow.

#### Element types and component boundaries

| Element | UI type and confirmed treatment |
|---|---|
| `← Back to orders` | Plain-text navigation link. |
| Order summary | Bordered entity-summary card. |
| `Order YYYY-MM-DD` and `SHIPMENT UNITS` | Small, muted eyebrow text. |
| Supplier/country and `Bundles` | Large/bold and bold section headings, respectively. |
| Order and bundle statuses | Reusable capsule badge/pill. The displayed value is mapped from status, including order values such as `ongoing` and `closed` and bundle values such as `pending`. The screenshot example shows amber/tan `ongoing` and `pending` pills. |
| Order info | Two-column inline metadata row with equal visual weight. |
| Bundle info | Single inline metadata line separated by middots. |
| **Edit order**, **Edit**, **Mark arrived** | Outline/white routine or secondary buttons. |
| **Close order**, **Add bundle** | Solid-black primary or forward-moving buttons. |
| **Mark lost** | Solid-red destructive button. It is the screen's only colored/non-black-white action. |
| Add-bundle surface | Centered modal dialog opened by **Add bundle**. It contains text inputs for `type` and `design_name`, integer inputs for `items_ordered` and `cost_per_item`, and one **Save Bundle** button. |
| Order and bundle cards | One shared card shape: eyebrow label when applicable, bold heading, top-right status pill, info line or lines, and an action slot. Implement this as a reusable card component rather than two independently designed card systems. |
| Status pills | One reusable status component whose text and color are derived from the status value. |

#### State-driven behavior

- The order-status pill reflects the order state (`ongoing` or `closed`); the screenshot's visible example is `ongoing`.
- The screenshot confirms the `pending` bundle-card state with **Edit**, **Mark arrived**, and **Mark lost** actions.
- The visual contents and action treatment for `arrived`, `lost`, `refunded`, or `replaced` bundle cards have not yet been described. Do not copy section 5's proposed read-only outcome summaries into this confirmed section.
- Multiple bundle records use the same repeated card structure and remain vertically stacked.
- The bundle total is display-only and updates from `items ordered × cost per item`; it is not a stored field and does not include transportation fee.

#### Interaction notes

- The screenshot confirms action triggers, not their post-click behavior.
- **Edit order:** Trigger placement and outline style are confirmed. Whether it opens inline content, a dialog, or a new route is not yet described.
- **Close order:** Trigger placement and solid-black style are confirmed. Confirmation behavior and the card's resulting closed-state actions are not yet described.
- **Add bundle:** Opens a centered modal dialog. The dialog contains `type` (text), `design_name` (text), `items_ordered` (integer), and `cost_per_item` (integer), with one **Save Bundle** button.
- **Save Bundle success:** The new bundle card appears immediately in the bundle-list region without a full-page reload, and the dialog closes automatically.
- **Edit bundle:** Trigger placement and outline style are confirmed. Its editing surface is not yet described.
- **Mark arrived** and **Mark lost:** Trigger placement and styling are confirmed. Their forms, confirmations, success behavior, and in-place card updates are not yet described.
- Animation for the newly added card is not yet described.
- Clear-and-refocus behavior, progress such as `1 of 2 bundles added`, and staying open or collapsing after the expected count is reached are deliberately not yet described. Do not implement those workflow details until the owner supplies them after reviewing the basic dialog behavior.

#### Current implementation variance — observed from code, not owner intent

- The current `OrderDetailPage.tsx` does **not** yet implement the confirmed Add Bundle dialog target. It conditionally inserts `BundleForm` inline between the bundles-section header and bundle-list region.
- The current inline form includes the four bundle fields, but its actions are **Add bundle** and **Cancel**, rather than the confirmed single **Save Bundle** action inside a centered modal.
- The current `cost_per_item` input accepts decimal increments (`step="0.01"`), whereas the confirmed dialog target above specifies an integer field.
- Current save behavior already appends the returned bundle to the end of the in-memory list without a full-page reload and then removes the inline form.
- The current edit-order form is also inserted inline between the order-summary card and bundles-section header. This is an implementation observation; the owner's desired edit-order interaction remains not yet described.
- These differences do not weaken or replace the confirmed target above. They identify implementation work for a later reconciliation step.

#### Confirmed visual hierarchy

- Outline/white denotes routine or secondary actions: **Edit order**, **Edit**, and **Mark arrived**.
- Solid black denotes a primary or forward-moving action: **Close order** and **Add bundle**.
- Solid red is reserved for the destructive/irreversible **Mark lost** action.
- This hierarchy is confirmed by the screenshot and confirms the matching part of section 5.4; it is no longer merely a proposal for this screen.

#### Implementation quality check, not a layout change

When this target is implemented, verify that the **Mark lost** button's red background and text combination meets WCAG AA contrast of at least `4.5:1` for normal-size text. This is an accessibility verification of the confirmed destructive treatment, not permission to revisit the layout or button hierarchy.

#### Section 5 cross-check — partial match, with corrected details

- **Matches:** Section 5.3 guessed a focused order-detail workspace with an order summary above bundle content. Section 5.4 guessed separate bundle cards showing type/design, status, ordered count, per-item cost, computed total, and lifecycle actions.
- **Confirms:** Section 5.4's hierarchy of lower-emphasis routine actions and destructive styling for **Mark lost** is confirmed by the screenshot.
- **Confirms:** Section 5.4's proposal that a saved bundle card appears immediately without a full-page reload is confirmed.
- **Contradicts:** Section 5.3 proposed a permanently visible bundle-entry section between the order summary and saved bundle cards. The confirmed target instead uses a right-aligned **Add bundle** trigger that opens a centered modal dialog.
- **Contradicts:** Section 5.3 proposed expected-bundle progress in the order summary. The confirmed card shows `Expected bundles: N`, with no progress counter visible.
- **Adds detail:** The screenshot supplies exact labels, card boundaries, eyebrow/heading structure, inline metadata composition, button order and visual weight, status-pill placement, middot separators, and equal vertical spacing between repeated bundle cards. The owner interaction description adds the dialog placement, field types, single save action, and automatic close after success.
- **Still unconfirmed:** Section 5.4's card animation, form clearing/refocusing, progress counter, and expected-count collapse behavior remain proposals only.
- **Precedence:** This section controls the order-detail target wherever it differs from section 5. The notes added to sections 5.3 and 5.4 preserve the earlier hypothesis rather than silently rewriting it.

### 6.3 Bundle arrival/loss interaction detail

**Owner-intent status: Not yet described or owner-confirmed.** Only the pending-card trigger placement and styling recorded in section 6.2 are owner-approved.

#### Current implementation — observed from code, not yet owner-confirmed

- **Region breakdown:** For a pending bundle, the action row appears inside the bundle card. Selecting **Mark arrived** inserts an arrival form inline inside that same card, below the action row. Arrival errors appear inside the form. A full-loss error appears at the bottom of the card.
- **Element types:** The arrival surface is an inline form with a pale green background, not a dialog or separate route. It contains **Items received**, **Arrival date**, and optional **Variant** fields, followed by **Confirm arrival** and **Cancel** buttons. **Mark lost** uses the browser's native confirmation dialog rather than a custom in-page confirmation component.
- **State-driven behavior:** Arrival initially sets items received to the bundle's ordered count, arrival date to today, and variant to empty. Items received is constrained from zero through the ordered count. Pending bundles show **Edit**, **Mark arrived**, and **Mark lost**; non-pending bundles show none of those actions. The current non-pending card keeps its original heading, cost/quantity line, and updated badge but adds no arrival/loss outcome summary.
- **Interaction notes — arrival:** Successful submission replaces that bundle in the page's in-memory list and closes the inline arrival form without a full-page reload. **Cancel** closes the form. While saving, **Confirm arrival** changes to **Receiving…** and is disabled.
- **Interaction notes — loss:** **Mark lost** asks `Mark this entire bundle as lost? This creates a permanent loss record.` If confirmed and successful, the card updates in place to the returned bundle state. Cancelling the browser confirmation makes no change.
- **Source boundary:** These observations come from `BundleCard.tsx` and `ArrivalForm.tsx`. They are not approval of the inline form, native confirmation, defaults, fields, or post-outcome card treatment.

- **Section 5 cross-check:** Deferred until the owner describes this interaction. Section 5.5 remains a hypothesis and must not fill these gaps.

### 6.4 Inventory pricing screen

**Owner-intent status: Not yet described or owner-confirmed.**

#### Current implementation — observed from code, not yet owner-confirmed

- **Region breakdown:** A header region places the `Selling units` eyebrow and `Inventory pricing` heading alongside a status filter. An alert region follows when needed, then a vertical inventory-card list or dashed-border empty state.
- **Element types:** The filter is a select with all statuses plus `in_stock`, `sold`, `damaged`, and `returned`. Each bordered item card contains item ID, bundle type/design, variant text, a status badge, a responsive price-summary grid, an action row, and an optional inline pricing form.
- **Card information:** The price summary shows fixed cost, marked, listed, target, and floor prices plus max discount. The fixed cost is visibly labeled `fixed`. The inline pricing form contains the five mutable guidance fields and repeats that cost cannot be changed.
- **State-driven behavior:** **Edit pricing** toggles to **Hide pricing form** and expands the form inside that item card. **Mark damaged** appears only for `in_stock` items. The list reloads from the API whenever the status filter changes.
- **Interaction notes:** Saving pricing updates that card in place and closes its form. **Cancel** closes it without saving. Marking damage uses a native irreversible-action confirmation; success updates the card in place. No bulk-pricing control is present in the current component.
- **Responsive code structure:** Price facts use two columns on narrow screens, three at `sm`, and six at `lg`. The five pricing inputs are one column on narrow screens, two at `sm`, and five at `lg`.
- **Source boundary:** These observations come from `InventoryPage.tsx`, `InventoryCard.tsx`, and `PricingForm.tsx`; none is owner-approved placement yet.

- **Section 5 cross-check:** Deferred until the owner describes this screen. Section 5.6 remains a hypothesis and must not be promoted into this section.

### 6.5 Sales screen

**Owner-intent status: Not yet described or owner-confirmed.**

#### Current implementation — observed from code, not yet owner-confirmed

- **Region breakdown:** The page currently places a `Sales ledger` eyebrow and `Record and review sales` heading first. A permanently visible sale-entry card follows, then an error region, then a vertical sales-card list or empty state.
- **Element types — sale entry:** The bordered form card starts with a text search and an in-stock item select. Selecting an item inserts a read-only reference panel for cost, marked, listed, target, and floor prices plus max discount. Sale date and selling price fields follow, then warning/error messages and a **Record sale** button.
- **Element types — ledger:** Each saved-sale card shows type, design, optional variant, sale date, cost context, a three-value grid for selling price/cost/profit, and an outline **Process return** button.
- **State-driven behavior:** Search filters the select options by type, design, or variant. The price-reference panel exists only after item selection. An amber warning appears when the entered discount exceeds the selected item's threshold but does not disable submission. The current list and selectable stock are both reloaded after a sale or return.
- **Interaction notes — sale:** Successful submission clears selected item and selling price, retains the search text and sale date, and refreshes both ledger and in-stock choices without a page reload. Server errors, including a floor-price block, appear inside the form.
- **Interaction notes — return:** **Process return** opens a native confirmation warning that the sale record will be permanently deleted. Confirmation calls the return operation and reloads the workspace.
- **Responsive code structure:** Search/select and sale date/price are one column on narrow screens and two columns from `sm`. Sale-card metrics use two columns on narrow screens and three from `sm`.
- **Source boundary:** These observations come from `SalesPage.tsx` and `SaleForm.tsx`; they do not confirm that the owner wants this form/list placement or return treatment.

- **Section 5 cross-check:** Deferred until the owner describes this screen. Section 5.7 remains a hypothesis and must not be promoted into this section.

### 6.6 Loss-recovery screen

**Owner-intent status: Not yet described or owner-confirmed.**

#### Current implementation — observed from code, not yet owner-confirmed

- **Region breakdown:** A `Transit history` eyebrow and `Loss entries` heading appear first, followed by an error region and then a vertical loss-card list or dashed-border empty state.
- **Element types:** Each bordered loss card shows bundle type/design and supplier, then a responsive detail grid containing loss type, items lost, loss value, loss date, and recovery status. Eligible cards add an outline **Record recovery** toggle and an optional inline recovery form beneath the immutable facts.
- **Recovery form:** The first region contains recovery-status, recovery-value, and recovery-date controls. Choosing `replaced` conditionally adds a nested bordered `New replacement bundle` region with type, design name, items ordered, and cost per item. **Save recovery** and **Cancel** appear last.
- **State-driven behavior:** **Record recovery** appears only for `none` or `pending_claim`; it changes to **Hide recovery form** while expanded. Final `refunded` or `replaced` cards expose no recovery action. The current summary shows recovery status but does not display recovery value or recovery date after final recovery.
- **Interaction notes:** Saving closes the inline form and reloads the full loss list. **Cancel** closes it without saving. Submission errors remain inside the form.
- **Responsive code structure:** Loss facts use two columns on narrow screens and three at `sm`. The main recovery fields become three columns at `sm`; replacement fields become two columns.
- **Source boundary:** These observations come from `LossEntriesPage.tsx` and `RecoveryForm.tsx`; they do not promote the current inline treatment or displayed fields to owner intent.

- **Section 5 cross-check:** Deferred until the owner describes this screen. Section 5.8 remains a hypothesis and must not be promoted into this section.

### 6.7 Reports screens

**Owner-intent status: Not yet described or owner-confirmed for the reports landing page or any individual report.**

**Owner expectation — not yet screen-specific:** Reports will probably need less detailed placement because they are expected to be more standard data displays. This is only an expectation about the likely level of description; it does not confirm placement for any particular report.

#### Current implementation — observed from code, not yet owner-confirmed

All current report routes are read-only displays. They share normal-flow page content inside `AppShell`, inline error alerts, and dashed-border loading or empty states where applicable.

| Screen | Current regions and element types | Current state and interactions |
|---|---|---|
| Reports landing | `Business insight` eyebrow, `Reports` heading, explanatory text, then six bordered navigation cards: Monthly P&L, Dead Stock, Fastest / Slowest Movers, Transit Loss, Discount Leakage, and Bundle Profitability. | Each whole card is a link with a title, description, and `Open report →`. Cards are one column on narrow screens and two at `sm`. |
| Monthly P&L | Reports eyebrow/title/description; month input and outline **Refresh**; one bordered metric card with item profit, transit losses, recoveries, transportation fees, and emphasized true monthly profit. | Defaults to the current month and reloads automatically when month changes. Profit is green unless negative, when it is red. **Refresh** reloads the same selected month. |
| Dead stock | Reports eyebrow/title; quick-threshold buttons for 30/60/90 days; custom-days field and **Apply**; result count; item cards or empty state. | Defaults to 60 days. Selecting a quick threshold reloads. Valid custom whole-day input updates the threshold; invalid input creates an inline report error. Each card shows type/design, optional variant, days in stock, cost, and listed price. |
| Fastest / slowest movers | Reports eyebrow/title/description; one outline sort-direction button; mover cards or empty state. | Defaults to fastest first. The button toggles between fastest-first and slowest-first client-side ordering. Cards show type/design, units sold, and average days to sell. |
| Transit loss | Reports eyebrow/title/description; optional loss-month input plus **This month** and **All time**; one summary metric card; loss-entry cards or empty state. | Changing month reloads automatically. Summary shows total loss, recovery, and emphasized net loss. Entry cards show identity/supplier, a loss-type badge, loss date, recovery status, loss/recovery values, and net loss; the report offers no editing actions. |
| Discount leakage | Reports eyebrow/title/description; month input and outline **Refresh**; three statistic cards. | Defaults to current month and reloads automatically when month changes. Cards show total leakage, sale count, and average discount per sale. |
| Bundle profitability | Reports eyebrow/title/description; four sort buttons; bundle cards or empty state. | Defaults to descending net. Selecting net, total profit, total loss, or units sold sorts by that field; selecting the active field reverses direction. Cards show identity/supplier, status badge, ordered/received, units sold, total profit/loss, and color-coded net. |

- **Source boundary:** These observations come from `ReportsPage.tsx`, the six report-page components, and shared report UI helpers. They document the rebuild's current report composition only.
- **Confirmation boundary:** The standard-looking nature of these displays and the owner's expectation of needing less placement detail do not amount to approval. Every report remains available for owner confirmation or requested change.
- **Section 5 cross-check:** No screen-placement proposal exists there for specific report pages beyond the broad journey statement in section 5.1. A report layout must not be inferred from that statement or from the page filenames in section 3.1.

---

## 7. Owner-approved product decisions — Session 3.5 handoff

### Decision status and implementation boundary

**Confirmed — owner decision:** The decisions below were made after reviewing the current-code observations in section 6 against the earlier proposals in section 5. They replace the corresponding open questions in section 5.10 and are the product target for later implementation sessions.

**No implementation in this session:** Session 3.5 changes product decisions and documentation only. It does not authorize hidden UI assumptions or imply that the current frontend or backend already matches every decision.

### 7.1 Orders list and post-creation transition

- **New order surface:** Treat **New order** as a creation action and present it in a focused dialog rather than the current inline-toggle form observed in section 6.1.
- **After successful creation:** Navigate directly to the new order's detail page. Do not remain on the Orders list.
- **Add Bundle state on arrival:** Leave the **Add bundle** dialog closed. The owner should first see and be able to verify the saved order summary.
- **Guidance:** Show a subtle bundle-progress hint such as `0 of 3 bundles added` and keep the confirmed **Add bundle** action prominent without forcing it open.

This keeps section 5.2's proposed navigation but rejects its suggestion to make the first bundle form immediately ready/open. It also replaces the current section 6.1 behavior of saving inline and remaining on the list.

### 7.2 Order detail and bundle creation

- **Confirmed card target remains authoritative:** Keep section 6.2's owner-approved order and bundle card hierarchy: eyebrow/heading, top-right status pill, compact info line or lines, and left-aligned action row.
- **Add Bundle surface:** Keep the confirmed centered dialog. Saving adds the new bundle card without a full-page reload and closes the dialog after every successful save.
- **Repeated entry:** Show progress in or near the dialog, for example `Bundle 1 of 3`. Keep the **Add bundle** trigger easy to reach after save so another bundle can be entered quickly, but do not automatically reopen the dialog.
- **Expected count semantics:** `expectedBundleCount` is guidance only, not a maximum. Continue showing progress after the expected count is reached and allow additional bundles without a warning, confirmation, or block.
- **Edit order:** Keep editing inline on the detail page. It is a low-frequency, context-dependent modification, so the order summary and bundle list should remain visible rather than being obscured by a dialog.

The exact mobile technique used to keep **Add bundle** reachable — stable section action, sticky action, or a post-save quick action — may be selected during implementation as long as it does not obscure content or change the workflow above.

### 7.3 Order closing

- **Pending bundles do not block closing:** Closing remains a deliberate owner decision even when one or more bundles are still `pending`.
- **Confirmation:** **Close order** opens a Radix confirmation dialog. When pending bundles exist, the dialog must state the count and identify those bundles before offering **Confirm Close**.
- **Closed appearance:** Update the order status pill to a neutral/gray closed treatment.
- **Closed actions:** Make **Add bundle** unavailable after closing by hiding or disabling it so the order reads as complete.

The later implementation session must verify that the rebuilt backend still permits this close operation; section 2.1 records the recovered old behavior, not proof of the rebuilt backend's current rule.

### 7.4 Bundle arrival and full loss

- **Arrival surface:** Keep **Mark arrived** as a spacious inline workspace inside the bundle card. Preserve the pale-green active treatment so it is visually distinct on mobile.
- **Why inline:** Arrival is a modification/verification task that benefits from keeping `itemsOrdered`, `costPerItem`, and the live shortfall/loss calculation visible beside the form.
- **Variant model:** Keep one optional shared Variant field. Copy that value to every inventory item generated by the arrival.
- **Mixed bundles:** The owner may leave Variant blank and assign variants to individual inventory items later. The Inventory workflow therefore needs per-item variant editing if the rebuilt app does not already provide it.
- **Zero received:** Arrival must require `itemsReceived >= 1`. A zero-receipt outcome must use **Mark lost**, producing bundle status `lost` and a `full_bundle` loss rather than an `arrived` bundle with a full-quantity partial loss.

The owner states that Stage 2 already changed the rebuilt backend to the zero-receipt rule above. A later implementation session should verify that behavior and align the frontend; section 2.2 remains an accurate record of the old app's different behavior.

### 7.5 Inventory pricing and inventory cards

- **Bulk pricing:** Add a bundle-scoped bulk-pricing action for `in_stock` items only.
- **Mutable fields:** The bulk action may update marked, listed, target, and floor prices plus maximum discount percent.
- **Safety boundary:** It must never update inherited `costPrice` or any `sold`, `damaged`, or `returned` item. Returned items must be reviewed and priced individually before resale.
- **Always-visible identity:** Keep item identity, bundle type/design, optional variant, status, and applicable actions visible.
- **Primary summary facts:** Add **Days in stock**, calculated from the bundle arrival date; make **Listed price** prominent; and show **Floor price** as a small `min` indicator.
- **Progressive disclosure:** Remove fixed cost, marked price, and target price from the main card summary. Keep those facts available in the inline pricing/detail workspace; fixed cost remains visibly immutable there.

### 7.6 Sales cards and returns

- **Always-visible sale facts:** Keep type/design, optional variant, sale date, selling price, raw profit, and the applicable return action.
- **Profit margin:** Show profit margin percentage beside raw profit, for example `Rs 200 (25%)`. Use one shared business definition for this percentage across the sales card and reports.
- **Cost context:** Do not repeat cost on the compact card when it adds clutter. Cost may remain available in the relevant detail/reference context.
- **History preservation:** Processing a return must not delete the sale. Keep the original sale row, mark it `returned`, retain return metadata on that record, nullify its active profit contribution, and restore the linked inventory item to `in_stock` so it can be sold again.
- **Reporting:** P&L and other sales reports must exclude or correctly offset returned sales so the preserved audit row does not remain active profit.

The owner states that Stage 2.5 already finalized this history-preserving backend model. Later work should verify and consume that implementation. Section 2.3 remains a historical description of the old app's permanent-delete behavior, while the current frontend behavior in section 6.5 must be replaced.

### 7.7 Loss-recovery cards

- **Always-visible context:** Keep bundle type/design, supplier, loss type, items lost, relevant event dates, and recovery status.
- **Primary financial figure:** Display `Net loss = loss value - recovery value` prominently. An unrecovered loss uses zero recovery value for this display calculation.
- **Recovery history:** Display recovery value and recovery date when a final recovery exists; do not show only the status as the current card does.
- **Replacement navigation:** When recovery status is `replaced`, show a link to the distinct replacement bundle.
- **Recovery editing:** Keep the recovery form inline beneath the immutable loss facts.

### 7.8 App-wide interaction policy

Use a deliberate mixed interaction model rather than forcing every action into one surface:

| Action category | Target interaction | Examples |
|---|---|---|
| Creation | Focused dialog | **New order**, **Add bundle** |
| Edit or modification needing visible context | Inline form/workspace | **Edit order**, arrival, pricing, recovery, other status-detail edits |
| Destructive or high-stakes single action | Lightweight confirmation | **Mark lost**, **Mark damaged**, **Process return**, **Close order** |

Radix AlertDialog is appropriate when the confirmation needs structured content, such as listing pending bundles before closing. A native browser confirmation remains acceptable for simple safety prompts, but it must not describe sale return as permanent deletion because returns now preserve history.

### 7.9 Card-information decision summary

| Screen/card | Information that remains visible without opening a detail/edit surface |
|---|---|
| Order | Section 6.2's confirmed eyebrow/date, supplier/country heading, status pill, transportation fee, expected bundle count, and action row; bundle progress may appear as subtle guidance. |
| Bundle | Section 6.2's confirmed type/design heading, status pill, `N ordered · Cost X.XX each · Total Y.YY` info line, and state-appropriate action row. Non-pending outcome summaries remain a separate design task and must not be invented from section 5. |
| Inventory | Item identity, type/design, optional variant, status, days in stock, prominent listed price, compact floor-price minimum, and applicable actions. |
| Sale | Type/design, optional variant, sale date, selling price, profit with margin percentage, return state/action where applicable. |
| Loss/recovery | Bundle identity, supplier, loss type, items lost, event dates, recovery status, prominent net loss, recovery facts when present, and replacement-bundle link when applicable. |

### 7.10 Implementation handoff by screen

1. **Orders:** Replace inline New order entry with a dialog; after save, navigate to detail with Add Bundle closed and progress visible.
2. **Order detail:** Preserve the confirmed section 6.2 layout; keep Edit order inline; add repeated-entry progress to Add Bundle; allow bundles beyond the expected count; make closing pending-aware; remove Add Bundle availability after close.
3. **Bundle arrival/loss:** Retain inline arrival; show live outcome context; keep one shared optional variant; reject zero arrival; route full non-arrival through Mark lost.
4. **Inventory:** Redesign compact card facts as approved; support per-item variant edits; add safe bundle-scoped pricing for `in_stock` items only.
5. **Sales:** Add margin percentage; simplify compact cost display; replace permanent-delete return behavior with the Stage 2.5 history-preserving return model.
6. **Loss recovery:** Keep recovery inline; show net loss and final recovery facts; link replacement recoveries to their new bundles.
7. **Reports/backend verification:** Confirm returned-sale P&L treatment, zero-arrival enforcement, close-order rules, days-in-stock source data, bulk-pricing status predicates, and replacement-bundle linkage before wiring UI assumptions to APIs.

These decisions settle all ten questions from section 5.10 plus the two additional inconsistencies identified from sections 2 and 6. They are ready to be handed to later backend-verification and frontend-implementation sessions without implementing changes in Session 3.5.

---
