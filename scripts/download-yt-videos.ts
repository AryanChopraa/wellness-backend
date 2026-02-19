/**
 * YouTube batch downloader — supports single URLs, playlists, and CSV files
 *
 * Usage:
 *   npx ts-node scripts/download-yt-videos.ts <YouTube-URL> [output-folder]
 *   npx ts-node scripts/download-yt-videos.ts --csv <file.csv> [output-folder]
 *
 * Examples:
 *   npx ts-node scripts/download-yt-videos.ts "https://youtu.be/VIDEO_ID"
 *   npx ts-node scripts/download-yt-videos.ts "https://www.youtube.com/playlist?list=PLxxx" ./data/downloads
 *   npx ts-node scripts/download-yt-videos.ts --csv /path/to/urls.csv ./data/downloads
 *
 * Requires yt-dlp:
 *   brew install yt-dlp        (macOS)
 *   pip install yt-dlp         (cross-platform)
 */

import { execSync, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_OUTPUT_DIR = path.resolve(__dirname, "../data/yt-downloads");

/**
 * For Shorts: prefer vertical mp4. Fallback to best available.
 * For regular videos: best video+audio up to 1080p.
 */
const FORMAT = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";

const FILENAME_TMPL = "%(autonumber)03d_%(title).80s.%(ext)s";

// ── Helpers ───────────────────────────────────────────────────────────────────

function checkYtDlp(): string {
  for (const bin of ["yt-dlp", "yt_dlp"]) {
    try {
      execSync(`which ${bin}`, { stdio: "ignore" });
      return bin;
    } catch {
      // not found
    }
  }
  console.error(`
❌  yt-dlp not found. Install it first:

    macOS:   brew install yt-dlp
    pip:     pip install yt-dlp
    Linux:   sudo apt install yt-dlp   (or use pip)

Then re-run this script.
`);
  process.exit(1);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁  Created output folder: ${dir}`);
  }
}

function isYouTubeUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.replace("www.", "");
    return ["youtube.com", "youtu.be", "music.youtube.com"].includes(host);
  } catch {
    return false;
  }
}

/** Parse a CSV/text file — extract every line that looks like a YouTube URL */
function parseUrlsFromCsv(csvPath: string): string[] {
  if (!fs.existsSync(csvPath)) {
    console.error(`❌  File not found: ${csvPath}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(csvPath, "utf-8").split(/\r?\n/);
  const urls: string[] = [];
  for (const line of lines) {
    // Each cell in the line might be quoted or bare; try each comma-separated token
    for (const token of line.split(",")) {
      const candidate = token.trim().replace(/^"|"$/g, "");
      if (candidate.startsWith("http") && isYouTubeUrl(candidate)) {
        urls.push(candidate);
      }
    }
  }
  return [...new Set(urls)]; // deduplicate
}

/** Write URLs to a temp file so yt-dlp can batch-download them */
function writeBatchFile(urls: string[]): string {
  const tmpPath = path.join(require("os").tmpdir(), `yt-batch-${Date.now()}.txt`);
  fs.writeFileSync(tmpPath, urls.join("\n") + "\n", "utf-8");
  return tmpPath;
}

async function downloadUrl(ytDlp: string, url: string, outputDir: string, index?: number) {
  const label = index !== undefined ? `[${index}]` : "";
  console.log(`\n${label} Downloading: ${url}`);

  const outputTemplate = path.join(outputDir, FILENAME_TMPL);

  const ytArgs = [
    url,
    "--format", FORMAT,
    "--output", outputTemplate,
    "--merge-output-format", "mp4",
    "--embed-thumbnail",
    "--embed-metadata",
    "--add-metadata",
    "--write-info-json",
    "--no-overwrites",
    "--retries", "5",
    "--sleep-interval", "1",
    "--max-sleep-interval", "3",
    "--progress",
    "--ignore-errors",
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ytDlp, ytArgs, { stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0 || code === 1) resolve(); // 1 = partial success
      else reject(new Error(`yt-dlp exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function downloadBatch(ytDlp: string, urls: string[], outputDir: string) {
  console.log(`\n📋  Downloading ${urls.length} URL(s) from CSV...`);

  // Write a batch file and pass it to yt-dlp in one go (faster, shares rate-limit sleep)
  const batchFile = writeBatchFile(urls);

  const outputTemplate = path.join(outputDir, FILENAME_TMPL);

  const ytArgs = [
    "--batch-file", batchFile,
    "--format", FORMAT,
    "--output", outputTemplate,
    "--merge-output-format", "mp4",
    "--embed-thumbnail",
    "--embed-metadata",
    "--add-metadata",
    "--write-info-json",
    "--no-overwrites",
    "--retries", "5",
    "--sleep-interval", "2",
    "--max-sleep-interval", "5",
    "--progress",
    "--console-title",
    "--ignore-errors",
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ytDlp, ytArgs, { stdio: "inherit" });
    child.on("close", (code) => {
      fs.unlinkSync(batchFile); // clean up temp file
      if (code === 0 || code === 1) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}`));
    });
    child.on("error", (err) => {
      try { fs.unlinkSync(batchFile); } catch {}
      reject(err);
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage:
  npx ts-node scripts/download-yt-videos.ts <YouTube-URL> [output-folder]
  npx ts-node scripts/download-yt-videos.ts --csv <file.csv> [output-folder]

Default output folder: ${DEFAULT_OUTPUT_DIR}
    `);
    process.exit(0);
  }

  const ytDlp = checkYtDlp();

  // ── CSV mode ──
  if (args[0] === "--csv") {
    const csvPath = args[1];
    if (!csvPath) {
      console.error("❌  --csv requires a file path. E.g: --csv /path/to/urls.csv");
      process.exit(1);
    }
    const outputDir = path.resolve(args[2] ?? DEFAULT_OUTPUT_DIR);
    ensureDir(outputDir);

    const urls = parseUrlsFromCsv(path.resolve(csvPath));
    if (urls.length === 0) {
      console.error(`❌  No valid YouTube URLs found in: ${csvPath}`);
      process.exit(1);
    }

    console.log(`\n🎬  Found ${urls.length} YouTube URL(s) in CSV`);
    console.log(`📂  Output folder: ${outputDir}`);
    urls.forEach((u, i) => console.log(`    ${String(i + 1).padStart(3, " ")}. ${u}`));

    await downloadBatch(ytDlp, urls, outputDir);

  } else {
    // ── Single URL / playlist mode ──
    const rawUrl = args[0];
    if (!isYouTubeUrl(rawUrl)) {
      console.error(`❌  Not a valid YouTube URL: "${rawUrl}"`);
      process.exit(1);
    }
    const outputDir = path.resolve(args[1] ?? DEFAULT_OUTPUT_DIR);
    ensureDir(outputDir);

    console.log(`\n🎬  Downloading: ${rawUrl}`);
    console.log(`📂  Output folder: ${outputDir}`);
    await downloadUrl(ytDlp, rawUrl, outputDir);
  }

  // Summary
  const files = fs.readdirSync(
    path.resolve(args[0] === "--csv" ? (args[2] ?? DEFAULT_OUTPUT_DIR) : (args[1] ?? DEFAULT_OUTPUT_DIR))
  ).filter((f) => f.endsWith(".mp4"));

  console.log(`\n✅  Done! ${files.length} video(s) in output folder.`);
}

main().catch((err) => {
  console.error(`\n❌  ${err.message}`);
  process.exit(1);
});
