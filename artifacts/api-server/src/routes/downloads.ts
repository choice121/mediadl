import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { db, downloadsTable } from "@workspace/db";
import {
  CreateDownloadBody,
  BatchCreateDownloadBody,
  GetDownloadParams,
  DeleteDownloadParams,
  RetryDownloadParams,
  DownloadFileParams,
  ListDownloadsQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { runDownload, getMediaInfo, downloadsDir } from "../lib/downloader";

const router: IRouter = Router();

// In-memory active job tracking
const activeJobs = new Set<number>();

async function startDownloadJob(id: number) {
  if (activeJobs.has(id)) return;
  activeJobs.add(id);

  const [job] = await db.select().from(downloadsTable).where(eq(downloadsTable.id, id));
  if (!job) {
    activeJobs.delete(id);
    return;
  }

  // Fetch metadata first
  try {
    const info = await getMediaInfo(job.url);
    if (info) {
      await db.update(downloadsTable)
        .set({
          title: info.title,
          thumbnail: info.thumbnail,
          duration: info.duration,
          status: "downloading",
          progress: 0,
        })
        .where(eq(downloadsTable.id, id));
    } else {
      await db.update(downloadsTable)
        .set({ status: "downloading", progress: 0 })
        .where(eq(downloadsTable.id, id));
    }
  } catch (e) {
    logger.warn({ id, err: e }, "Could not fetch media info, continuing anyway");
    await db.update(downloadsTable)
      .set({ status: "downloading", progress: 0 })
      .where(eq(downloadsTable.id, id));
  }

  try {
    const { filePath, fileSize } = await runDownload(
      id,
      job.url,
      job.format,
      job.quality,
      async ({ progress, fileSize }) => {
        await db.update(downloadsTable)
          .set({ progress: progress ?? undefined, fileSize: fileSize ?? undefined })
          .where(eq(downloadsTable.id, id));
      }
    );

    await db.update(downloadsTable)
      .set({
        status: "completed",
        filePath,
        fileSize,
        progress: 100,
        errorMessage: null,
      })
      .where(eq(downloadsTable.id, id));

    logger.info({ id, filePath }, "Download completed");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.update(downloadsTable)
      .set({ status: "failed", errorMessage: msg, progress: null })
      .where(eq(downloadsTable.id, id));
    logger.error({ id, err }, "Download failed");
  } finally {
    activeJobs.delete(id);
  }
}

// GET /downloads
router.get("/downloads", async (req, res): Promise<void> => {
  const queryParsed = ListDownloadsQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  const { status, format } = queryParsed.data;
  let query = db.select().from(downloadsTable).$dynamic();

  const conditions = [];
  if (status) conditions.push(eq(downloadsTable.status, status));
  if (format) conditions.push(eq(downloadsTable.format, format));

  const downloads = await db.select().from(downloadsTable)
    .where(conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined)
    .orderBy(desc(downloadsTable.createdAt));

  res.json(downloads);
});

// POST /downloads
router.post("/downloads", async (req, res): Promise<void> => {
  const parsed = CreateDownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, format, quality } = parsed.data;

  const [download] = await db.insert(downloadsTable)
    .values({ url, format, quality: quality ?? null, status: "pending", progress: 0 })
    .returning();

  req.log.info({ id: download.id, url, format }, "Download job created");

  // Start async (don't await)
  startDownloadJob(download.id).catch((err) => {
    logger.error({ id: download.id, err }, "Unhandled error in download job");
  });

  res.status(201).json(download);
});

// POST /downloads/batch
router.post("/downloads/batch", async (req, res): Promise<void> => {
  const parsed = BatchCreateDownloadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const created = await Promise.all(
    parsed.data.items.map(({ url, format, quality }) =>
      db.insert(downloadsTable)
        .values({ url, format, quality: quality ?? null, status: "pending", progress: 0 })
        .returning()
        .then(([row]) => row)
    )
  );

  for (const dl of created) {
    startDownloadJob(dl.id).catch((err) => {
      logger.error({ id: dl.id, err }, "Unhandled error in batch download job");
    });
  }

  req.log.info({ count: created.length }, "Batch download jobs created");
  res.status(201).json(created);
});

