import {
  ListObjectsV2Command,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3.js";

function getBucket() {
  return process.env.S3_BUCKET;
}


export async function listDropMedia(dropId) {
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

export async function getSignedMediaUrl(key) {
  if (process.env.NODE_ENV === 'test') {
    return `https://mock-s3/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key
  });

  return getSignedUrl(s3, command, {
    expiresIn: 60 * 10 // 10 minutes
  });
}
