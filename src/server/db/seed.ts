import { eq } from "drizzle-orm";
import { openDatabase } from "./connection.js";
import { bundles, inventoryItems, orders, sales } from "./schema.js";

const seedReference = `FK seed ${new Date().toISOString()}`;

// Proves SQLite rejects a child record that points to an order that does not exist.
function verifyForeignKeyRejection(sqlite: ReturnType<typeof openDatabase>["sqlite"]) {
  const invalidBundle = sqlite.prepare(`
    INSERT INTO bundles (
      order_id,
      type,
      design_name,
      items_ordered,
      cost_per_item,
      bundle_total_cost
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    invalidBundle.run(999_999_999, "test", "Invalid FK test", 1, 1, 1);
  } catch {
    return;
  }

  throw new Error("SQLite accepted an invalid bundle-to-order foreign key.");
}

// Inserts one complete purchase-to-sale chain and verifies every foreign-key link.
function seedForeignKeyChain() {
  const { database, sqlite } = openDatabase();

  try {
    const insertedRecords = database.transaction((transaction) => {
      const [createdOrder] = transaction
        .insert(orders)
        .values({
          supplierOrCountry: seedReference,
          orderDate: "2026-07-29",
          transportationFee: 2_000,
          expectedBundleCount: 1,
          status: "closed",
        })
        .returning({ orderId: orders.orderId })
        .all();

      if (!createdOrder) throw new Error("The seed order was not created.");

      const [createdBundle] = transaction
        .insert(bundles)
        .values({
          orderId: createdOrder.orderId,
          type: "shirt",
          designName: "FK verification design",
          itemsOrdered: 1,
          costPerItem: 50_000,
          bundleTotalCost: 50_000,
          status: "arrived",
          itemsReceived: 1,
          arrivalDate: "2026-07-29",
        })
        .returning({ bundleId: bundles.bundleId })
        .all();

      if (!createdBundle) throw new Error("The seed bundle was not created.");

      const [createdItem] = transaction
        .insert(inventoryItems)
        .values({
          bundleId: createdBundle.bundleId,
          variant: "Blue / M",
          costPrice: 50_000,
          markedPrice: 80_000,
          listedPrice: 75_000,
          targetPrice: 70_000,
          floorPrice: 60_000,
          maxDiscountPercent: 20,
          status: "sold",
        })
        .returning({ itemId: inventoryItems.itemId })
        .all();

      if (!createdItem) throw new Error("The seed inventory item was not created.");

      const [createdSale] = transaction
        .insert(sales)
        .values({
          itemId: createdItem.itemId,
          saleDate: "2026-07-29",
          sellingPrice: 70_000,
          profit: 20_000,
          originalListedPrice: 75_000,
        })
        .returning({ saleId: sales.saleId })
        .all();

      if (!createdSale) throw new Error("The seed sale was not created.");

      return { ...createdOrder, ...createdBundle, ...createdItem, ...createdSale };
    });

    const linkedSale = database
      .select({
        saleId: sales.saleId,
        itemId: inventoryItems.itemId,
        bundleId: bundles.bundleId,
        orderId: orders.orderId,
      })
      .from(sales)
      .innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.itemId))
      .innerJoin(bundles, eq(inventoryItems.bundleId, bundles.bundleId))
      .innerJoin(orders, eq(bundles.orderId, orders.orderId))
      .where(eq(sales.saleId, insertedRecords.saleId))
      .get();

    if (!linkedSale) throw new Error("The seeded foreign-key chain could not be read back.");

    verifyForeignKeyRejection(sqlite);
    console.log("Seed completed and all foreign-key links were verified:", linkedSale);
  } finally {
    sqlite.close();
  }
}

try {
  seedForeignKeyChain();
} catch (seedError) {
  console.error("Seed failed. Run the migrations before retrying.");
  console.error(seedError);
  process.exitCode = 1;
}