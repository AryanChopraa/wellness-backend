import { Storage } from '@google-cloud/storage';
import { env } from '../config/env';

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    const opts: { keyFilename?: string } = {};
    if (env.gcs.keyFilename) opts.keyFilename = env.gcs.keyFilename;
    storage = new Storage(opts);
  }
  return storage;
}

export interface UploadResult {
  path: string;
  url: string;
  bucket: string;
  mimeType: string;
  originalName: string;
}

/**
 * Upload a file buffer to Google Cloud Storage (wellness-assets bucket).
 * Uses path: uploads/{timestamp}-{sanitizedName}
 * Public URL format: https://storage.googleapis.com/{bucket}/{path}
 */
export async function uploadToGCS(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  userId?: string
): Promise<UploadResult> {
  const bucketName = env.gcs.bucket;
  if (!bucketName) {
    throw new Error('GCS_BUCKET is not configured');
  }

  const storage = getStorage();
  const bucket = storage.bucket(bucketName);

  const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'file';
  const prefix = userId ? `uploads/${userId}` : 'uploads';
  const path = `${prefix}/${Date.now()}-${sanitized}`;

  const file = bucket.file(path);
  await file.save(buffer, {
    contentType: mimeType,
    metadata: { cacheControl: 'public, max-age=31536000' },
  });

  const url = `https://storage.googleapis.com/${bucketName}/${path}`;

  return {
    path,
    url,
    bucket: bucketName,
    mimeType,
    originalName,
  };
}
