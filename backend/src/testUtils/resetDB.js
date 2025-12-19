import { db } from "../config/db.js";

export async function resetDb() {
  await db.query("TRUNCATE media, drops RESTART IDENTITY CASCADE;");
}
