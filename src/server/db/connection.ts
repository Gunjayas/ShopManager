import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import * as schema from "./schema.js";

export const databasePath = resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? "shop.db",
);

// Opens the local shop database and enables relational integrity for every connection.
export function openDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });

  const sqlite = new DatabaseSync(databasePath);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  sqlite.exec("PRAGMA journal_mode = WAL;");

  const database = drizzle({ client: sqlite, schema });
  return { database, sqlite };
}