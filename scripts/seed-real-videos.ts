/**
 * Seed real YouTube Shorts as Videos in the DB.
 *
 * What it does:
 *  1. Deletes ALL existing Video + seed Asset documents from the DB
 *  2. Reads every .mp4 from data/yt-downloads/
 *  3. Uploads each to GCS
 *  4. Creates an Asset document
 *  5. Creates a Video document with curated metadata (title, description, tags, category)
 *
 * Usage:
 *   npx ts-node -r dotenv/config scripts/seed-real-videos.ts
 *
 * Requires: GCS_BUCKET + GOOGLE_APPLICATION_CREDENTIALS in .env, and the
 * videos to be present in data/yt-downloads/*.mp4
 */

import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db';
import { Video } from '../src/models/Video';
import { Asset } from '../src/models/Asset';
import { User } from '../src/models/User';
import { uploadToGCS } from '../src/services/gcsUpload';
import { VIDEO_META, toSchemaCategory } from './video-metadata';

// ── Constants ─────────────────────────────────────────────────────────────────

const DOWNLOADS_DIR = path.resolve(__dirname, '../data/yt-downloads');
const SEED_EMAIL = 'seed-videos@wellness-platform.local';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getInfoDuration(infoPath: string): number {
  try {
    const raw = fs.readFileSync(infoPath, 'utf-8');
    const parsed = JSON.parse(raw) as { duration?: number };
    return Math.round(parsed.duration ?? 0);
  } catch {
    return 0;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  seed-real-videos starting…\n');
  await connectDb();

  // 1. Delete all existing videos and their assets
  console.log('🗑️   Deleting existing videos…');
  const allVideos = await Video.find({}, 'assetId').lean();
  const assetIds = allVideos.map((v) => (v as { assetId: mongoose.Types.ObjectId }).assetId).filter(Boolean);
  await Video.deleteMany({});
  console.log(`    Deleted ${allVideos.length} video(s).`);

  if (assetIds.length > 0) {
    const delA = await Asset.deleteMany({ _id: { $in: assetIds } });
    console.log(`    Deleted ${delA.deletedCount} associated asset(s).`);
  }

  // 2. Find or create the seed user
  let seedUser = await User.findOne({ email: SEED_EMAIL }).lean() as { _id: mongoose.Types.ObjectId } | null;
  if (!seedUser) {
    const created = await User.create({ email: SEED_EMAIL, username: 'seed_videos' });
    seedUser = { _id: (created as unknown as { _id: mongoose.Types.ObjectId })._id };
    console.log('    Created seed user.');
  }
  const seedUserId = seedUser._id;

  // 3. Find all mp4 files, sorted by name (so 001_ comes first)
  const mp4Files = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter((f) => f.endsWith('.mp4'))
    .sort();

  if (mp4Files.length === 0) {
    console.error(`❌  No .mp4 files found in ${DOWNLOADS_DIR}`);
    process.exit(1);
  }

  console.log(`\n📦  Uploading ${mp4Files.length} video(s) to GCS and seeding DB…\n`);

  for (const filename of mp4Files) {
    const prefix = filename.slice(0, 3); // e.g. "001"
    const meta = VIDEO_META[prefix];

    if (!meta) {
      console.warn(`⚠️   No metadata for prefix "${prefix}" (${filename}). Skipping.`);
      continue;
    }

    const mp4Path = path.join(DOWNLOADS_DIR, filename);
    const infoPath = mp4Path.replace(/\.mp4$/, '.info.json');
    const durationSec = getInfoDuration(infoPath);
    const duration = formatDuration(durationSec);

    process.stdout.write(`  [${prefix}] Uploading "${meta.title}"…`);

    try {
      const buffer = fs.readFileSync(mp4Path);
      const upload = await uploadToGCS(buffer, filename, 'video/mp4', String(seedUserId));

      const asset = await Asset.create({
        userId: seedUserId,
        assetProvider: 'google',
        bucket: upload.bucket,
        path: upload.path,
        url: upload.url,
        mimeType: 'video/mp4',
        name: filename,
      });

      await Video.create({
        title: meta.title,
        description: meta.description,
        duration,
        durationSeconds: durationSec,
        thumbnailUrl: '',
        source: 'asset',
        assetId: asset._id,
        format: 'reel',
        category: toSchemaCategory(meta.category),
        tags: meta.tags,
        fearAddressed: null,
        severityLevels: [],
        relationshipFilter: [],
        isActive: true,
      });

      console.log(` ✅  (${duration}, ${meta.category})`);
    } catch (err) {
      console.log(` ❌  Failed: ${(err as Error).message}`);
    }
  }

  const total = await Video.countDocuments({});
  console.log(`\n✅  Done! ${total} video(s) now in DB.\n`);

  await disconnectDb();
}

main().catch((err) => {
  console.error('\n❌ ', err.message);
  process.exit(1);
});
