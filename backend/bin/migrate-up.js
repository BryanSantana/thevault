import { resolve } from "node:path";
import { db } from "../src/config/db.js";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Get full path to relative path REL.
 * @param {string} rel Relative path
 */
function pathify(rel) {
  return fileURLToPath(
    new URL(rel, import.meta.url)
  );
}

const migrationsPath = pathify("../sql");

const migrations = readdirSync(migrationsPath)
  .filter(filename => filename !== "down") // ignore the down dir
  .map(filename => {
    const scriptPath = resolve(migrationsPath, filename);
    return {name: filename, sql: readFileSync(scriptPath, "utf8")}
  });

const client = await db.connect();

try {
  await client.query("BEGIN");

  for (const m of migrations) {
    console.log(`running ${m.name}`);
    await client.query(m.sql);
  }

  await client.query("COMMIT");
  console.log("Successfully ran migrations");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
  process.exit(0);
}

