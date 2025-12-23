import { findDropByDropId } from "../repositories/dropRepo.js";
import { createMedia, getNextPosition } from "../repositories/mediaRepo.js";
import { uploadMediaToS3 } from "./s3Service.js";

export async function createAndUploadMedia(dropId, file) {
  // Find the drop
  const drop = await findDropByDropId(dropId);
  if (!drop) {
    throw new Error("DROP_NOT_FOUND");
  }

  // Determine media type
  const mediaType = file.mimetype.startsWith("video/") ? "video" : "photo";

  // Get next position
  const position = await getNextPosition(drop.id);

  // Generate S3 key
  const extension = file.originalname.split(".").pop();
  const s3Key = `drops/${dropId}/${mediaType}s/${position}.${extension}`;

  // Upload to S3
  await uploadMediaToS3(s3Key, file.buffer, file.mimetype);

  // Save to DB
  const media = await createMedia(drop.id, s3Key, mediaType, position);

  return media;
}