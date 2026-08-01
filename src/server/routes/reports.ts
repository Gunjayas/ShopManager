import { and, eq, gte, lt, sql, sum } from "drizzle-orm";
import { bundles, inventoryItems, lossEntries, orders, sales } from "../db/schema.js";
import { parseMonth } from "./dates.js";
import { ApiError } from "./http.js";
import type { RouteRegistrar } from "./types.js";

// Converts SQLite aggregate values into stable numeric API fields.
function amount(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

// Registers financial and inventory reports using grouped or aggregate database queries.
export const registerReportRoutes: RouteRegistrar = async (app, database) => {
  // Calculates monthly P&L while assigning losses and recoveries to their own event months.
  app.get<{ Querystring: { month?: string } }>("/api/reports/pnl", async (request) => {
    const month = parseMonth(request.query.month);
    const [profitRow] = await database.select({ total: sum(sales.profit) }).from(sales).where(
      and(eq(sales.status, "active"), gte(sales.saleDate, month.start), lt(sales.saleDate, month.end)),
    );
    const [lossRow] = await database.select({ total: sum(lossEntries.lossValue) }).from(lossEntries).where(
      and(gte(lossEntries.lossDate, month.start), lt(lossEntries.lossDate, month.end)),
    );
    const [recoveryRow] = await database.select({ total: sum(lossEntries.recoveryValue) }).from(lossEntries).where(
      and(gte(lossEntries.recoveryDate, month.start), lt(lossEntries.recoveryDate, month.end)),
    );
    const [feeRow] = await database.select({ total: sum(orders.transportationFee) }).from(orders).where(
      and(gte(orders.orderDate, month.start), lt(orders.orderDate, month.end)),
    );

    const itemProfit = amount(profitRow?.total);
    const transitLoss = amount(lossRow?.total);
    const recoveries = amount(recoveryRow?.total);
    const transportationFees = amount(feeRow?.total);
    return {
      month: request.query.month,
      total_item_profit: itemProfit,
      total_transit_losses: transitLoss,
      total_recoveries: recoveries,
      transportation_fees: transportationFees,
      net_profit_and_loss: itemProfit - transitLoss + recoveries - transportationFees,
    };
  });

  // Finds sellable items whose bundle has remained in stock beyond the chosen day threshold.
  app.get<{ Querystring: { threshold?: string } }>("/api/reports/dead-stock", async (request) => {
    const threshold = Number(request.query.threshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      throw new ApiError(400, "Invalid threshold", "threshold must be a non-negative whole number of days.");
    }

    const deadStock = await database.select({
      itemId: inventoryItems.itemId,
      bundleId: inventoryItems.bundleId,
      variant: inventoryItems.variant,
      costPrice: inventoryItems.costPrice,
      listedPrice: inventoryItems.listedPrice,
      arrivalDate: bundles.arrivalDate,
      daysInStock: sql<number>`cast(julianday('now') - julianday(${bundles.arrivalDate}) as integer)`,
    }).from(inventoryItems).innerJoin(bundles, eq(inventoryItems.bundleId, bundles.bundleId)).where(
      and(
        eq(inventoryItems.status, "in_stock"),
        sql`${bundles.arrivalDate} is not null`,
        sql`julianday('now') - julianday(${bundles.arrivalDate}) > ${threshold}`,
      ),
    );
    return { threshold_days: threshold, items: deadStock };
  });

  // Ranks product designs by active sold units and their average days from arrival to sale.
  app.get("/api/reports/movers", async () => {
    const movers = await database.select({
      type: bundles.type,
      designName: bundles.designName,
      unitsSold: sql<number>`count(${sales.saleId})`,
      averageDaysToSell: sql<number>`round(avg(julianday(${sales.saleDate}) - julianday(${bundles.arrivalDate})), 1)`,
    }).from(sales).innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.itemId))
      .innerJoin(bundles, eq(inventoryItems.bundleId, bundles.bundleId))
      .where(and(eq(sales.status, "active"), sql`${bundles.arrivalDate} is not null`))
      .groupBy(bundles.type, bundles.designName);
    return { movers };
  });

  // Groups transit losses by order and bundle without hiding historical recovery amounts.
  app.get("/api/reports/transit-loss", async () => {
    const groupedLosses = await database.select({
      orderId: bundles.orderId,
      bundleId: lossEntries.bundleId,
      type: bundles.type,
      designName: bundles.designName,
      totalLossValue: sum(lossEntries.lossValue),
      totalRecoveryValue: sum(lossEntries.recoveryValue),
    }).from(lossEntries).innerJoin(bundles, eq(lossEntries.bundleId, bundles.bundleId))
      .groupBy(bundles.orderId, lossEntries.bundleId, bundles.type, bundles.designName);

    return {
      losses: groupedLosses.map((loss) => ({
        ...loss,
        totalLossValue: amount(loss.totalLossValue),
        totalRecoveryValue: amount(loss.totalRecoveryValue),
        netUnrecoveredLoss: amount(loss.totalLossValue) - amount(loss.totalRecoveryValue),
      })),
    };
  });

  // Totals the listed-price discount granted on active sales in the requested month.
  app.get<{ Querystring: { month?: string } }>("/api/reports/discount-leakage", async (request) => {
    const month = parseMonth(request.query.month);
    const [discountRow] = await database.select({
      total: sql<number>`coalesce(sum(${sales.originalListedPrice} - ${sales.sellingPrice}), 0)`,
    }).from(sales).where(
      and(eq(sales.status, "active"), gte(sales.saleDate, month.start), lt(sales.saleDate, month.end)),
    );
    return { month: request.query.month, total_discount_leakage: amount(discountRow?.total) };
  });

  // Compares sold-item profit against transit loss once per bundle without aggregate join duplication.
  app.get("/api/reports/bundle-profitability", async () => {
    const salesByBundle = database.$with("sales_by_bundle").as(
      database.select({
        bundleId: inventoryItems.bundleId,
        itemProfit: sum(sales.profit).as("item_profit"),
        salesRevenue: sum(sales.sellingPrice).as("sales_revenue"),
      }).from(sales).innerJoin(inventoryItems, eq(sales.itemId, inventoryItems.itemId))
        .where(eq(sales.status, "active")).groupBy(inventoryItems.bundleId),
    );
    const lossesByBundle = database.$with("losses_by_bundle").as(
      database.select({
        bundleId: lossEntries.bundleId,
        lossValue: sum(lossEntries.lossValue).as("loss_value"),
      }).from(lossEntries).groupBy(lossEntries.bundleId),
    );
    const profitability = await database.with(salesByBundle, lossesByBundle).select({
      bundleId: bundles.bundleId,
      orderId: bundles.orderId,
      type: bundles.type,
      designName: bundles.designName,
      itemProfit: sql<number>`coalesce(${salesByBundle.itemProfit}, 0)`,
      salesRevenue: sql<number>`coalesce(${salesByBundle.salesRevenue}, 0)`,
      lossValue: sql<number>`coalesce(${lossesByBundle.lossValue}, 0)`,
      profitability: sql<number>`coalesce(${salesByBundle.itemProfit}, 0) - coalesce(${lossesByBundle.lossValue}, 0)`,
    }).from(bundles).leftJoin(salesByBundle, eq(bundles.bundleId, salesByBundle.bundleId))
      .leftJoin(lossesByBundle, eq(bundles.bundleId, lossesByBundle.bundleId));
    return { bundles: profitability };
  });
};
