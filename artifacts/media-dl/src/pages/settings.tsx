import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  useGetStats,
  getGetStatsQueryKey,
  getListDownloadsQueryKey,
  useClearCompleted,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data: stats } = useGetStats({
    query: { queryKey: getGetStatsQueryKey() },
  });

  const clearCompleted = useClearCompleted();

  function handleClear() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    clearCompleted.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        setConfirming(false);
        toast({
          title: `Cleared ${data.deleted} download${data.deleted !== 1 ? "s" : ""}`,
          description: "Storage has been freed up.",
        });
      },
      onError: () => {
        setConfirming(false);
        toast({
          title: "Error",
          description: "Failed to clear downloads.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="w-full flex flex-col px-4 pt-6 pb-8 space-y-8 max-w-[100vw] overflow-x-hidden">

      <div className="space-y-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">App preferences &amp; info</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Storage</h2>
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Disk Used</span>
            <span className="text-sm font-bold">{formatBytes(stats?.totalSizeBytes)}</span>
          </div>
          <div className="h-px bg-border w-full" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Downloads</span>
            <span className="text-sm font-bold">{stats?.total || 0}</span>
          </div>
          <div className="h-px bg-border w-full" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Completed</span>
            <span className="text-sm font-bold">{stats?.completed || 0}</span>
          </div>
        </div>

        <button
          onClick={handleClear}
          disabled={clearCompleted.isPending || (stats?.completed ?? 0) === 0}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            confirming
              ? "bg-destructive text-destructive-foreground"
              : "bg-card border border-border text-foreground"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {clearCompleted.isPending
            ? "Clearing..."
            : confirming
            ? "Tap again to confirm"
            : `Clear ${stats?.completed || 0} completed download${(stats?.completed ?? 0) !== 1 ? "s" : ""}`}
        </button>
        {confirming && (
          <p className="text-xs text-muted-foreground text-center -mt-2">
            This will delete the files from the server. You can re-download anytime.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Help</h2>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold">Where do files go?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Downloaded files are saved to your browser's Downloads folder.
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1 mt-2">
            <li><strong>Android:</strong> Files app → Downloads</li>
            <li><strong>iPhone:</strong> Files app → Downloads</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
