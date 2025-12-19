import { db } from "../config/db.js";

export async function findDropByDropId(dropId) {
  const result = await db.query(
    `
    SELECT *
    FROM drops
    WHERE drop_id = $1
    LIMIT 1
    `,
    [dropId]
  );
  return result.rows[0] ?? null;
}
