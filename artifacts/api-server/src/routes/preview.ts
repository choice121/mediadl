import { Router, type IRouter } from "express";
import { spawn } from "child_process";
import { getYtDlpPath, getCookiesArgs, isChannelOrPlaylistUrl } from "../lib/downloader";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface PreviewVideo {
  id: string | null;
  url: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
}

/**
 * GET /preview?url=<encoded>
 * Returns a list of videos for a channel/playlist URL (or wraps a single video).
 * Does not create any download jobs.
 */
router.get("/preview", async (req, res): Promise<void> => {
  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!url) {
    res.status(400).json({ error: "url query parameter is required" });
    return;
  }

  const ytdlp = getYtDlpPath();
  const isList = isChannelOrPlaylistUrl(url);

  const args = [
    "--flat-playlist",
    "--no-warnings",
    "--print",
    "%(id)s\t%(webpage_url)s\t%(title)s\t%(thumbnail)s\t%(duration)s\t%(uploader)s",
    ...getCookiesArgs(),
    "--js-runtimes", `nodejs:${process.execPath}`,
    "--playlist-items", "1-200", // cap at 200 to avoid huge channels timing out
    url,
  ];

  logger.info({ url, isList, args }, "Preview: running yt-dlp");

  const proc = spawn(ytdlp, args);

  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
  proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

  proc.on("close", (code) => {
    if (code !== 0 && !stdout.trim()) {
      logger.warn({ code, stderr }, "Preview: yt-dlp failed");
      res.status(422).json({ error: stderr.split("\n").filter(Boolean).pop() || "Failed to fetch URL info" });
      return;
    }

    const videos: PreviewVideo[] = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [id, videoUrl, title, thumbnail, durationStr, uploader] = line.split("\t");
        const duration = durationStr && durationStr !== "NA" ? parseFloat(durationStr) : null;
        return {
          id: id !== "NA" && id ? id : null,
          url: videoUrl || url,
          title: title || "Unknown",
          thumbnail: thumbnail && thumbnail !== "NA" ? thumbnail : null,
          duration: isNaN(duration as number) ? null : duration,
          uploader: uploader && uploader !== "NA" ? uploader : null,
        };
      });

    logger.info({ count: videos.length, url }, "Preview: complete");

    res.json({
      videos,
      isSingle: !isList,
      total: videos.length,
    });
  });
});

export default router;
