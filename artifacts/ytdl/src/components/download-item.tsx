import React from "react";
import { format } from "date-fns";
import { Download as DownloadType } from "@workspace/api-client-react";
import {
  FileVideo,
  FileAudio,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Trash2,
  Download as DownloadIcon,
  RefreshCcw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useDeleteDownload, useRetryDownload } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface DownloadItemProps {
  download: DownloadType;
  showActions?: boolean;
}

export function DownloadItem({ download, showActions = true }: DownloadItemProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteDownload();
  const retryMutation = useRetryDownload();

  const isDownloading = download.status === "downloading";
  const isCompleted = download.status === "completed";
  const isFailed = download.status === "failed";
  const isPending = download.status === "pending";

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: download.id },
      {
        onSuccess: () => toast({ title: "Removed" }),
        onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
      }
    );
  };

  const handleRetry = () => {
    retryMutation.mutate(
      { id: download.id },
      { onSuccess: () => toast({ title: "Retrying..." }) }
    );
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div
      data-testid={`download-item-${download.id}`}
      className="flex gap-3 p-3 bg-card border border-border rounded-lg overflow-hidden"
    >
      <div className="shrink-0 w-20 h-14 bg-muted rounded overflow-hidden relative border border-border/50 flex items-center justify-center">
        {download.thumbnail ? (
          <img
            src={download.thumbnail}
            alt={download.title || "Thumbnail"}
            className="w-full h-full object-cover"
          />
        ) : download.format === "mp3" ? (
          <FileAudio className="w-6 h-6 text-muted-foreground" />
        ) : (
          <FileVideo className="w-6 h-6 text-muted-foreground" />
        )}
        {download.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-px text-[9px] font-mono rounded text-white">
            {download.duration}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-medium leading-tight line-clamp-2"
            title={download.title || download.url}
          >
            {download.title || download.url}
          </p>
          <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 bg-muted text-muted-foreground rounded border border-border/50 uppercase">
            {download.format}
            {download.quality && download.quality !== "best" ? ` ${download.quality}` : ""}
          </span>
        </div>

        <div className="mt-1 space-y-1.5">
          {isFailed && download.errorMessage && (
            <div className="flex items-start gap-1 text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20">
              <AlertCircle className="w-3 h-3 mt-px shrink-0" />
              <span className="line-clamp-2">{download.errorMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {isCompleted ? (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              ) : isFailed ? (
                <XCircle className="w-3 h-3 text-destructive shrink-0" />
              ) : isDownloading ? (
                <Play className="w-3 h-3 text-primary animate-pulse shrink-0" />
              ) : (
                <Pause className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                {download.status}
              </span>
              {formatFileSize(download.fileSize) && (
                <>
                  <span className="text-muted-foreground/30 text-[10px]">·</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatFileSize(download.fileSize)}
                  </span>
                </>
              )}
              <span className="text-muted-foreground/30 text-[10px]">·</span>
              <span className="text-[10px] text-muted-foreground/60">
                {format(new Date(download.createdAt), "MMM d")}
              </span>
            </div>

            {showActions && (
              <div className="flex items-center gap-1.5 shrink-0">
                {isFailed && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={handleRetry}
                    disabled={retryMutation.isPending}
                    data-testid={`button-retry-${download.id}`}
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isCompleted && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 border-primary/50 text-primary"
                    asChild
                    data-testid={`button-save-${download.id}`}
                  >
                    <a href={`/api/downloads/${download.id}/file`} download>
                      <DownloadIcon className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${download.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {(isDownloading || isPending) && (
            <div className="flex items-center gap-2">
              <Progress value={download.progress || 0} className="h-1 flex-1" />
              {isDownloading && download.progress != null && (
                <span className="text-[10px] font-mono text-primary shrink-0 w-8 text-right">
                  {download.progress.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
