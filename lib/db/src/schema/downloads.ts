import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const downloadsTable = pgTable("downloads", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title"),
  thumbnail: text("thumbnail"),
  status: text("status").notNull().default("pending"),
  format: text("format").notNull().default("best"),
  quality: text("quality"),
  fileSize: integer("file_size"),
  filePath: text("file_path"),
  errorMessage: text("error_message"),
  progress: real("progress"),
  duration: text("duration"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDownloadSchema = createInsertSchema(downloadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloadsTable.$inferSelect;
