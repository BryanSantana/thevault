import express from "express";
import { getSignedMediaUrl, listDropMedia } from "../services/s3Service.js";

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

export default router;
