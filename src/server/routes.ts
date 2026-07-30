import type { FastifyInstance } from "fastify";
import type { openDatabase } from "./db/connection.js";
import { registerCatalogRoutes } from "./routes/catalog.js";
import { installErrorHandler } from "./routes/http.js";
import { registerIntakeRoutes } from "./routes/intake.js";
import { registerItemRoutes } from "./routes/items.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerSaleRoutes } from "./routes/sales.js";
import { registerStatusAndLossRoutes } from "./routes/status-and-losses.js";

type ShopDatabase = ReturnType<typeof openDatabase>["database"];

// Registers every shop API route against the shared local SQLite connection.
export async function registerRoutes(app: FastifyInstance, database: ShopDatabase) {
  installErrorHandler(app);
  await registerCatalogRoutes(app, database);
  await registerIntakeRoutes(app, database);
  await registerItemRoutes(app, database);
  await registerSaleRoutes(app, database);
  await registerStatusAndLossRoutes(app, database);
  await registerReportRoutes(app, database);
}
