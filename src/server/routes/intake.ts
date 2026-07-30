import { eq } from "drizzle-orm";
import { bundles, inventoryItems, lossEntries, orders } from "../db/schema.js";
import { parseDate } from "./dates.js";
import {
  ApiError,
  parseId,
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireText,
} from "./http.js";
import type { RouteRegistrar } from "./types.js";

type OrderBody = {
  supplier_or_country?: string;
  order_date?: string;
  transportation_fee?: number;
  expected_bundle_count?: number;
};

type BundleBody = {
  type?: string;
  design_name?: string;
  items_ordered?: number;
  cost_per_item?: number;
};

type ArrivalBody = { items_received?: number; arrival_date?: string };

// Registers order, bundle, and arrival workflows that turn received goods into sellable items.
export const registerIntakeRoutes: RouteRegistrar = async (app, database) => {
  // Creates an order while preserving transportation fee as one order-level expense.
  app.post<{ Body: OrderBody }>("/api/orders", async (request, reply) => {
    const body = request.body ?? {};
    const [createdOrder] = await database.insert(orders).values({
      supplierOrCountry: requireText(body.supplier_or_country, "supplier_or_country"),
      orderDate: parseDate(body.order_date, "order_date"),
      transportationFee: requireNonNegativeInteger(body.transportation_fee ?? 0, "transportation_fee"),
      expectedBundleCount: requirePositiveInteger(body.expected_bundle_count, "expected_bundle_count"),
    }).returning();

    return reply.status(201).send({ order: createdOrder });
  });

  // Adds one purchase bundle and stores item cost separately from order transportation expense.
  app.post<{ Params: { id: string }; Body: BundleBody }>("/api/orders/:id/bundles", async (request, reply) => {
    const orderId = parseId(request.params.id, "order id");
    const [existingOrder] = await database.select({ orderId: orders.orderId }).from(orders).where(eq(orders.orderId, orderId)).limit(1);
    if (!existingOrder) throw new ApiError(404, "Order not found", "The requested order does not exist.");

    const body = request.body ?? {};
    const itemsOrdered = requirePositiveInteger(body.items_ordered, "items_ordered");
    const costPerItem = requireNonNegativeInteger(body.cost_per_item, "cost_per_item");
    const [createdBundle] = await database.insert(bundles).values({
      orderId,
      type: requireText(body.type, "type"),
      designName: requireText(body.design_name, "design_name"),
      itemsOrdered,
      costPerItem,
      bundleTotalCost: itemsOrdered * costPerItem,
    }).returning();

    return reply.status(201).send({ bundle: createdBundle });
  });

  // Finalizes a pending arrival, records transit loss, and creates items only for units received.
  app.post<{ Params: { id: string }; Body: ArrivalBody }>("/api/bundles/:id/arrive", async (request, reply) => {
    const bundleId = parseId(request.params.id, "bundle id");
    const body = request.body ?? {};
    const itemsReceived = requireNonNegativeInteger(body.items_received, "items_received");
    const arrivalDate = parseDate(body.arrival_date, "arrival_date", true);

    const arrivalResult = database.transaction((transaction) => {
      const bundleToReceive = transaction.select().from(bundles).where(eq(bundles.bundleId, bundleId)).limit(1).get();
      if (!bundleToReceive) throw new ApiError(404, "Bundle not found", "The requested bundle does not exist.");
      if (bundleToReceive.status !== "pending") {
        throw new ApiError(409, "Arrival already recorded", "Only a pending bundle can be marked as arrived or lost.");
      }
      if (itemsReceived > bundleToReceive.itemsOrdered) {
        throw new ApiError(400, "Invalid arrival", "items_received cannot exceed items_ordered.");
      }

      const bundleStatus = itemsReceived === 0 ? "lost" : "arrived";
      const updatedBundle = transaction.update(bundles).set({
        itemsReceived,
        status: bundleStatus,
        arrivalDate,
      }).where(eq(bundles.bundleId, bundleId)).returning().get();

      const itemsLost = bundleToReceive.itemsOrdered - itemsReceived;
      let createdLoss = null;
      if (itemsLost > 0) {
        createdLoss = transaction.insert(lossEntries).values({
          bundleId,
          lossType: itemsReceived === 0 ? "full_bundle" : "partial",
          itemsLost,
          lossValue: itemsLost * bundleToReceive.costPerItem,
          lossDate: arrivalDate,
        }).returning().get();
      }

      if (itemsReceived > 0) {
        const receivedItems = Array.from({ length: itemsReceived }, () => ({
          bundleId,
          costPrice: bundleToReceive.costPerItem,
          markedPrice: bundleToReceive.costPerItem,
          listedPrice: bundleToReceive.costPerItem,
          targetPrice: bundleToReceive.costPerItem,
          floorPrice: bundleToReceive.costPerItem,
        }));
        transaction.insert(inventoryItems).values(receivedItems).run();
      }

      return { bundle: updatedBundle, loss: createdLoss, inventory_items_created: itemsReceived };
    });

    return reply.status(200).send(arrivalResult);
  });
};
