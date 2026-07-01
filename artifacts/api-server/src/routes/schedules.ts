import { Router, type IRouter } from "express";
import { db, schedulesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";
import { registerSchedule, unregisterSchedule } from "../lib/scheduler";
import { enumeratePlaylistUrls, isChannelOrPlaylistUrl } from "../lib/downloader";
import { startDownloadJob } from "./downloads";
import cron from "node-cron";

const router: IRouter = Router();

const CreateScheduleBody = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  format: z.enum(["mp4", "mp3", "webm", "best"]).default("best"),
  quality: z.string().optional(),
  cronExpr: z.string().min(1),
  enabled: z.boolean().default(true),
});

const UpdateScheduleBody = z.object({
  label: z.string().min(1).optional(),
  url: z.string().url().optional(),
  format: z.enum(["mp4", "mp3", "webm", "best"]).optional(),
  quality: z.string().optional(),
  cronExpr: z.string().optional(),
  enabled: z.boolean().optional(),
});

// GET /schedules
router.get("/schedules", async (_req, res): Promise<void> => {
  const schedules = await db
    .select()
    .from(schedulesTable)
    .orderBy(desc(schedulesTable.createdAt));
  res.json(schedules);
});

// POST /schedules
router.post("/schedules", async (req, res): Promise<void> => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!cron.validate(parsed.data.cronExpr)) {
    res.status(400).json({ error: "Invalid cron expression" });
    return;
  }

  const [schedule] = await db
    .insert(schedulesTable)
    .values({
      label: parsed.data.label,
      url: parsed.data.url,
      format: parsed.data.format,
      quality: parsed.data.quality ?? null,
      cronExpr: parsed.data.cronExpr,
      enabled: parsed.data.enabled,
    })
    .returning();

  if (schedule.enabled) {
    registerSchedule(schedule.id, schedule.cronExpr);
  }

  res.status(201).json(schedule);
});

// GET /schedules/:id
router.get("/schedules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, id));

  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }
  res.json(schedule);
});

// PUT /schedules/:id
router.put("/schedules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.cronExpr && !cron.validate(parsed.data.cronExpr)) {
    res.status(400).json({ error: "Invalid cron expression" });
    return;
  }

  const [schedule] = await db
    .update(schedulesTable)
    .set({
      ...parsed.data,
      quality: parsed.data.quality ?? undefined,
    })
    .where(eq(schedulesTable.id, id))
    .returning();

  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }

  // Re-register or unregister cron task based on enabled state
  if (schedule.enabled) {
    registerSchedule(schedule.id, schedule.cronExpr);
  } else {
    unregisterSchedule(schedule.id);
  }

  res.json(schedule);
});

// DELETE /schedules/:id
router.delete("/schedules/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  unregisterSchedule(id);
  await db.delete(schedulesTable).where(eq(schedulesTable.id, id));
  res.sendStatus(204);
});

// POST /schedules/:id/run — run immediately
router.post("/schedules/:id/run", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, id));

  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }

  try {
    let urls: string[] = [];
    if (isChannelOrPlaylistUrl(schedule.url)) {
      urls = await enumeratePlaylistUrls(schedule.url);
    } else {
      urls = [schedule.url];
    }

    const { downloadsTable: dlTable } = await import("@workspace/db");
    const created = await Promise.all(
      urls.map((url) =>
        db
          .insert(dlTable)
          .values({ url, format: schedule.format, quality: schedule.quality, status: "pending", progress: 0 })
          .returning()
          .then(([row]) => row)
      )
    );

    for (const dl of created) {
      startDownloadJob(dl.id).catch((err) => {
        logger.error({ id: dl.id, err }, "Manual schedule run job failed");
      });
    }

    await db
      .update(schedulesTable)
      .set({ lastRunAt: new Date() })
      .where(eq(schedulesTable.id, id));

    res.json({ dispatched: created.length, jobs: created });
  } catch (err) {
    logger.error({ scheduleId: id, err }, "Failed to run schedule manually");
    res.status(500).json({ error: "Failed to run schedule" });
  }
});

export default router;
