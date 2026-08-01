import { desc, eq } from "drizzle-orm";
import {
  bundles,
  inventoryItems,
  inventoryItemStatuses,
  lossEntries,
  orders,
  sales,
} from "../db/schema.js";
import { ApiError, parseId } from "./http.js";
import type { RouteRegistrar } from "./types.js";

type InventoryItemStatus = (typeof inventoryItemStatuses)[number];

// Registers read-only catalog endpoints needed by the local shop interface.
export const registerCatalogRoutes: RouteRegistrar = async (app, database) => {
  // Lists recent orders so intake forms can attach new bundles to an existing purchase.
  app.get("/api/orders", async () => {
    const orderRows = await database.select().from(orders).orderBy(desc(orders.orderDate), desc(orders.orderId));
    return { orders: orderRows };
  });

  // Retrieves one purchase order so operational screens can load its settled details.
  app.get<{ Params: { id: string } }>("/api/orders/:id", async (request) => {
    const orderId = parseId(request.params.id, "order id");
    const [order] = await database.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
    if (!order) throw new ApiError(404, "Order not found", "The requested order does not exist.");
    return { order };
  });

  // Lists one order's bundles after confirming that the parent purchase exists.
  app.get<{ Params: { id: string } }>("/api/orders/:id/bundles", async (request) => {
    const orderId = parseId(request.params.id, "order id");
    const [order] = await database.select({ orderId: orders.orderId }).from(orders)
      .where(eq(orders.orderId, orderId)).limit(1);
    if (!order) throw new ApiError(404, "Order not found", "The requested order does not exist.");

    const bundleRows = await database.select().from(bundles)
      .where(eq(bundles.orderId, orderId)).orderBy(desc(bundles.bundleId));
    return { bundles: bundleRows };
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
  app.get<{ Querystring: { status?: string } }>("/api/items", async (request) => {
    const requestedStatus = request.query.status;
    if (requestedStatus !== undefined && !inventoryItemStatuses.includes(requestedStatus as InventoryItemStatus)) {
      throw new ApiError(400, "Invalid item status", `status must be one of: ${inventoryItemStatuses.join(", ")}.`);
    }
    const itemStatus = requestedStatus as InventoryItemStatus | undefined;

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
      arrivalDate: bundles.arrivalDate,
    }).from(inventoryItems).innerJoin(bundles, eq(inventoryItems.bundleId, bundles.bundleId))
      .where(itemStatus ? eq(inventoryItems.status, itemStatus) : undefined)
      .orderBy(desc(inventoryItems.itemId));
    return { items: itemRows };
  });

  // Lists sales newest-first with item and bundle context for operational history.
  app.get("/api/sales", async () => {
    const saleRows = await database.select({
      saleId: sales.saleId,
      itemId: sales.itemId,
      saleDate: sales.saleDate,
      sellingPrice: sales.sellingPrice,
      profit: sales.profit,
      originalListedPrice: sales.originalListedPrice,
      status: sales.status,
      returnedDate: sales.returnedDate,
      bundleId: inventoryItems.bundleId,
      variant: inventoryItems.variant,
      bundleType: bundles.type,
      designName: bundles.designName,
    }).from(sales).innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.itemId))
      .innerJoin(bundles, eq(inventoryItems.bundleId, bundles.bundleId))
      .orderBy(desc(sales.saleDate), desc(sales.saleId));
    return { sales: saleRows };
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
      orderId: bundles.orderId,
      bundleType: bundles.type,
      designName: bundles.designName,
      supplierOrCountry: orders.supplierOrCountry,
    }).from(lossEntries).innerJoin(bundles, eq(lossEntries.bundleId, bundles.bundleId))
      .innerJoin(orders, eq(bundles.orderId, orders.orderId))
      .orderBy(desc(lossEntries.lossDate), desc(lossEntries.lossId));
    return { losses: lossRows };
  });
};