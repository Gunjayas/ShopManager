import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orderStatuses = ["ongoing", "closed"] as const;
export const bundleStatuses = [
  "pending",
  "arrived",
  "lost",
  "refunded",
  "replaced",
] as const;
export const inventoryItemStatuses = [
  "in_stock",
  "sold",
  "damaged",
  "returned",
] as const;
export const lossTypes = ["full_bundle", "partial"] as const;
export const recoveryStatuses = [
  "none",
  "pending_claim",
  "refunded",
  "replaced",
] as const;
export const saleStatuses = ["active", "returned"] as const;

export const orders = sqliteTable("orders", {
  orderId: integer("order_id").primaryKey({ autoIncrement: true }),
  supplierOrCountry: text("supplier_or_country").notNull(),
  orderDate: text("order_date").notNull(),
  transportationFee: integer("transportation_fee").notNull().default(0),
  expectedBundleCount: integer("expected_bundle_count").notNull(),
  // SQLite stores this application-level enum as TEXT: ongoing | closed.
  status: text("status", { enum: orderStatuses }).notNull().default("ongoing"),
});

export const bundles = sqliteTable("bundles", {
  bundleId: integer("bundle_id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.orderId, { onDelete: "restrict" }),
  type: text("type").notNull(),
  designName: text("design_name").notNull(),
  itemsOrdered: integer("items_ordered").notNull(),
  costPerItem: integer("cost_per_item").notNull(),
  bundleTotalCost: integer("bundle_total_cost").notNull(),
  // SQLite stores this application-level enum as TEXT: pending | arrived | lost | refunded | replaced.
  status: text("status", { enum: bundleStatuses }).notNull().default("pending"),
  itemsReceived: integer("items_received").notNull().default(0),
  arrivalDate: text("arrival_date"),
});

export const inventoryItems = sqliteTable("inventory_items", {
  itemId: integer("item_id").primaryKey({ autoIncrement: true }),
  bundleId: integer("bundle_id")
    .notNull()
    .references(() => bundles.bundleId, { onDelete: "restrict" }),
  variant: text("variant"),
  // Business rule: this immutable value is inherited directly from Bundle.cost_per_item.
  costPrice: integer("cost_price").notNull(),
  markedPrice: integer("marked_price").notNull(),
  listedPrice: integer("listed_price").notNull(),
  targetPrice: integer("target_price").notNull(),
  floorPrice: integer("floor_price").notNull(),
  maxDiscountPercent: integer("max_discount_percent").notNull().default(0),
  // SQLite stores this application-level enum as TEXT: in_stock | sold | damaged | returned.
  status: text("status", { enum: inventoryItemStatuses })
    .notNull()
    .default("in_stock"),
});

export const sales = sqliteTable("sales", {
  saleId: integer("sale_id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => inventoryItems.itemId, { onDelete: "restrict" }),
  saleDate: text("sale_date").notNull(),
  sellingPrice: integer("selling_price").notNull(),
  // Reports ignore returned sales because their profit is nullified without deleting history.
  profit: integer("profit"),
  originalListedPrice: integer("original_listed_price").notNull(),
  status: text("status", { enum: saleStatuses }).notNull().default("active"),
  returnedDate: text("returned_date"),
});

export const salePriceCorrections = sqliteTable("sale_price_corrections", {
  correctionId: integer("correction_id").primaryKey({ autoIncrement: true }),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.saleId, { onDelete: "restrict" }),
  oldSellingPrice: integer("old_selling_price").notNull(),
  newSellingPrice: integer("new_selling_price").notNull(),
  correctedAt: text("corrected_at").notNull(),
  reason: text("reason"),
});

export const lossEntries = sqliteTable("loss_entries", {
  lossId: integer("loss_id").primaryKey({ autoIncrement: true }),
  bundleId: integer("bundle_id")
    .notNull()
    .references(() => bundles.bundleId, { onDelete: "restrict" }),
  // SQLite stores this application-level enum as TEXT: full_bundle | partial.
  lossType: text("loss_type", { enum: lossTypes }).notNull(),
  itemsLost: integer("items_lost").notNull(),
  lossValue: integer("loss_value").notNull(),
  lossDate: text("loss_date").notNull(),
  // SQLite stores this application-level enum as TEXT: none | pending_claim | refunded | replaced.
  recoveryStatus: text("recovery_status", { enum: recoveryStatuses })
    .notNull()
    .default("none"),
  recoveryValue: integer("recovery_value"),
  recoveryDate: text("recovery_date"),
  replacementBundleId: integer("replacement_bundle_id").references(
    () => bundles.bundleId,
    { onDelete: "restrict" },
  ),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Bundle = typeof bundles.$inferSelect;
export type NewBundle = typeof bundles.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type SalePriceCorrection = typeof salePriceCorrections.$inferSelect;
export type NewSalePriceCorrection = typeof salePriceCorrections.$inferInsert;
export type LossEntry = typeof lossEntries.$inferSelect;
export type NewLossEntry = typeof lossEntries.$inferInsert;