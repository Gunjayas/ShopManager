import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import Fastify, { type FastifyInstance } from "fastify";
import { drizzle } from "drizzle-orm/node-sqlite";
import * as schema from "../db/schema.js";
import { registerRoutes } from "../routes.js";

let app: FastifyInstance;
let sqlite: DatabaseSync;

// Builds an isolated shop API so reconciliation rules are tested without touching shop.db.
async function createTestApp() {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec(`
    CREATE TABLE orders (
      order_id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_or_country TEXT NOT NULL,
      order_date TEXT NOT NULL,
      transportation_fee INTEGER NOT NULL DEFAULT 0,
      expected_bundle_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ongoing'
    );
    CREATE TABLE bundles (
      bundle_id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
      type TEXT NOT NULL,
      design_name TEXT NOT NULL,
      items_ordered INTEGER NOT NULL,
      cost_per_item INTEGER NOT NULL,
      bundle_total_cost INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      items_received INTEGER NOT NULL DEFAULT 0,
      arrival_date TEXT
    );
    CREATE TABLE inventory_items (
      item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id INTEGER NOT NULL REFERENCES bundles(bundle_id) ON DELETE RESTRICT,
      variant TEXT,
      cost_price INTEGER NOT NULL,
      marked_price INTEGER NOT NULL,
      listed_price INTEGER NOT NULL,
      target_price INTEGER NOT NULL,
      floor_price INTEGER NOT NULL,
      max_discount_percent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_stock'
    );
    CREATE TABLE sales (
      sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES inventory_items(item_id) ON DELETE RESTRICT,
      sale_date TEXT NOT NULL,
      selling_price INTEGER NOT NULL,
      profit INTEGER,
      original_listed_price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      returned_date TEXT
    );
    CREATE TABLE sale_price_corrections (
      correction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(sale_id) ON DELETE RESTRICT,
      old_selling_price INTEGER NOT NULL,
      new_selling_price INTEGER NOT NULL,
      corrected_at TEXT NOT NULL,
      reason TEXT
    );
    CREATE TABLE loss_entries (
      loss_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id INTEGER NOT NULL REFERENCES bundles(bundle_id) ON DELETE RESTRICT,
      loss_type TEXT NOT NULL,
      items_lost INTEGER NOT NULL,
      loss_value INTEGER NOT NULL,
      loss_date TEXT NOT NULL,
      recovery_status TEXT NOT NULL DEFAULT 'none',
      recovery_value INTEGER,
      recovery_date TEXT,
      replacement_bundle_id INTEGER REFERENCES bundles(bundle_id) ON DELETE RESTRICT
    );
  `);

  app = Fastify();
  const database = drizzle({ client: sqlite, schema });
  await registerRoutes(app, database);
  await app.ready();
}

// Seeds one pending bundle and returns its identifiers for focused route tests.
function seedPendingBundle() {
  const order = sqlite.prepare(`
    INSERT INTO orders (supplier_or_country, order_date, expected_bundle_count)
    VALUES ('Test supplier', '2026-08-01', 1)
  `).run();
  const bundle = sqlite.prepare(`
    INSERT INTO bundles (order_id, type, design_name, items_ordered, cost_per_item, bundle_total_cost)
    VALUES (?, 'Shirt', 'Test design', 3, 500, 1500)
  `).run(order.lastInsertRowid);
  return { orderId: Number(order.lastInsertRowid), bundleId: Number(bundle.lastInsertRowid) };
}

beforeEach(async () => {
  await createTestApp();
});

afterEach(async () => {
  await app.close();
  sqlite.close();
});

test("return preserves the sale audit row and restores the item", async () => {
  const { bundleId } = seedPendingBundle();
  const item = sqlite.prepare(`
    INSERT INTO inventory_items (
      bundle_id, cost_price, marked_price, listed_price, target_price, floor_price, status
    ) VALUES (?, 500, 900, 800, 750, 600, 'sold')
  `).run(bundleId);
  const sale = sqlite.prepare(`
    INSERT INTO sales (item_id, sale_date, selling_price, profit, original_listed_price)
    VALUES (?, '2026-08-02', 800, 300, 800)
  `).run(item.lastInsertRowid);

  const response = await app.inject({
    method: "POST",
    url: `/api/sales/${sale.lastInsertRowid}/return`,
    payload: { return_date: "2026-08-03" },
  });

  assert.equal(response.statusCode, 200);
  const preservedSale = sqlite.prepare(
    "SELECT status, returned_date, profit FROM sales WHERE sale_id = ?",
  ).get(sale.lastInsertRowid) as { status: string; returned_date: string; profit: number | null };
  const restoredItem = sqlite.prepare(
    "SELECT status FROM inventory_items WHERE item_id = ?",
  ).get(item.lastInsertRowid) as { status: string };
  const saleCount = sqlite.prepare("SELECT count(*) AS count FROM sales").get() as { count: number };

  assert.equal(preservedSale.status, "returned");
  assert.equal(preservedSale.returned_date, "2026-08-03");
  assert.equal(preservedSale.profit, null);
  assert.equal(restoredItem.status, "in_stock");
  assert.equal(saleCount.count, 1);
});

