import { Router, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { Asset } from '../models/Asset';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { sendError } from '../utils/response';
import { uploadToGCS } from '../services/gcsUpload';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * POST /assets — Upload a file to Google Cloud Storage and create an asset record.
 * Body: multipart/form-data with field "file" (the file). Optional: "note" (string).
 * Returns: { asset: { id, url, name, note } }
 */
router.post('', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    sendError(res, 400, 'No file uploaded. Use form field "file".');
    return;
  }

  const userId = req.userId!;
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() || null : null;

  try {
    const result = await uploadToGCS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      userId
    );

    const asset = await Asset.create({
      userId: new mongoose.Types.ObjectId(userId),
      assetProvider: 'google',
      bucket: result.bucket,
      path: result.path,
      url: result.url,
      mimeType: result.mimeType,
      name: result.originalName,
      note,
    });

    res.status(201).json({
      asset: {
        id: asset._id.toString(),
        url: asset.url,
        name: asset.name,
        note: asset.note ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    sendError(res, 502, message);
  }
});

export const assetsRoutes = router;
