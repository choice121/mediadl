import { Download as DownloadIcon, Play, AlertCircle, CheckCircle2, RotateCw, Trash2, FileVideo } from "lucide-react";
import { Download } from "@workspace/api-client-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
    <div className="w-full bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex gap-4 items-start">
        {/* Thumbnail */}
        <div className="w-20 h-20 shrink-0 bg-secondary rounded-lg overflow-hidden flex items-center justify-center border border-border">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt={item.title || "Thumbnail"} className="w-full h-full object-cover" />
          ) : (
            <FileVideo className="w-8 h-8 text-muted-foreground opacity-50" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col pt-1">
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight" title={item.title || item.url}>
            {item.title || item.url}
          </h4>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center rounded-sm bg-secondary px-2 py-0.5 text-xs font-semibold uppercase text-secondary-foreground">
              {item.format} {item.quality && `· ${item.quality}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(item.fileSize)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
            <span className={cn(
              "flex items-center gap-1",
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
              <span className="text-primary font-bold ml-auto">{Math.round(item.progress as number)}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {(isDownloading || isPending) && (
        <Progress 
          value={item.progress || (isPending ? undefined : 0)} 
          className={cn(
            "h-2 w-full bg-secondary rounded-full overflow-hidden", 
            isPending && "[&>div]:animate-pulse [&>div]:bg-muted-foreground",
            isDownloading && "[&>div]:bg-primary"
          )} 
        />
      )}

      {/* Error Message */}
      {isFailed && item.errorMessage && (
        <div className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 break-words">
          {item.errorMessage}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1">
        {isCompleted && item.filePath && (
          <div className="flex-1 flex flex-col">
            <Button size="lg" className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg" asChild>
              <a href={`/api/downloads/${item.id}/file`} download>
                <DownloadIcon className="h-5 w-5 mr-2" />
                Save to device
              </a>
            </Button>
            <span className="text-[10px] text-muted-foreground text-center mt-1.5">File saves to your Downloads folder</span>
          </div>
        )}
        
        {isFailed && onRetry && (
          <Button size="lg" variant="secondary" className="flex-1 h-12 rounded-lg font-semibold" onClick={() => onRetry(item.id)}>
            <RotateCw className="h-5 w-5 mr-2" />
            Retry
          </Button>
        )}
        
        {onDelete && (
          <Button size="icon" variant="ghost" className="h-12 w-12 rounded-lg text-muted-foreground hover:text-destructive shrink-0 bg-secondary/50" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
