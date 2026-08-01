import { and, eq } from "drizzle-orm";
import { inventoryItems, salePriceCorrections, sales } from "../db/schema.js";
import { parseDate } from "./dates.js";
import { ApiError, parseId, requireNonNegativeInteger } from "./http.js";
import type { RouteRegistrar } from "./types.js";

type SaleBody = { item_id?: number; sale_date?: string; selling_price?: number };
type ReturnBody = { return_date?: string };
type CorrectionBody = { selling_price?: number; corrected_at?: string; reason?: string };

// Calculates the customer discount against the price captured when the sale happens.
function calculateDiscountPercent(listedPrice: number, sellingPrice: number) {
  if (listedPrice <= 0 || sellingPrice >= listedPrice) return 0;
  return ((listedPrice - sellingPrice) / listedPrice) * 100;
}

// Registers sale, return, and correction workflows while preserving financial history.
export const registerSaleRoutes: RouteRegistrar = async (app, database) => {
  // Sells one in-stock item, blocks floor-price violations, and reports discount warnings.
  app.post<{ Body: SaleBody }>("/api/sales", async (request, reply) => {
    const body = request.body ?? {};
    const itemId = requireNonNegativeInteger(body.item_id, "item_id");
    if (itemId === 0) throw new ApiError(400, "Invalid request", "item_id must be greater than zero.");
    const sellingPrice = requireNonNegativeInteger(body.selling_price, "selling_price");
    const saleDate = parseDate(body.sale_date, "sale_date", true);

    const saleResult = database.transaction((transaction) => {
      const itemToSell = transaction.select().from(inventoryItems).where(eq(inventoryItems.itemId, itemId)).limit(1).get();
      if (!itemToSell) throw new ApiError(404, "Item not found", "The requested inventory item does not exist.");
      if (itemToSell.status !== "in_stock") {
        throw new ApiError(409, "Sale blocked", `An item with status '${itemToSell.status}' cannot be sold.`);
      }
      if (sellingPrice < itemToSell.floorPrice) {
        throw new ApiError(422, "Sale blocked", `Selling price (Rs ${sellingPrice}) is below the floor price (Rs ${itemToSell.floorPrice}).`);
      }

      const createdSale = transaction.insert(sales).values({
        itemId,
        saleDate,
        sellingPrice,
        profit: sellingPrice - itemToSell.costPrice,
        originalListedPrice: itemToSell.listedPrice,
      }).returning().get();
      transaction.update(inventoryItems).set({ status: "sold" }).where(
        and(eq(inventoryItems.itemId, itemId), eq(inventoryItems.status, "in_stock")),
      ).run();

      const discountPercent = calculateDiscountPercent(itemToSell.listedPrice, sellingPrice);
      return {
        sale: createdSale,
        warning: discountPercent > itemToSell.maxDiscountPercent,
        discount_percent: Number(discountPercent.toFixed(2)),
        max_discount_percent: itemToSell.maxDiscountPercent,
      };
    });

    return reply.status(201).send(saleResult);
  });

  // Reverses an active sale while preserving its history and restocking the physical item.
  app.post<{ Params: { id: string }; Body: ReturnBody }>("/api/sales/:id/return", async (request) => {
    const saleId = parseId(request.params.id, "sale id");
    const returnDate = parseDate(request.body?.return_date, "return_date", true);
    return database.transaction((transaction) => {
      const saleToReturn = transaction.select().from(sales).where(eq(sales.saleId, saleId)).limit(1).get();
      if (!saleToReturn) throw new ApiError(404, "Sale not found", "The requested sale does not exist.");
      if (saleToReturn.status === "returned") throw new ApiError(409, "Return already recorded", "This sale has already been returned.");

      const returnedSale = transaction.update(sales).set({
        status: "returned",
        returnedDate: returnDate,
        profit: null,
      }).where(eq(sales.saleId, saleId)).returning().get();
      const returnedItem = transaction.update(inventoryItems).set({ status: "in_stock" })
        .where(eq(inventoryItems.itemId, saleToReturn.itemId)).returning().get();
      return { sale: returnedSale, item: returnedItem };
    });
  });

  // Corrects an active sale price and appends an immutable old-versus-new audit event.
  app.post<{ Params: { id: string }; Body: CorrectionBody }>("/api/sales/:id/correct-price", async (request) => {
    const saleId = parseId(request.params.id, "sale id");
    const body = request.body ?? {};
    const newSellingPrice = requireNonNegativeInteger(body.selling_price, "selling_price");
    const correctedAt = parseDate(body.corrected_at, "corrected_at", true);

    return database.transaction((transaction) => {
      const saleToCorrect = transaction.select({
        saleId: sales.saleId,
        itemId: sales.itemId,
        sellingPrice: sales.sellingPrice,
        status: sales.status,
        floorPrice: inventoryItems.floorPrice,
        costPrice: inventoryItems.costPrice,
      }).from(sales).innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.itemId))
        .where(eq(sales.saleId, saleId)).limit(1).get();
      if (!saleToCorrect) throw new ApiError(404, "Sale not found", "The requested sale does not exist.");
      if (saleToCorrect.status === "returned") throw new ApiError(409, "Correction blocked", "A returned sale price cannot be corrected.");
      if (newSellingPrice < saleToCorrect.floorPrice) {
        throw new ApiError(422, "Correction blocked", `Selling price (Rs ${newSellingPrice}) is below the floor price (Rs ${saleToCorrect.floorPrice}).`);
      }

      const audit = transaction.insert(salePriceCorrections).values({
        saleId,
        oldSellingPrice: saleToCorrect.sellingPrice,
        newSellingPrice,
        correctedAt,
        reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
      }).returning().get();
      const correctedSale = transaction.update(sales).set({
        sellingPrice: newSellingPrice,
        profit: newSellingPrice - saleToCorrect.costPrice,
      }).where(eq(sales.saleId, saleId)).returning().get();
      return { sale: correctedSale, audit };
    });
  });
};
