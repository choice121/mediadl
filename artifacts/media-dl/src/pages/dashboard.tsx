import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateDownload,
  useBatchCreateDownloads,
  useGetStats, 
  useListDownloads, 
  useDeleteDownload, 
  useRetryDownload,
  getGetStatsQueryKey,
  getListDownloadsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { DownloadItem } from "@/components/download-item";
import { formatBytes, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const singleFormSchema = z.object({
  url: z.string().url({ message: "Invalid URL" }),
  format: z.enum(["mp4", "mp3", "webm", "best"]),
});

const batchFormSchema = z.object({
  urls: z.string().min(1, "Enter at least one URL"),
  format: z.enum(["mp4", "mp3", "webm", "best"]),
});

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchMode, setBatchMode] = useState(false);

  const { data: stats } = useGetStats({ 
    query: { 
      queryKey: getGetStatsQueryKey(),
      refetchInterval: (query) => {
        const d = query.state.data;
        return (d?.downloading || d?.pending) ? 2000 : 5000;
      }
    } 
  });

  const { data: activeDownloads = [] } = useListDownloads(
    { status: "downloading" },
    { 
      query: { 
        queryKey: getListDownloadsQueryKey({ status: "downloading" }),
        refetchInterval: 2000 
      } 
    }
  );

  const { data: pendingDownloads = [] } = useListDownloads(
    { status: "pending" },
    { 
      query: { 
        queryKey: getListDownloadsQueryKey({ status: "pending" }),
        refetchInterval: 2000 
      } 
    }
  );

  const { data: recentDownloads = [] } = useListDownloads(
    { status: "completed" },
    { 
      query: { 
        queryKey: getListDownloadsQueryKey({ status: "completed" }),
      } 
    }
  );

  const createDownload = useCreateDownload();
  const batchCreateDownloads = useBatchCreateDownloads();
  const deleteDownload = useDeleteDownload();
  const retryDownload = useRetryDownload();

  const singleForm = useForm<z.infer<typeof singleFormSchema>>({
    resolver: zodResolver(singleFormSchema),
    defaultValues: { url: "", format: "best" },
  });

  const batchForm = useForm<z.infer<typeof batchFormSchema>>({
    resolver: zodResolver(batchFormSchema),
    defaultValues: { urls: "", format: "best" },
  });

  const activeFormat = batchMode ? batchForm.watch("format") : singleForm.watch("format");

  function invalidateQueues() {
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey({ status: "pending" }) });
  }

  function onSingleSubmit(values: z.infer<typeof singleFormSchema>) {
    createDownload.mutate(
      { data: values },
      {
        onSuccess: () => {
          singleForm.reset({ url: "", format: values.format });
          invalidateQueues();
          toast({ title: "Added to queue" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add download.", variant: "destructive" });
        }
      }
    );
  }

  function onBatchSubmit(values: z.infer<typeof batchFormSchema>) {
    const urls = values.urls
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.length > 0);

    const invalid = urls.filter(u => {
      try { new URL(u); return false; } catch { return true; }
    });

    if (invalid.length > 0) {
      batchForm.setError("urls", { message: `Invalid URL(s): ${invalid.slice(0, 2).join(", ")}${invalid.length > 2 ? "…" : ""}` });
      return;
    }

    const items = urls.map(url => ({ url, format: values.format }));

    batchCreateDownloads.mutate(
      { data: { items } },
      {
        onSuccess: (created) => {
          batchForm.reset({ urls: "", format: values.format });
          invalidateQueues();
          toast({ title: `${created.length} download${created.length > 1 ? "s" : ""} added to queue` });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add downloads.", variant: "destructive" });
        }
      }
    );
  }

  const handleDelete = (id: number) => {
    deleteDownload.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    });
  };

  const handleRetry = (id: number) => {
    retryDownload.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    });
  };

  const [clipboardDetected, setClipboardDetected] = useState(false);

  const checkClipboard = useCallback(async () => {
    if (!navigator.clipboard?.readText) return;
    if (batchMode) return;
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const currentUrl = singleForm.getValues("url");
      if (currentUrl) return;
      if (/^https?:\/\/.+/.test(text)) {
        singleForm.setValue("url", text, { shouldValidate: true });
        setClipboardDetected(true);
        setTimeout(() => setClipboardDetected(false), 3000);
      }
    } catch {
      // Clipboard permission denied
    }
  }, [singleForm, batchMode]);

  useEffect(() => {
    checkClipboard();
    const onFocus = () => checkClipboard();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkClipboard]);

  const queue = [...activeDownloads, ...pendingDownloads];

  const formats = [
    { id: "best", label: "Best" },
    { id: "mp4", label: "MP4" },
    { id: "mp3", label: "MP3" },
    { id: "webm", label: "WebM" },
  ];

  const isPending = batchMode ? batchCreateDownloads.isPending : createDownload.isPending;

  return (
    <div className="w-full flex flex-col px-4 pt-6 pb-8 space-y-8 max-w-[100vw] overflow-x-hidden">
      
      {/* Input Section */}
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBatchMode(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border",
              !batchMode
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            Single URL
          </button>
          <button
            type="button"
            onClick={() => setBatchMode(true)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border",
              batchMode
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            Multiple URLs
          </button>
        </div>

        {/* Format selector — shared */}
        <div className="flex w-full gap-2 overflow-x-auto pb-1 scrollbar-none">
          {formats.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                singleForm.setValue("format", f.id as "mp4" | "mp3" | "webm" | "best");
                batchForm.setValue("format", f.id as "mp4" | "mp3" | "webm" | "best");
              }}
              className={cn(
                "flex-1 min-w-[70px] h-12 rounded-xl text-sm font-semibold transition-colors border",
                activeFormat === f.id
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Single URL form */}
        {!batchMode && (
          <Form {...singleForm}>
            <form onSubmit={singleForm.handleSubmit(onSingleSubmit)} className="space-y-4">
              <FormField
                control={singleForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input 
                        placeholder="Paste URL here..." 
                        className="h-14 bg-card border-border text-base rounded-xl px-4 w-full shadow-sm" 
                        {...field} 
                      />
                    </FormControl>
                    {clipboardDetected && (
                      <p className="text-xs text-primary font-medium px-1">
                        URL detected from clipboard
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full h-14 rounded-xl text-lg font-bold shadow-md">
                {isPending ? "Adding..." : "Download"}
              </Button>
            </form>
          </Form>
        )}

        {/* Batch URL form */}
        {batchMode && (
          <Form {...batchForm}>
            <form onSubmit={batchForm.handleSubmit(onBatchSubmit)} className="space-y-4">
              <FormField
                control={batchForm.control}
                name="urls"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={"Paste one URL per line:\nhttps://youtube.com/watch?v=...\nhttps://twitter.com/..."}
                        className="bg-card border-border text-base rounded-xl px-4 py-3 w-full shadow-sm min-h-[140px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    {field.value.trim() && (() => {
                      const count = field.value.split("\n").map(u => u.trim()).filter(u => u.length > 0).length;
                      return count > 0 ? (
                        <p className="text-xs text-muted-foreground px-1">{count} URL{count !== 1 ? "s" : ""} detected</p>
                      ) : null;
                    })()}
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending} className="w-full h-14 rounded-xl text-lg font-bold shadow-md">
                {isPending ? "Adding..." : "Download All"}
              </Button>
            </form>
          </Form>
        )}
      </div>

      {/* Stats Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x w-full">
        <div className="shrink-0 snap-start flex flex-col bg-card border border-border px-4 py-2.5 rounded-xl min-w-[100px]">
          <span className="text-[10px] uppercase text-muted-foreground font-semibold">Active</span>
          <span className="text-lg font-bold">{stats?.downloading || 0}</span>
        </div>
        <div className="shrink-0 snap-start flex flex-col bg-card border border-border px-4 py-2.5 rounded-xl min-w-[100px]">
          <span className="text-[10px] uppercase text-muted-foreground font-semibold">Pending</span>
          <span className="text-lg font-bold">{stats?.pending || 0}</span>
        </div>
        <div className="shrink-0 snap-start flex flex-col bg-card border border-border px-4 py-2.5 rounded-xl min-w-[100px]">
          <span className="text-[10px] uppercase text-muted-foreground font-semibold">Done</span>
          <span className="text-lg font-bold">{stats?.completed || 0}</span>
        </div>
        <div className="shrink-0 snap-start flex flex-col bg-card border border-border px-4 py-2.5 rounded-xl min-w-[100px]">
          <span className="text-[10px] uppercase text-muted-foreground font-semibold">Storage</span>
          <span className="text-lg font-bold">{formatBytes(stats?.totalSizeBytes)}</span>
        </div>
      </div>

      {/* Active Queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Queue</h2>
            <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{queue.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {queue.map(item => (
              <DownloadItem 
                key={item.id} 
                item={item} 
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent</h2>
          <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{recentDownloads.length}</span>
        </div>
        
        {recentDownloads.length === 0 ? (
          <div className="py-8 text-center bg-card/50 border border-dashed border-border rounded-xl">
            <div className="text-muted-foreground text-sm font-medium">No recent downloads</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentDownloads.slice(0, 5).map(item => (
              <DownloadItem 
                key={item.id} 
                item={item} 
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
