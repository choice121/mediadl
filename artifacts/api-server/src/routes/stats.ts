import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, downloadsTable } from "@workspace/db";
import { GetStatsResponse, GetRecentResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /stats
router.get("/stats", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      status: downloadsTable.status,
      count: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint`,
    })
    .from(downloadsTable)
    .groupBy(downloadsTable.status);

  const stats = {
    total: 0,
    pending: 0,
    downloading: 0,
    completed: 0,
    failed: 0,
    totalSizeBytes: 0,
  };

  for (const row of rows) {
    stats.total += row.count;
    (stats as Record<string, number>)[row.status] = row.count;
    if (row.status === "completed") {
      stats.totalSizeBytes = Number(row.totalSize);
    }
  }

  res.json(GetStatsResponse.parse(stats));
});

// GET /recent
router.get("/recent", async (req, res): Promise<void> => {
  const recent = await db.select()
    .from(downloadsTable)
    .where(eq(downloadsTable.status, "completed"))
    .orderBy(desc(downloadsTable.updatedAt))
    .limit(10);

  res.json(GetRecentResponse.parse(recent));
});

export default router;
