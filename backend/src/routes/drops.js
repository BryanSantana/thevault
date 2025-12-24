import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { db } from "../config/db.js";
import { getSignedMediaUrl, listDropMedia } from "../services/s3Service.js";
import { validateDropPasscode } from "../services/dropService.js";
import { getMediaForDrop } from "../repositories/mediaRepo.js";
import { findDropByDropId, createDrop } from "../repositories/dropRepo.js";
import { createAndUploadMedia } from "../services/mediaService.js";
const router = express.Router();

// Generate a unique drop ID (6 characters, alphanumeric)
function generateDropId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * GET /drops
 * List all drops (for personal vault)
 */
router.get("/", async (req, res) => {
  try {
    // For now, assume no user, list all
    const result = await db.query(`
      SELECT id, drop_id as "dropId", title, created_at as "createdAt", is_public as "isPublic"
      FROM drops
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "FAILED_TO_LIST_DROPS" });
  }
});

/**
 * POST /drops
 * Create a new drop
 */
router.post("/", async (req, res) => {
  try {
    const { title, passcode, isPublic } = req.body;

    if (!title) {
      return res.status(400).json({ error: "TITLE_REQUIRED" });
    }

    // For private drops, require passcode
    if (!isPublic && !passcode) {
      return res.status(400).json({ error: "PASSCODE_REQUIRED_FOR_PRIVATE_DROP" });
    }

    // Generate unique dropId
    let dropId;
    let attempts = 0;
    do {
      dropId = generateDropId();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ error: "FAILED_TO_GENERATE_UNIQUE_ID" });
      }
    } while (await findDropByDropId(dropId));

    const passcodeHash = isPublic ? null : await bcrypt.hash(passcode, 10);

    const drop = await createDrop(dropId, title, passcodeHash, isPublic);

    res.status(201).json({
      id: drop.id,
      dropId: drop.drop_id,
      title: drop.title,
      createdAt: drop.created_at
    });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: "DROP_ID_EXISTS" });
    }
    res.status(500).json({ error: "FAILED_TO_CREATE_DROP" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /drops/:dropId/media
 * Upload media to a drop
 */
router.post("/:dropId/media", upload.single("file"), async (req, res) => {
  try {
    const { dropId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "NO_FILE_UPLOADED" });
    }

    const media = await createAndUploadMedia(dropId, file);

    res.status(201).json({
      id: media.id,
      s3Key: media.s3_key,
      type: media.media_type,
      position: media.position
    });
  } catch (err) {
    console.error(err);
    if (err.message === "DROP_NOT_FOUND") {
      return res.status(404).json({ error: "DROP_NOT_FOUND" });
    }
    res.status(500).json({ error: "FAILED_TO_UPLOAD_MEDIA" });
  }
});

/**
 * GET /drops/:dropId
 * Returns info about a drop (for now, public info)
 */
router.get("/:dropId", async (req, res) => {
  try {
    const { dropId } = req.params;

    const drop = await findDropByDropId(dropId);
    if (!drop) {
      return res.status(404).json({ error: "DROP_NOT_FOUND" });
    }

    res.json({
      id: drop.id,
      dropId: drop.drop_id,
      title: drop.title,
      isLive: drop.is_live,
      createdAt: drop.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load drop" });
  }
});


router.post("/:dropId/unlock", async (req, res) => {
  try {
    const { dropId } = req.params;
    const { passcode } = req.body;

    if (!passcode) {
      return res.status(400).json({ error: "PASSCODE_REQUIRED" });
    }

    const validation = await validateDropPasscode(dropId, passcode);
    if (!validation.valid) {
      return res.status(403).json({ error: validation.reason });
    }

    const drop = validation.drop;
    const mediaRows = await getMediaForDrop(drop.id);

    const media = await Promise.all(
      mediaRows.map(async (m) => ({
        id: m.id,
        type: m.media_type,
        position: m.position,
        caption: m.caption,
        url: await getSignedMediaUrl(m.s3_key),
      }))
    );

    res.json({
      dropId,
      title: drop.title,
      count: media.length,
      media,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "FAILED_TO_UNLOCK_DROP" });
  }
});

export default router;
