import React from "react";
import { useListDownloads, useClearCompleted, useGetStats } from "@workspace/api-client-react";
import { DownloadItem } from "@/components/download-item";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Queue() {
  const { toast } = useToast();
  const clearCompleted = useClearCompleted();

  const { data: downloads } = useListDownloads({}, { query: { refetchInterval: 2000 } });
  const { data: stats } = useGetStats({ query: { refetchInterval: 2000 } });

  const handleClearCompleted = () => {
    clearCompleted.mutate(undefined, {
      onSuccess: () => toast({ title: "Cleared completed" }),
    });
  };

  const pendingDownloads = downloads?.filter((d) => d.status === "pending") || [];
  const activeDownloads = downloads?.filter((d) => d.status === "downloading") || [];
  const completedDownloads = downloads?.filter((d) => d.status === "completed") || [];
  const failedDownloads = downloads?.filter((d) => d.status === "failed") || [];

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-5 pb-4 flex items-center justify-between border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Queue</h1>
          <p className="text-xs text-muted-foreground mt-0.5">All download jobs</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCompleted}
          disabled={completedDownloads.length === 0 || clearCompleted.isPending}
          className="h-8 font-mono text-[10px] uppercase tracking-wider"
          data-testid="button-clear-completed"
        >
          <Trash2 className="w-3 h-3 mr-1.5" />
          Clear Done
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 border-b border-border bg-card">
          <div className="flex flex-col items-center py-3 border-r border-border">
            <span className="text-[9px] font-mono text-muted-foreground uppercase mb-1">Total</span>
            <span className="text-lg font-bold font-mono">{stats.total}</span>
          </div>
          <div className="flex flex-col items-center py-3 border-r border-border">
            <span className="text-[9px] font-mono text-primary uppercase mb-1">Active</span>
            <span className="text-lg font-bold font-mono text-primary">{stats.downloading}</span>
          </div>
          <div className="flex flex-col items-center py-3 border-r border-border">
            <span className="text-[9px] font-mono text-green-500 uppercase mb-1">Done</span>
            <span className="text-lg font-bold font-mono text-green-500">{stats.completed}</span>
          </div>
          <div className="flex flex-col items-center py-3">
            <span className="text-[9px] font-mono text-destructive uppercase mb-1">Failed</span>
            <span className="text-lg font-bold font-mono text-destructive">{stats.failed}</span>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-4">
        {downloads && downloads.length > 0 ? (
          <div className="space-y-6">
            {activeDownloads.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary pb-1 border-b border-primary/20">
                  Active ({activeDownloads.length})
                </h3>
                {activeDownloads.map((d) => (
                  <DownloadItem key={d.id} download={d} />
                ))}
              </section>
            )}

            {pendingDownloads.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground pb-1 border-b border-border">
                  Pending ({pendingDownloads.length})
                </h3>
                {pendingDownloads.map((d) => (
                  <DownloadItem key={d.id} download={d} />
                ))}
              </section>
            )}

            {failedDownloads.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-destructive pb-1 border-b border-destructive/20">
                  Failed ({failedDownloads.length})
                </h3>
                {failedDownloads.map((d) => (
                  <DownloadItem key={d.id} download={d} />
                ))}
              </section>
            )}

            {completedDownloads.length > 0 && (
              <section className="space-y-2 opacity-80">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground pb-1 border-b border-border">
                  Completed ({completedDownloads.length})
                </h3>
                {completedDownloads.map((d) => (
                  <DownloadItem key={d.id} download={d} />
                ))}
              </section>
            )}
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground font-mono text-xs">Queue is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}
