import { desc, eq, inArray } from "drizzle-orm";
import { bundles, inventoryItems, lossEntries, orders } from "../db/schema.js";
import type { RouteRegistrar } from "./types.js";

// Registers read-only catalog endpoints needed by the local shop interface.
export const registerCatalogRoutes: RouteRegistrar = async (app, database) => {
  // Lists recent orders so intake forms can attach new bundles to an existing purchase.
  app.get("/api/orders", async () => {
    const orderRows = await database.select().from(orders).orderBy(desc(orders.orderDate), desc(orders.orderId));
    return { orders: orderRows };
  });

  // Lists bundles with order context for intake, pricing, and bundle browsing.
  app.get("/api/bundles", async () => {
    const bundleRows = await database.select({
      bundleId: bundles.bundleId,
      orderId: bundles.orderId,
      type: bundles.type,
      designName: bundles.designName,
      itemsOrdered: bundles.itemsOrdered,
      costPerItem: bundles.costPerItem,
      bundleTotalCost: bundles.bundleTotalCost,
      status: bundles.status,
      itemsReceived: bundles.itemsReceived,
      arrivalDate: bundles.arrivalDate,
      supplierOrCountry: orders.supplierOrCountry,
    }).from(bundles).innerJoin(orders, eq(bundles.orderId, orders.orderId))
      .orderBy(desc(bundles.bundleId));
    return { bundles: bundleRows };
  });

  // Lists inventory with bundle labels so staff can identify items without memorizing bundle IDs.
  app.get("/api/items", async () => {
    const itemRows = await database.select({
      itemId: inventoryItems.itemId,
      bundleId: inventoryItems.bundleId,
      variant: inventoryItems.variant,
      costPrice: inventoryItems.costPrice,
      markedPrice: inventoryItems.markedPrice,
      listedPrice: inventoryItems.listedPrice,
      targetPrice: inventoryItems.targetPrice,
      floorPrice: inventoryItems.floorPrice,
      maxDiscountPercent: inventoryItems.maxDiscountPercent,
      status: inventoryItems.status,
      bundleType: bundles.type,
      designName: bundles.designName,
    }).from(inventoryItems).innerJoin(bundles, eq(inventoryItems.bundleId, bundles.bundleId))
      .orderBy(desc(inventoryItems.itemId));
    return { items: itemRows };
  });

  // Lists actionable loss claims while preserving finalized losses for historical reports.
  app.get("/api/losses", async () => {
    const lossRows = await database.select({
      lossId: lossEntries.lossId,
      bundleId: lossEntries.bundleId,
      lossType: lossEntries.lossType,
      itemsLost: lossEntries.itemsLost,
      lossValue: lossEntries.lossValue,
      lossDate: lossEntries.lossDate,
      recoveryStatus: lossEntries.recoveryStatus,
      recoveryValue: lossEntries.recoveryValue,
      recoveryDate: lossEntries.recoveryDate,
      replacementBundleId: lossEntries.replacementBundleId,
      bundleType: bundles.type,
      designName: bundles.designName,
    }).from(lossEntries).innerJoin(bundles, eq(lossEntries.bundleId, bundles.bundleId))
      .where(inArray(lossEntries.recoveryStatus, ["none", "pending_claim"]))
      .orderBy(desc(lossEntries.lossDate), desc(lossEntries.lossId));
    return { losses: lossRows };
  });
};