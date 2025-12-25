import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { s3 } from "../config/s3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads");

function getBucket() {
  return process.env.S3_BUCKET;
}

function useLocalStorage() {
  return !getBucket();
}

async function ensureDirForKey(key) {
  const filePath = path.join(uploadsRoot, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  return filePath;
}

export async function listDropMedia(dropId) {
  if (useLocalStorage()) {
    // local dev: list from filesystem if needed
    const prefixDir = path.join(uploadsRoot, `drops/${dropId}`);
    try {
      const entries = await fs.readdir(prefixDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => `drops/${dropId}/${entry.name}`);
    } catch {
      return [];
    }
  }

  const prefix = `drops/${dropId}/`;
  const command = new ListObjectsV2Command({
    Bucket: getBucket(),
    Prefix: prefix
  });

  const response = await s3.send(command);

  if (!response.Contents) return [];

  return response.Contents
    .filter(obj => !obj.Key.endsWith("/"))
    .map(obj => obj.Key);
}

export async function uploadMediaToS3(key, buffer, contentType) {
  if (useLocalStorage()) {
    const filePath = await ensureDirForKey(key);
    await fs.writeFile(filePath, buffer);
    return key;
  }

  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType
  });

  await s3.send(command);
  return key;
}

export async function getSignedMediaUrl(key) {
  if (process.env.NODE_ENV === 'test') {
    return `https://mock-s3/${key}`;
  }

  if (useLocalStorage()) {
    const base = process.env.MEDIA_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    return `${base}/uploads/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key
  });

  return getSignedUrl(s3, command, {
    expiresIn: 60 * 10 // 10 minutes
  });
}