// DELETE /downloads/completed — bulk clear all completed downloads
router.delete("/downloads/completed", async (req, res): Promise<void> => {
  const completed = await db.select().from(downloadsTable).where(eq(downloadsTable.status, "completed"));

  let deleted = 0;
  for (const dl of completed) {
    if (dl.filePath && fs.existsSync(dl.filePath)) {
      try { fs.unlinkSync(dl.filePath); } catch (e) {
        logger.warn({ id: dl.id, err: e }, "Could not delete file during bulk clear");
      }
    }
    await db.delete(downloadsTable).where(eq(downloadsTable.id, dl.id));
    deleted++;
  }

  req.log.info({ deleted }, "Bulk cleared completed downloads");
  res.json({ deleted });
});

// GET /downloads/:id
router.get("/downloads/:id", async (req, res): Promise<void> => {
  const params = GetDownloadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [download] = await db.select().from(downloadsTable).where(eq(downloadsTable.id, params.data.id));
  if (!download) {
    res.status(404).json({ error: "Download not found" });
    return;
  }

  res.json(download);
});

// DELETE /downloads/:id
router.delete("/downloads/:id", async (req, res): Promise<void> => {
  const params = DeleteDownloadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [download] = await db.select().from(downloadsTable).where(eq(downloadsTable.id, params.data.id));
  if (!download) {
    res.status(404).json({ error: "Download not found" });
    return;
  }

  // Delete file if exists
  if (download.filePath && fs.existsSync(download.filePath)) {
    try {
      fs.unlinkSync(download.filePath);
    } catch (e) {
      logger.warn({ id: download.id, err: e }, "Could not delete file");
    }
  }

  await db.delete(downloadsTable).where(eq(downloadsTable.id, params.data.id));
  res.sendStatus(204);
});

// POST /downloads/:id/retry
router.post("/downloads/:id/retry", async (req, res): Promise<void> => {
  const params = RetryDownloadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [download] = await db.select().from(downloadsTable).where(eq(downloadsTable.id, params.data.id));
  if (!download) {
    res.status(404).json({ error: "Download not found" });
    return;
  }

  const [updated] = await db.update(downloadsTable)
    .set({ status: "pending", errorMessage: null, progress: 0 })
    .where(eq(downloadsTable.id, params.data.id))
    .returning();

  // Start async
  startDownloadJob(updated.id).catch((err) => {
    logger.error({ id: updated.id, err }, "Unhandled error in retry job");
  });

  res.json(updated);
});

// GET /downloads/:id/file
router.get("/downloads/:id/file", async (req, res): Promise<void> => {
  const params = DownloadFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [download] = await db.select().from(downloadsTable).where(eq(downloadsTable.id, params.data.id));
  if (!download || download.status !== "completed" || !download.filePath) {
    res.status(404).json({ error: "File not found or download not completed" });
    return;
  }

  if (!fs.existsSync(download.filePath)) {
    res.status(404).json({ error: "File missing from disk" });
    return;
  }

  const rawFilename = path.basename(download.filePath);
  // Strip characters that are illegal in HTTP header quoted-strings
  const safeFilename = rawFilename.replace(/[^\x20-\x7E]/g, "_").replace(/[\\"/]/g, "_");
  // RFC 5987 encoded form preserves the full original name for browsers that support it
  const encodedFilename = encodeURIComponent(rawFilename);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
  );
  res.setHeader("Content-Type", "application/octet-stream");

  const fileSize = fs.statSync(download.filePath).size;
  res.setHeader("Content-Length", fileSize);

  const stream = fs.createReadStream(download.filePath);
  stream.pipe(res);
});

export default router;
