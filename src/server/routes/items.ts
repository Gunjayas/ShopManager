import { and, eq } from "drizzle-orm";
import { bundles, inventoryItems } from "../db/schema.js";
import { ApiError, parseId } from "./http.js";
import { parsePricing, type PricingInput } from "./pricing.js";
import type { RouteRegistrar } from "./types.js";

// Registers item pricing, bundle pricing, and stock-removal workflows.
export const registerItemRoutes: RouteRegistrar = async (app, database) => {
  // Changes customer-facing prices while deliberately excluding immutable cost_price.
  app.patch<{ Params: { id: string }; Body: PricingInput }>("/api/items/:id/pricing", async (request) => {
    const itemId = parseId(request.params.id, "item id");
    const [updatedItem] = await database.update(inventoryItems).set(parsePricing(request.body ?? {}))
      .where(eq(inventoryItems.itemId, itemId)).returning();
    if (!updatedItem) throw new ApiError(404, "Item not found", "The requested inventory item does not exist.");
    return { item: updatedItem };
  });

  // Applies consistent prices only to unsold stock belonging to the requested bundle.
  app.post<{ Params: { id: string }; Body: PricingInput }>("/api/bundles/:id/bulk-price", async (request) => {
    const bundleId = parseId(request.params.id, "bundle id");
    const [existingBundle] = await database.select({ bundleId: bundles.bundleId }).from(bundles).where(eq(bundles.bundleId, bundleId)).limit(1);
    if (!existingBundle) throw new ApiError(404, "Bundle not found", "The requested bundle does not exist.");

    const updatedItems = await database.update(inventoryItems).set(parsePricing(request.body ?? {})).where(
      and(eq(inventoryItems.bundleId, bundleId), eq(inventoryItems.status, "in_stock")),
    ).returning();
    return { updated_count: updatedItems.length, items: updatedItems };
  });

  // Removes a physically damaged item from sellable stock without deleting its history.
  app.post<{ Params: { id: string } }>("/api/items/:id/damage", async (request) => {
    const itemId = parseId(request.params.id, "item id");
    const [damagedItem] = await database.update(inventoryItems).set({ status: "damaged" }).where(
      and(eq(inventoryItems.itemId, itemId), eq(inventoryItems.status, "in_stock")),
    ).returning();
    if (!damagedItem) {
      const [existingItem] = await database.select({ status: inventoryItems.status }).from(inventoryItems).where(eq(inventoryItems.itemId, itemId)).limit(1);
      if (!existingItem) throw new ApiError(404, "Item not found", "The requested inventory item does not exist.");
      throw new ApiError(409, "Damage blocked", `An item with status '${existingItem.status}' cannot be marked damaged.`);
    }
    return { item: damagedItem };
  });
};
