import express from "express";
import { getSignedMediaUrl, listDropMedia } from "../services/s3Service.js";
import { validateDropPasscode } from "../services/dropService.js";
import { getMediaForDrop } from "../repositories/mediaRepo.js";
const router = express.Router();

/**
 * GET /drops/:dropId
 * Returns signed URLs for all media in a drop
 */
router.get("/:dropId", async (req, res) => {
  try {
    const { dropId } = req.params;

    const keys = await listDropMedia(dropId);

    const media = await Promise.all(
      keys.map(async key => ({
        key,
        url: await getSignedMediaUrl(key),
        type: key.includes("/videos/") ? "video" : "photo"
      }))
    );

    res.json({
      dropId,
      count: media.length,
      media
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
