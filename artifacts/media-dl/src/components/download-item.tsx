import { Download as DownloadIcon, Play, AlertCircle, CheckCircle2, RotateCw, Trash2, FileVideo } from "lucide-react";
import { Download } from "@workspace/api-client-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface DownloadItemProps {
  item: Download;
  onRetry?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function DownloadItem({ item, onRetry, onDelete }: DownloadItemProps) {
  const isDownloading = item.status === "downloading";
  const isCompleted = item.status === "completed";
  const isFailed = item.status === "failed";
  const isPending = item.status === "pending";

  return (
    <div className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
      {/* Thumbnail or Icon */}
      <div className="w-24 h-16 shrink-0 bg-secondary rounded overflow-hidden flex items-center justify-center relative border border-border/50">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title || "Thumbnail"} className="w-full h-full object-cover" />
        ) : (
          <FileVideo className="w-6 h-6 text-muted-foreground opacity-50" />
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-mono text-sm font-bold truncate max-w-[400px] text-foreground" title={item.title || item.url}>
              {item.title || item.url}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="font-mono text-[10px] h-5 uppercase rounded-sm bg-secondary text-secondary-foreground border-transparent">
                {item.format} {item.quality && `· ${item.quality}`}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {formatBytes(item.fileSize)} {item.duration && `· ${item.duration}`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isFailed && onRetry && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onRetry(item.id)}>
                <RotateCw className="h-4 w-4" />
              </Button>
            )}
            {isCompleted && item.filePath && (
              <Button size="sm" variant="secondary" className="h-8 font-mono text-xs" asChild>
                <a href={`/api/downloads/${item.id}/file`} download>
                  <DownloadIcon className="h-3 w-3 mr-2" />
                  Save
                </a>
              </Button>
            )}
            {onDelete && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Progress / Status */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
            <span className={cn(
              "flex items-center gap-1.5",
              isDownloading ? "text-primary" :
              isCompleted ? "text-muted-foreground" :
              isFailed ? "text-destructive" : "text-muted-foreground"
            )}>
              {isDownloading && <Play className="w-3 h-3 fill-current" />}
              {isPending && <RotateCw className="w-3 h-3 animate-spin" />}
              {isCompleted && <CheckCircle2 className="w-3 h-3" />}
              {isFailed && <AlertCircle className="w-3 h-3" />}
              {item.status}
            </span>
            {isDownloading && item.progress != null && (
              <span className="text-primary font-bold">{Math.round(item.progress as number)}%</span>
            )}
          </div>

          {(isDownloading || isPending) && (
            <Progress 
              value={item.progress || (isPending ? undefined : 0)} 
              className={cn(
                "h-1 bg-secondary", 
                isPending && "[&>div]:animate-pulse [&>div]:bg-muted-foreground",
                isDownloading && "[&>div]:bg-primary"
              )} 
            />
          )}

          {isFailed && item.errorMessage && (
            <div className="text-xs font-mono text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 break-words">
              {item.errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
