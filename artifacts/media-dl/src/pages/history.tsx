import { useState } from "react";
import { Search, Filter, History as HistoryIcon, DownloadCloud } from "lucide-react";
import { 
  useListDownloads,
  useDeleteDownload,
  useRetryDownload,
  getListDownloadsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DownloadItem } from "@/components/download-item";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function History() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [format, setFormat] = useState<string>("all");

  const { data: downloads = [], isLoading } = useListDownloads(
    { 
      ...(status !== "all" ? { status: status as any } : {}),
      ...(format !== "all" ? { format } : {})
    },
    { 
      query: { 
        queryKey: getListDownloadsQueryKey({ 
          ...(status !== "all" ? { status: status as any } : {}),
          ...(format !== "all" ? { format } : {})
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono font-bold tracking-tight flex items-center gap-3">
          <HistoryIcon className="w-6 h-6 text-primary" />
          Download History
        </h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground mr-2">
          <Filter className="w-4 h-4" /> Filters
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] font-mono text-sm bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-mono text-sm">All Statuses</SelectItem>
            <SelectItem value="completed" className="font-mono text-sm">Completed</SelectItem>
            <SelectItem value="failed" className="font-mono text-sm">Failed</SelectItem>
            <SelectItem value="downloading" className="font-mono text-sm">Downloading</SelectItem>
            <SelectItem value="pending" className="font-mono text-sm">Pending</SelectItem>
          </SelectContent>
        </Select>

        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-[160px] font-mono text-sm bg-background">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-mono text-sm">All Formats</SelectItem>
            <SelectItem value="mp4" className="font-mono text-sm">MP4</SelectItem>
            <SelectItem value="mp3" className="font-mono text-sm">MP3</SelectItem>
            <SelectItem value="webm" className="font-mono text-sm">WebM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground font-mono">
            Loading...
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 text-center border border-dashed border-border rounded-lg bg-card/50">
            <DownloadCloud className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
            <div className="text-foreground font-mono font-bold mb-2">No downloads found</div>
            <div className="text-muted-foreground font-mono text-sm">
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
