import { useState } from "react";
import { 
  useListDownloads,
  useDeleteDownload,
  useRetryDownload,
  getListDownloadsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DownloadItem } from "@/components/download-item";
import { cn } from "@/lib/utils";

export default function History() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");

  const { data: downloads = [], isLoading } = useListDownloads(
    { 
      ...(status !== "all" ? { status: status as any } : {}),
    },
    { 
      query: { 
        queryKey: getListDownloadsQueryKey({ 
          ...(status !== "all" ? { status: status as any } : {}),
        }),
      } 
    }
  );

  const deleteDownload = useDeleteDownload();
  const retryDownload = useRetryDownload();

  const handleDelete = (id: number) => {
    deleteDownload.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
      }
    });
  };

  const handleRetry = (id: number) => {
    retryDownload.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
      }
    });
  };

  const filters = [
    { id: "all", label: "All" },
    { id: "downloading", label: "Active" },
    { id: "completed", label: "Done" },
    { id: "failed", label: "Failed" }
  ];

  return (
    <div className="w-full flex flex-col px-4 pt-6 pb-8 space-y-6 max-w-[100vw] overflow-x-hidden">
      
      <h1 className="text-2xl font-bold tracking-tight px-1">History</h1>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            className={cn(
              "shrink-0 h-10 px-4 rounded-full text-sm font-semibold transition-colors border",
              status === f.id
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground text-sm font-medium">
            Loading...
          </div>
        ) : downloads.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-xl bg-card/50">
            <div className="text-foreground font-bold mb-1">No downloads found</div>
            <div className="text-muted-foreground text-xs px-8">
              Try adjusting your filters or start a new download.
            </div>
          </div>
        ) : (
          downloads.map(item => (
            <DownloadItem 
              key={item.id} 
              item={item} 
              onDelete={handleDelete}
              onRetry={handleRetry}
            />
          ))
        )}
      </div>

    </div>
  );
}
