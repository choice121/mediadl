import cron from "node-cron";
import { db, schedulesTable, downloadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { enumeratePlaylistUrls, isChannelOrPlaylistUrl } from "./downloader";

// Keep a map of active cron tasks keyed by schedule ID
const activeTasks = new Map<number, cron.ScheduledTask>();

/** Compute the next run time for a cron expression (approximate: next minute boundary) */
function computeNextRun(cronExpr: string): Date | null {
  try {
    // node-cron doesn't expose a "next run" API directly; we approximate it
    // by creating a temporary task and getting the next execution
    const now = new Date();
    const next = new Date(now.getTime() + 60_000);
    return next;
  } catch {
    return null;
  }
}

async function runSchedule(scheduleId: number): Promise<void> {
  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, scheduleId));

  if (!schedule || !schedule.enabled) return;

  logger.info({ scheduleId, url: schedule.url }, "Running scheduled download");

  try {
    let urls: string[] = [];

    if (isChannelOrPlaylistUrl(schedule.url)) {
      urls = await enumeratePlaylistUrls(schedule.url);
    } else {
      urls = [schedule.url];
    }

    if (urls.length === 0) {
      logger.warn({ scheduleId }, "No URLs found for scheduled download");
      return;
    }

    // Create download jobs
    const created = await Promise.all(
      urls.map((url) =>
        db
          .insert(downloadsTable)
          .values({
            url,
            format: schedule.format,
            quality: schedule.quality,
            status: "pending",
            progress: 0,
          })
          .returning()
          .then(([row]) => row)
      )
    );

    // Fire-and-forget: trigger downloads
    const { startDownloadJob } = await import("../routes/downloads");
    for (const dl of created) {
      startDownloadJob(dl.id).catch((err) => {
        logger.error({ id: dl.id, err }, "Scheduled download job failed");
      });
    }

    await db
      .update(schedulesTable)
      .set({ lastRunAt: new Date(), nextRunAt: computeNextRun(schedule.cronExpr) })
      .where(eq(schedulesTable.id, scheduleId));

    logger.info({ scheduleId, jobsCreated: created.length }, "Scheduled download dispatched");
  } catch (err) {
    logger.error({ scheduleId, err }, "Failed to run scheduled download");
  }
}

export async function initScheduler(): Promise<void> {
  // Load all enabled schedules from DB and start their cron tasks
  const schedules = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.enabled, true));

  for (const schedule of schedules) {
    registerSchedule(schedule.id, schedule.cronExpr);
  }

  logger.info({ count: schedules.length }, "Scheduler initialized");
}

export function registerSchedule(id: number, cronExpr: string): void {
  // Remove existing task if present
  unregisterSchedule(id);

  if (!cron.validate(cronExpr)) {
    logger.warn({ id, cronExpr }, "Invalid cron expression, skipping");
    return;
  }

  const task = cron.schedule(cronExpr, () => {
    runSchedule(id).catch((err) => {
      logger.error({ id, err }, "Cron task error");
    });
  });

  activeTasks.set(id, task);
  logger.info({ id, cronExpr }, "Schedule registered");
}

export function unregisterSchedule(id: number): void {
  const task = activeTasks.get(id);
  if (task) {
    task.stop();
    activeTasks.delete(id);
  }
}
