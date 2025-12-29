import { db } from "../config/db.js";

export async function ensureUserColumns() {
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
  `);
}

export async function findUserById(userId) {
  const result = await db.query(
    `
    SELECT id, phone_number, username, name, profile_picture_url
    FROM users
    WHERE id = $1
    `,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function findUserWithDrops(userId) {
  const userResult = await db.query(
    `
    SELECT id, phone_number, username, name, profile_picture_url
    FROM users
    WHERE id = $1
    `,
    [userId]
  );

  if (!userResult.rows[0]) return null;

  const dropsResult = await db.query(
    `
    SELECT id, drop_id as "dropId", title, created_at as "createdAt", is_public as "isPublic"
    FROM drops
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return {
    user: userResult.rows[0],
    drops: dropsResult.rows
  };
}
