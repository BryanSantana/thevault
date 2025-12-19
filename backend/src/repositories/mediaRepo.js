import { db } from "../config/db.js";

export async function getMediaForDrop(dropUuid) {
  const result = await db.query(
    `
    SELECT id, s3_key, media_type, position, caption
    FROM media
    WHERE drop_id = $1
    ORDER BY position ASC
    `,
    [dropUuid]
  );
  return result.rows;
}
