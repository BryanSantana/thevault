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

export async function createMedia(dropUuid, s3Key, mediaType, position) {
  const result = await db.query(
    `
    INSERT INTO media (drop_id, s3_key, media_type, position)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [dropUuid, s3Key, mediaType, position]
  );
  return result.rows[0];
}

export async function getNextPosition(dropUuid) {
  const result = await db.query(
    `
    SELECT COALESCE(MAX(position), 0) + 1 as next_pos
    FROM media
    WHERE drop_id = $1
    `,
    [dropUuid]
  );
  return result.rows[0].next_pos;
}

export async function findMediaById(mediaId) {
  const result = await db.query(
    `
    SELECT id, drop_id, s3_key, media_type, position
    FROM media
    WHERE id = $1
    `,
    [mediaId]
  );
  return result.rows[0] ?? null;
}
