// Zod validation schemas (used by the API server for request/response validation)
export * from "./generated/api";

// TypeScript types (re-exported for consumers that need the plain interfaces)
export type { Download } from "./generated/types/download";
export type { DownloadFormat } from "./generated/types/downloadFormat";
export type { DownloadInput } from "./generated/types/downloadInput";
export type { DownloadInputFormat } from "./generated/types/downloadInputFormat";
export type { DownloadStatus } from "./generated/types/downloadStatus";
export type { HealthStatus } from "./generated/types/healthStatus";
export type { ListDownloadsParams } from "./generated/types/listDownloadsParams";
export type { ListDownloadsStatus } from "./generated/types/listDownloadsStatus";
export type { Stats } from "./generated/types/stats";
export type { Schedule } from "./generated/types/schedule";
export type { ScheduleFormat } from "./generated/types/scheduleFormat";
export type { ScheduleInput } from "./generated/types/scheduleInput";
export type { ScheduleInputFormat } from "./generated/types/scheduleInputFormat";
export type { ScheduleUpdate } from "./generated/types/scheduleUpdate";
export type { ScheduleUpdateFormat } from "./generated/types/scheduleUpdateFormat";
export type { ScheduleRunResponse } from "./generated/types/scheduleRunResponse";
export type { BatchDownloadInput } from "./generated/types/batchDownloadInput";
