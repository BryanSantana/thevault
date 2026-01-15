import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { Readable } from "stream";
import { db } from "../config/db.js";
import { getSignedMediaUrl, deleteDropMedia } from "../services/s3Service.js";
import { validateDropPasscode } from "../services/dropService.js";
import { getMediaForDrop, findMediaById, deleteMediaForDrop } from "../repositories/mediaRepo.js";
import { findDropByDropId, createDrop, incrementUnlockCount, deleteDropById, updateDropByDropId } from "../repositories/dropRepo.js";
import { createAndUploadMedia } from "../services/mediaService.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import z from "zod";
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
 * List all drops (user's drops + public drops)
 */
router.get("/", optionalAuth, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user) {
      // Authenticated user: show their drops + all public drops
      query = `
        SELECT id, drop_id as "dropId", title, created_at as "createdAt", is_public as "isPublic",
               CASE WHEN user_id = $1 THEN true ELSE false END as "isOwner"
        FROM drops
        WHERE user_id = $1 OR is_public = true
        ORDER BY created_at DESC
      `;
      params = [req.user.id];
    } else {
      // Guest user: show only public drops
      query = `
        SELECT id, drop_id as "dropId", title, created_at as "createdAt", is_public as "isPublic", false as "isOwner"
        FROM drops
        WHERE is_public = true
        ORDER BY created_at DESC
      `;
      params = [];
    }

    const result = await db.query(query, params);
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
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, passcode, isPublic } = req.body;
    const userId = req.user.id;

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
    const passcodePlain = isPublic ? null : passcode;

    const drop = await createDrop(dropId, title, passcodeHash, isPublic, userId, passcodePlain);

    res.status(201).json({
      id: drop.id,
      dropId: drop.drop_id,
      title: drop.title,
      createdAt: drop.created_at,
      isPublic: drop.is_public,
      isOwner: true
    });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: "DROP_ID_EXISTS" });
    }
    res.status(500).json({ error: "FAILED_TO_CREATE_DROP" });
  }
});

router.patch("/:dropId", optionalAuth, async (req, res) => {
  const formSchema = z.object({
    title: z.string(),
    passcodeHash: z.string(),
    isPublic: z.boolean()
  }).partial();
  try {
    const parseResult = formSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: z.prettifyError(parseResult.error)
      });
    }
    const newValues = parseResult.data;
    const {dropId} = req.params;
    const numUpdated = await updateDropByDropId(dropId, newValues);
    if (numUpdated === 0) {
      return res.status(404).json({
        error: `Drop ${dropId} doesn't exist lol`
      });
    }

    // just return new fields for now
    return res.status(200).json({
      title
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "FAILED_TO_UPDATE_DROP"
    });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /drops/:dropId/media
 * Upload media to a drop
 */
router.post("/:dropId/media", authenticateToken, upload.single("file"), async (req, res) => {
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
 * DELETE /drops/:dropId
 * Delete a drop and its media (owner only)
 */
router.delete("/:dropId", authenticateToken, async (req, res) => {
  try {
    const { dropId } = req.params;
    const drop = await findDropByDropId(dropId);

    if (!drop) {
      return res.status(404).json({ error: "DROP_NOT_FOUND" });
    }

    if (drop.user_id !== req.user.id) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    await deleteDropMedia(dropId);
    await deleteMediaForDrop(drop.id);
    await deleteDropById(drop.id);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "FAILED_TO_DELETE_DROP" });
  }
});

/**
 * GET /drops/:dropId
 * Returns info about a drop (for now, public info)
 */
router.get("/:dropId", optionalAuth, async (req, res) => {
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
      createdAt: drop.created_at,
      isPublic: drop.is_public,
      isOwner: req.user ? drop.user_id === req.user.id : false
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load drop" });
  }
});


router.post("/:dropId/unlock", optionalAuth, async (req, res) => {
  try {
    const { dropId } = req.params;
    const { passcode } = req.body;

    const drop = await findDropByDropId(dropId);
    if (!drop) {
      return res.status(404).json({ error: "DROP_NOT_FOUND" });
    }

    const isOwner = req.user && drop.user_id === req.user.id;

    if (!drop.is_public && !isOwner) {
      if (!passcode) {
        return res.status(400).json({ error: "PASSCODE_REQUIRED" });
      }

      const validation = await validateDropPasscode(dropId, passcode);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.reason });
      }
    }

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

    const unlockCount = await incrementUnlockCount(dropId);

    res.json({
      dropId,
      title: drop.title,
      count: media.length,
      media,
      unlockCount: isOwner ? unlockCount : undefined,
      passcode: isOwner ? drop.passcode_plain : undefined,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "FAILED_TO_UNLOCK_DROP" });
  }
});

// download proxy to avoid exposing raw S3 and handle CORS
router.get("/:dropId/media/:mediaId/download", optionalAuth, async (req, res) => {
  try {
    const { dropId, mediaId } = req.params;
    const { passcode } = req.query;

    const drop = await findDropByDropId(dropId);
    if (!drop) {
      return res.status(404).json({ error: "DROP_NOT_FOUND" });
    }

    const media = await findMediaById(mediaId);
    if (!media || media.drop_id !== drop.id) {
      return res.status(404).json({ error: "MEDIA_NOT_FOUND" });
    }

    const isOwner = req.user && req.user.id === drop.user_id;

    if (!drop.is_public && !isOwner) {
      if (!passcode) {
        return res.status(400).json({ error: "PASSCODE_REQUIRED" });
      }
      const validation = await validateDropPasscode(dropId, passcode);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.reason });
      }
    }

    const signed = await getSignedMediaUrl(media.s3_key);
    const fileName = path.basename(media.s3_key);

    const upstream = await fetch(signed);
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ error: "FAILED_TO_FETCH_MEDIA" });
    }

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "FAILED_TO_DOWNLOAD_MEDIA" });
  }
});

export default router;