test("zero arrival records a full bundle loss without creating inventory", async () => {
  const { bundleId } = seedPendingBundle();

  const response = await app.inject({
    method: "POST",
    url: `/api/bundles/${bundleId}/arrive`,
    payload: { items_received: 0, arrival_date: "2026-08-04" },
  });

  assert.equal(response.statusCode, 200);
  const responseBody = response.json();
  assert.equal(responseBody.bundle.status, "lost");
  assert.equal(responseBody.loss.lossType, "full_bundle");
  assert.equal(responseBody.inventory_items_created, 0);

  const inventoryCount = sqlite.prepare(
    "SELECT count(*) AS count FROM inventory_items WHERE bundle_id = ?",
  ).get(bundleId) as { count: number };
  assert.equal(inventoryCount.count, 0);
});

test("closing remains allowed while bundles are pending", async () => {
  const { orderId, bundleId } = seedPendingBundle();

  const response = await app.inject({ method: "PATCH", url: `/api/orders/${orderId}/close` });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().order.status, "closed");
  const pendingBundle = sqlite.prepare(
    "SELECT status FROM bundles WHERE bundle_id = ?",
  ).get(bundleId) as { status: string };
  assert.equal(pendingBundle.status, "pending");
});

test("editing order facts does not change its lifecycle status", async () => {
  const { orderId } = seedPendingBundle();

  const response = await app.inject({
    method: "PATCH",
    url: `/api/orders/${orderId}`,
    payload: {
      supplier_or_country: "Updated supplier",
      order_date: "2026-08-05",
      transportation_fee: 250,
      expected_bundle_count: 4,
      status: "closed",
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().order.supplierOrCountry, "Updated supplier");
  assert.equal(response.json().order.status, "ongoing");
});

test("partial arrival copies one shared variant to every generated item", async () => {
  const { bundleId } = seedPendingBundle();

  const response = await app.inject({
    method: "POST",
    url: `/api/bundles/${bundleId}/arrive`,
    payload: { items_received: 2, arrival_date: "2026-08-06", variant: "  Blue / M  " },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().bundle.status, "arrived");
  assert.equal(response.json().loss.itemsLost, 1);
  const generatedItems = sqlite.prepare(
    "SELECT variant FROM inventory_items WHERE bundle_id = ? ORDER BY item_id",
  ).all(bundleId) as Array<{ variant: string | null }>;
  assert.deepEqual(generatedItems.map((item) => item.variant), ["Blue / M", "Blue / M"]);
});

test("bulk pricing changes only in-stock guidance and never inherited cost", async () => {
  const { bundleId } = seedPendingBundle();
  const insertItem = sqlite.prepare(`
    INSERT INTO inventory_items (
      bundle_id, variant, cost_price, marked_price, listed_price, target_price,
      floor_price, max_discount_percent, status
    ) VALUES (?, ?, 500, 600, 600, 600, 550, 5, ?)
  `);
  const inStockItem = insertItem.run(bundleId, "Stock", "in_stock");
  insertItem.run(bundleId, "Sold", "sold");
  insertItem.run(bundleId, "Damaged", "damaged");
  insertItem.run(bundleId, "Returned", "returned");

  const response = await app.inject({
    method: "POST",
    url: `/api/bundles/${bundleId}/bulk-price`,
    payload: { marked_price: 1000, listed_price: 900, target_price: 850, floor_price: 700, max_discount_percent: 10, cost_price: 1 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().updated_count, 1);
  const itemRows = sqlite.prepare(
    "SELECT item_id, variant, cost_price, listed_price FROM inventory_items WHERE bundle_id = ? ORDER BY item_id",
  ).all(bundleId) as Array<{ item_id: number; variant: string; cost_price: number; listed_price: number }>;
  assert.equal(itemRows.find((item) => item.item_id === Number(inStockItem.lastInsertRowid))?.listed_price, 900);
  assert.ok(itemRows.every((item) => item.cost_price === 500));
  assert.deepEqual(itemRows.slice(1).map((item) => item.listed_price), [600, 600, 600]);
});

test("item detail update trims variant and leaves inherited cost unchanged", async () => {
  const { bundleId } = seedPendingBundle();
  const item = sqlite.prepare(`
    INSERT INTO inventory_items (
      bundle_id, cost_price, marked_price, listed_price, target_price, floor_price, status
    ) VALUES (?, 500, 600, 600, 600, 550, 'in_stock')
  `).run(bundleId);

  const response = await app.inject({
    method: "PATCH",
    url: `/api/items/${item.lastInsertRowid}`,
    payload: { variant: "  Green / L ", listed_price: 950, cost_price: 1 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().item.variant, "Green / L");
  assert.equal(response.json().item.listedPrice, 950);
  assert.equal(response.json().item.costPrice, 500);
});

test("bundle profitability excludes returned sale profit and revenue", async () => {
  const { bundleId } = seedPendingBundle();
  const insertItem = sqlite.prepare(`
    INSERT INTO inventory_items (
      bundle_id, cost_price, marked_price, listed_price, target_price, floor_price, status
    ) VALUES (?, 500, 800, 800, 750, 600, 'sold')
  `);
  const activeItem = insertItem.run(bundleId);
  const returnedItem = insertItem.run(bundleId);
  sqlite.prepare(`
    INSERT INTO sales (item_id, sale_date, selling_price, profit, original_listed_price, status)
    VALUES (?, '2026-08-07', 800, 300, 800, 'active'),
           (?, '2026-08-07', 900, NULL, 900, 'returned')
  `).run(activeItem.lastInsertRowid, returnedItem.lastInsertRowid);

  const response = await app.inject({ method: "GET", url: "/api/reports/bundle-profitability" });

  assert.equal(response.statusCode, 200);
  const bundleReport = response.json().bundles.find((bundle: { bundleId: number }) => bundle.bundleId === bundleId);
  assert.equal(bundleReport.itemProfit, 300);
  assert.equal(bundleReport.salesRevenue, 800);
});

test("final replacement recovery remains visible with history and bundle linkage", async () => {
  const { bundleId } = seedPendingBundle();
  const loss = sqlite.prepare(`
    INSERT INTO loss_entries (bundle_id, loss_type, items_lost, loss_value, loss_date)
    VALUES (?, 'full_bundle', 3, 1500, '2026-08-08')
  `).run(bundleId);

  const recoveryResponse = await app.inject({
    method: "PATCH",
    url: `/api/losses/${loss.lastInsertRowid}/recover`,
    payload: { recovery_status: "replaced", recovery_value: 1200, recovery_date: "2026-08-09" },
  });
  assert.equal(recoveryResponse.statusCode, 200);

  const listResponse = await app.inject({ method: "GET", url: "/api/losses" });
  const recoveredLoss = listResponse.json().losses.find((entry: { lossId: number }) => entry.lossId === Number(loss.lastInsertRowid));
  assert.equal(recoveredLoss.recoveryStatus, "replaced");
  assert.equal(recoveredLoss.recoveryValue, 1200);
  assert.equal(recoveredLoss.recoveryDate, "2026-08-09");
  assert.equal(recoveredLoss.replacementBundleId, recoveryResponse.json().replacement_bundle.bundleId);
  assert.equal(recoveredLoss.supplierOrCountry, "Test supplier");
});

test("movers counts only active sales and ignores returned audit rows", async () => {
  const { bundleId } = seedPendingBundle();
  sqlite.prepare("UPDATE bundles SET arrival_date = '2026-08-01' WHERE bundle_id = ?").run(bundleId);
  const insertItem = sqlite.prepare(`
    INSERT INTO inventory_items (
      bundle_id, cost_price, marked_price, listed_price, target_price, floor_price, status
    ) VALUES (?, 500, 800, 800, 750, 600, 'sold')
  `);
  const activeItem = insertItem.run(bundleId);
  const returnedItem = insertItem.run(bundleId);
  sqlite.prepare(`
    INSERT INTO sales (item_id, sale_date, selling_price, profit, original_listed_price, status)
    VALUES (?, '2026-08-05', 800, 300, 800, 'active'),
           (?, '2026-08-03', 800, NULL, 800, 'returned')
  `).run(activeItem.lastInsertRowid, returnedItem.lastInsertRowid);

  const response = await app.inject({ method: "GET", url: "/api/reports/movers" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().movers[0].unitsSold, 1);
  assert.equal(response.json().movers[0].averageDaysToSell, 4);
});