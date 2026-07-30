import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { sql } from "drizzle-orm";
import { openDatabase } from "./connection.js";

const migrationsDirectory = resolve(process.cwd(), "drizzle");

// Finds generated SQL recursively and sorts relative paths for deterministic execution.
function readMigrationFiles(directory = migrationsDirectory): string[] {
  const migrationFiles: string[] = [];

  for (const directoryEntry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      migrationFiles.push(...readMigrationFiles(entryPath));
      continue;
    }

    if (directoryEntry.name.endsWith(".sql")) {
      const portableFilePath = relative(migrationsDirectory, entryPath).replaceAll(
        "\\",
        "/",
      );
      migrationFiles.push(portableFilePath);
    }
  }

  return migrationFiles.sort((firstFile, secondFile) =>
    firstFile.localeCompare(secondFile),
  );
}

// Applies each SQL migration once and records it atomically for safe repeat runs.
function runMigrations() {
  const { database, sqlite } = openDatabase();

  try {
    database.run(sql.raw(`
      CREATE TABLE IF NOT EXISTS __shop_migrations (
        file_name TEXT PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      )
    `));

    const appliedRows = database.all<{ file_name: string }>(
      sql`SELECT file_name FROM __shop_migrations`,
    );
    const appliedFiles = new Set(
      appliedRows.map((row: { file_name: string }) => row.file_name),
    );

    for (const fileName of readMigrationFiles()) {
      if (appliedFiles.has(fileName)) {
        console.log(`Already applied: ${fileName}`);
        continue;
      }

      const migrationSql = readFileSync(
        resolve(migrationsDirectory, fileName),
        "utf8",
      );

      sqlite.exec("BEGIN IMMEDIATE;");
      try {
        sqlite.exec(migrationSql.replaceAll("--> statement-breakpoint", ""));
        database.run(
          sql`INSERT INTO __shop_migrations (file_name, applied_at)
              VALUES (${fileName}, ${new Date().toISOString()})`,
        );
        sqlite.exec("COMMIT;");
        console.log(`Applied: ${fileName}`);
      } catch (migrationError) {
        sqlite.exec("ROLLBACK;");
        throw migrationError;
      }
    }
  } finally {
    sqlite.close();
  }
}

try {
  runMigrations();
  console.log("Database migrations are up to date.");
} catch (migrationError) {
  console.error("Migration failed. The database was left at its last valid version.");
  console.error(migrationError);
  process.exitCode = 1;
}