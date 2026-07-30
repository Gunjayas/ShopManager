import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { openDatabase } from "./connection.js";
import { parseCsv } from "./csv.js";
import { bundles, inventoryItems, orders } from "./schema.js";

type InitialStockRow = {
  type: string;
  designName: string;
  costPrice: number;
  listedPrice: number;
};

const requiredColumns = ["type", "design_name", "cost_price", "listed_price"] as const;
// Validates one money field because SQLite prices are stored as whole rupee integers.
function parseMoney(value: string, columnName: string, recordNumber: number) {
  const normalizedValue = value.trim().replaceAll(",", "");
  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`CSV record ${recordNumber}: ${columnName} must be a non-negative whole number.`);
  }
  const moneyValue = Number(normalizedValue);
  if (!Number.isSafeInteger(moneyValue)) {
    throw new Error(`CSV record ${recordNumber}: ${columnName} is too large.`);
  }
  return moneyValue;
}

// Converts validated CSV records into the inventory fields required by the shop schema.
function readInitialStockRows(csvPath: string): InitialStockRow[] {
  const csvRecords = parseCsv(readFileSync(csvPath, "utf8"));
  const headerRecord = csvRecords[0];
  if (!headerRecord) throw new Error("The CSV is empty.");

  const headers = headerRecord.values.map((header, index) =>
    (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim(),
  );
  for (const requiredColumn of requiredColumns) {
    if (headers.filter((header) => header === requiredColumn).length !== 1) {
      throw new Error(`The CSV must contain exactly one '${requiredColumn}' column.`);
    }
  }

  const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
  const stockRows = csvRecords.slice(1).map(({ recordNumber, values }) => {
    const type = values[columnIndex.type ?? -1]?.trim() ?? "";
    const designName = values[columnIndex.design_name ?? -1]?.trim() ?? "";
    if (!type || !designName) {
      throw new Error(`CSV record ${recordNumber}: type and design_name are required.`);
    }
    return {
      type,
      designName,
      costPrice: parseMoney(values[columnIndex.cost_price ?? -1] ?? "", "cost_price", recordNumber),
      listedPrice: parseMoney(values[columnIndex.listed_price ?? -1] ?? "", "listed_price", recordNumber),
    };
  });

  if (stockRows.length === 0) throw new Error("The CSV contains no inventory rows.");
  return stockRows;
}

// Groups rows into honest purchase units so every item inherits its Bundle cost unchanged.
function groupRowsByBundle(stockRows: InitialStockRow[]) {
  const groupedRows = new Map<string, InitialStockRow[]>();
  for (const stockRow of stockRows) {
    const bundleKey = JSON.stringify([stockRow.type, stockRow.designName, stockRow.costPrice]);
    const bundleRows = groupedRows.get(bundleKey) ?? [];
    bundleRows.push(stockRow);
    groupedRows.set(bundleKey, bundleRows);
  }
  return [...groupedRows.values()];
}

// Creates one historical order and its grouped bundles atomically to prevent partial imports.
function importInitialStock(csvPath: string) {
  const stockRows = readInitialStockRows(csvPath);
  const groupedRows = groupRowsByBundle(stockRows);
  const importDate = process.env.INITIAL_STOCK_DATE ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(importDate)) {
    throw new Error("INITIAL_STOCK_DATE must use YYYY-MM-DD format.");
  }

  const { database, sqlite } = openDatabase();
  try {
    const existingOrder = database.select({ orderId: orders.orderId }).from(orders)
      .where(eq(orders.supplierOrCountry, "Initial Stock")).limit(1).get();
    if (existingOrder) {
      throw new Error("An Initial Stock order already exists. Refusing to import the CSV twice.");
    }

    const result = database.transaction((transaction) => {
      const createdOrder = transaction.insert(orders).values({
        supplierOrCountry: "Initial Stock",
        orderDate: importDate,
        transportationFee: 0,
        expectedBundleCount: groupedRows.length,
        status: "closed",
      }).returning({ orderId: orders.orderId }).get();

      for (const bundleRows of groupedRows) {
        const firstRow = bundleRows[0];
        if (!firstRow) continue;
        const createdBundle = transaction.insert(bundles).values({
          orderId: createdOrder.orderId,
          type: firstRow.type,
          designName: firstRow.designName,
          itemsOrdered: bundleRows.length,
          costPerItem: firstRow.costPrice,
          bundleTotalCost: bundleRows.length * firstRow.costPrice,
          status: "arrived",
          itemsReceived: bundleRows.length,
          arrivalDate: importDate,
        }).returning({ bundleId: bundles.bundleId }).get();

        for (const stockRow of bundleRows) {
          transaction.insert(inventoryItems).values({
            bundleId: createdBundle.bundleId,
            costPrice: firstRow.costPrice,
            markedPrice: stockRow.listedPrice,
            listedPrice: stockRow.listedPrice,
            targetPrice: stockRow.listedPrice,
            floorPrice: firstRow.costPrice,
            maxDiscountPercent: 0,
            status: "in_stock",
          }).run();
        }
      }

      return { orderId: createdOrder.orderId, bundleCount: groupedRows.length, itemCount: stockRows.length };
    });
    console.log("Initial stock import completed:", result);
  } finally {
    sqlite.close();
  }
}

const csvArgument = process.argv[2];
if (!csvArgument) {
  console.error("Usage: npm run db:import -- ./path/to/initial-stock.csv");
  process.exitCode = 1;
} else {
  try {
    importInitialStock(resolve(process.cwd(), csvArgument));
  } catch (importError) {
    console.error("Initial stock import failed. No partial import was committed.");
    console.error(importError);
    process.exitCode = 1;
  }
}