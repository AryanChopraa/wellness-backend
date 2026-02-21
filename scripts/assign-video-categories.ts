/**
 * Assign categories to videos that have null category.
 * Uses the same VIDEO_META as seed-real-videos (title → category), mapping
 * relationships → dating, health → education to match the 5 schema categories.
 *
 * Usage:
 *   npx ts-node -r dotenv/config scripts/assign-video-categories.ts
 */

import { connectDb, disconnectDb } from '../src/config/db';
import { Video } from '../src/models/Video';
import { VIDEO_META, toSchemaCategory } from './video-metadata';

async function main() {
  await connectDb();

  const titleToCategory = Object.fromEntries(
    Object.values(VIDEO_META).map((m) => [m.title, toSchemaCategory(m.category)])
  );

  const withNull = await Video.find({ category: null }).lean();
  console.log(`Found ${withNull.length} video(s) with null category.\n`);

  let updated = 0;
  let skipped = 0;
  for (const v of withNull) {
    const title = (v as { title: string }).title;
    const category = titleToCategory[title];
    if (category) {
      await Video.updateOne({ _id: (v as { _id: unknown })._id }, { $set: { category } });
      console.log(`  ✅ "${title.slice(0, 50)}…" → ${category}`);
      updated++;
    } else {
      console.log(`  ⚠️  No mapping for: "${title}"`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
