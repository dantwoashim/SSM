import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";
import { assertDatabaseConfigured, env } from "../env";

let database: any;
let rawClient: any;
let initialized: Promise<void> | null = null;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(moduleDir, "../../../../");
const stateRoot = env.stateRoot ? path.resolve(env.stateRoot) : repositoryRoot;
const localDatabaseDir = path.join(stateRoot, ".pglite");
const migrationDir = path.join(moduleDir, "migrations");

async function executeSql(statement: string) {
  if (typeof rawClient.exec === "function") {
    await rawClient.exec(statement);
    return;
  }

  await rawClient.unsafe(statement);
}

export async function querySql<T = Record<string, unknown>>(statement: string): Promise<T[]> {
  await applyMigrations();

  if (typeof rawClient.query === "function") {
    const result = await rawClient.query(statement);
    return (result?.rows || []) as T[];
  }

  const result = await rawClient.unsafe(statement);
  return Array.isArray(result) ? (result as T[]) : [];
}

async function executeMigration(id: string, sql: string) {
  try {
    await executeSql(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (id === "007_relational_integrity_and_worker_heartbeats" && /already exists|duplicate/i.test(message)) {
      return;
    }

    throw error;
  }
}

async function getMigrationFiles() {
  const files = await readdir(migrationDir);
  return files
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => ({
      id: file.replace(/\.sql$/, ""),
      filePath: path.join(migrationDir, file),
    }));
}

async function applyMigrations() {
  if (!initialized) {
    initialized = (async () => {
      if (!database) {
        if (env.databaseUrl) {
          const [{ drizzle: drizzlePostgres }, postgresModule] = await Promise.all([
            import("drizzle-orm/postgres-js"),
            import("postgres"),
          ]);
          const postgres = postgresModule.default;
          rawClient = postgres(env.databaseUrl, { prepare: false });
          database = drizzlePostgres(rawClient, { schema });
        } else {
          const [{ PGlite }, { drizzle: drizzlePglite }] = await Promise.all([
            import("@electric-sql/pglite"),
            import("drizzle-orm/pglite"),
          ]);
          await mkdir(localDatabaseDir, { recursive: true });
          rawClient = new PGlite(path.join(localDatabaseDir, "assurance"));
          database = drizzlePglite(rawClient, { schema });
        }
      }

      await executeSql(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at text NOT NULL
);
`);

      const appliedRows = await database.select().from(schema.schemaMigrations);
      const applied = new Set(appliedRows.map((row: { id: string }) => row.id));
      const migrationFiles = await getMigrationFiles();

      for (const migration of migrationFiles) {
        if (applied.has(migration.id)) {
          continue;
        }

        const sql = await readFile(migration.filePath, "utf8");
        await executeMigration(migration.id, sql);
        await database.insert(schema.schemaMigrations).values({
          id: migration.id,
          appliedAt: new Date().toISOString(),
        });
      }
    })();
  }

  await initialized;
}

export async function getDb() {
  assertDatabaseConfigured();
  await applyMigrations();
  return database;
}

export async function runInTransaction<T>(work: (executor: any) => Promise<T>) {
  const db = await getDb();

  if (typeof db.transaction === "function") {
    return db.transaction(async (tx: any) => work(tx));
  }

  return work(db);
}

export async function resetDatabaseForTests() {
  if (rawClient) {
    if (typeof rawClient.end === "function") {
      await rawClient.end({ timeout: 0 }).catch(() => undefined);
    } else if (typeof rawClient.close === "function") {
      await rawClient.close().catch(() => undefined);
    }
  }

  database = undefined;
  rawClient = undefined;
  initialized = null;

  if (!env.databaseUrl) {
    await rm(localDatabaseDir, { force: true, recursive: true }).catch(() => undefined);
  }
}
