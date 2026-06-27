import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { logger } from "./logger";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const downloadsDir = path.resolve(workspaceRoot, "artifacts/api-server/downloads");

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

export interface DownloadProgress {
  progress: number | null;
  fileSize: number | null;
  title?: string;
  thumbnail?: string;
  duration?: string;
}

export function buildYtDlpArgs(url: string, format: string, quality: string | null | undefined, outputPath: string): string[] {
  const args: string[] = [];

  if (format === "mp3") {
    args.push("-x", "--audio-format", "mp3");
  } else if (format === "mp4") {
    if (quality && quality !== "best") {
      args.push("-f", `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`);
    } else {
      args.push("-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best");
    }
  } else if (format === "webm") {
    args.push("-f", "bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best");
  } else {
    args.push("-f", "best");
  }

  args.push(
    "--write-thumbnail",
    "--convert-thumbnails", "jpg",
    "--embed-thumbnail",
    "--add-metadata",
    "--no-playlist",
    "--progress",
    "--newline",
    "-o", outputPath,
    url
  );

  return args;
}

export function getYtDlpPath(): string {
  const candidates = [
    "yt-dlp",
    path.join(workspaceRoot, ".local/bin/yt-dlp"),
    "/home/runner/.local/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
  ];

  for (const c of candidates) {
    try {
      const { execSync } = require("child_process");
      execSync(`${c} --version`, { stdio: "ignore" });
      return c;
    } catch {
      continue;
    }
  }

  return "yt-dlp";
}

export async function getMediaInfo(url: string): Promise<{ title: string; thumbnail: string; duration: string } | null> {
  return new Promise((resolve) => {
    const ytdlp = getYtDlpPath();
    const proc = spawn(ytdlp, [
      "--dump-json",
      "--no-playlist",
      url
    ]);

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));

    proc.on("close", (code) => {
      if (code !== 0) {
        logger.warn({ stderr, code }, "yt-dlp info fetch failed");
        resolve(null);
        return;
      }
      try {
        const info = JSON.parse(stdout);
        const durationSecs = info.duration as number | undefined;
        let duration: string | undefined;
        if (durationSecs) {
          const h = Math.floor(durationSecs / 3600);
          const m = Math.floor((durationSecs % 3600) / 60);
          const s = Math.floor(durationSecs % 60);
          duration = h > 0
            ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            : `${m}:${String(s).padStart(2, "0")}`;
        }
        resolve({
          title: info.title || url,
          thumbnail: info.thumbnail || "",
          duration: duration || "",
        });
      } catch {
        resolve(null);
      }
    });
  });
}

export async function runDownload(
  id: number,
  url: string,
  format: string,
  quality: string | null | undefined,
  onProgress: (p: DownloadProgress) => void
): Promise<{ filePath: string; fileSize: number }> {
  return new Promise((resolve, reject) => {
    const ytdlp = getYtDlpPath();
    const ext = format === "mp3" ? "mp3" : format === "webm" ? "webm" : "%(ext)s";
    const outputTemplate = path.join(downloadsDir, `${id}_%(title)s.${ext}`);
    const args = buildYtDlpArgs(url, format, quality, outputTemplate);

    logger.info({ id, ytdlp, args }, "Starting yt-dlp download");

    const proc = spawn(ytdlp, args);

    let lastFilePath = "";
    let stderrBuf = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      const lines = text.split("\n");
      for (const line of lines) {
        const progressMatch = line.match(/\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+)(\w+)/);
        if (progressMatch) {
          const pct = parseFloat(progressMatch[1]);
          const sizeVal = parseFloat(progressMatch[2]);
          const unit = progressMatch[3];
          const multipliers: Record<string, number> = { KiB: 1024, MiB: 1024 * 1024, GiB: 1024 ** 3, KB: 1000, MB: 1e6, GB: 1e9 };
          const fileSize = Math.round(sizeVal * (multipliers[unit] ?? 1));
          onProgress({ progress: pct, fileSize });
        }

        const destMatch = line.match(/\[download\] Destination: (.+)/);
        if (destMatch) lastFilePath = destMatch[1].trim();

        const alreadyMatch = line.match(/\[download\] (.+) has already been downloaded/);
        if (alreadyMatch) lastFilePath = alreadyMatch[1].trim();
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        logger.error({ id, code, stderr: stderrBuf }, "yt-dlp exited with error");
        reject(new Error(stderrBuf || `yt-dlp exited with code ${code}`));
        return;
      }

      // Find the actual output file
      let finalPath = lastFilePath;
      if (!finalPath || !fs.existsSync(finalPath)) {
        // Search downloads dir for file matching id_
        const files = fs.readdirSync(downloadsDir).filter(f => f.startsWith(`${id}_`));
        if (files.length > 0) {
          finalPath = path.join(downloadsDir, files[0]);
        }
      }

      if (!finalPath || !fs.existsSync(finalPath)) {
        reject(new Error("Could not find downloaded file"));
        return;
      }

      const stat = fs.statSync(finalPath);
      resolve({ filePath: finalPath, fileSize: stat.size });
    });
  });
}
