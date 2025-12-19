import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { db } from "../config/db.js";
import { getSignedMediaUrl, listDropMedia, uploadMediaToS3 } from "../services/s3Service.js";
import { validateDropPasscode } from "../services/dropService.js";
import { getMediaForDrop, createMedia, getNextPosition } from "../repositories/mediaRepo.js";
import { createDrop, findDropByDropId } from "../repositories/dropRepo.js";
const router = express.Router();

/**
 * GET /drops
 * List all drops (for personal vault)
 */
router.get("/", async (req, res) => {
  try {
    // For now, assume no user, list all
    const result = await db.query(`
      SELECT id, drop_id, title, created_at
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
    const { dropId, title, passcode } = req.body;

    if (!dropId || !title || !passcode) {
      return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
    }

    const passcodeHash = await bcrypt.hash(passcode, 10);

    const drop = await createDrop(dropId, title, passcodeHash);

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

    const drop = await findDropByDropId(dropId);
    if (!drop) {
      return res.status(404).json({ error: "DROP_NOT_FOUND" });
    }

    // Determine media type
    const mediaType = file.mimetype.startsWith("video/") ? "video" : "photo";

    // Generate S3 key
    const position = await getNextPosition(drop.id);
    const extension = file.originalname.split(".").pop();
    const s3Key = `drops/${dropId}/${mediaType}s/${position}.${extension}`;

    // Upload to S3
    await uploadMediaToS3(s3Key, file.buffer, file.mimetype);

    // Save to DB
    const media = await createMedia(drop.id, s3Key, mediaType, position);

    res.status(201).json({
      id: media.id,
      s3Key: media.s3_key,
      type: media.media_type,
      position: media.position
    });
  } catch (err) {
    console.error(err);
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
