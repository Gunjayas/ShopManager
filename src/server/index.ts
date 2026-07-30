import Fastify from "fastify";
import { openDatabase } from "./db/connection.js";
import { registerFrontend } from "./frontend.js";
import { registerRoutes } from "./routes.js";

const app = Fastify({ logger: true });
const { database, sqlite } = openDatabase();

// Builds the HTTP application around one local SQLite database connection.
async function startServer() {
  await registerRoutes(app, database);
  await registerFrontend(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ host: "0.0.0.0", port });
}

// Closes the local database cleanly when Termux or PM2 stops the process.
async function stopServer() {
  await app.close();
  sqlite.close();
  process.exit(0);
}

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);

startServer().catch((caughtError) => {
  app.log.error(caughtError);
  sqlite.close();
  process.exit(1);
});
