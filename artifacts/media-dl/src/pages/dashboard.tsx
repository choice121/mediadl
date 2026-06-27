import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateDownload, 
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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { DownloadItem } from "@/components/download-item";
import { formatBytes, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  url: z.string().url({ message: "Invalid URL" }),
  format: z.enum(["mp4", "mp3", "webm", "best"]),
});

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const deleteDownload = useDeleteDownload();
  const retryDownload = useRetryDownload();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      format: "best",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createDownload.mutate(
      { data: values },
      {
        onSuccess: () => {
          form.reset({ url: "", format: values.format });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey({ status: "pending" }) });
          toast({
            title: "Added to queue",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to add download.",
            variant: "destructive",
          });
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
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const currentUrl = form.getValues("url");
      if (currentUrl) return; // don't overwrite user's input
      if (/^https?:\/\/.+/.test(text)) {
        form.setValue("url", text, { shouldValidate: true });
        setClipboardDetected(true);
        setTimeout(() => setClipboardDetected(false), 3000);
      }
    } catch {
      // Clipboard permission denied — silently ignore
    }
  }, [form]);

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

  return (
    <div className="w-full flex flex-col px-4 pt-6 pb-8 space-y-8 max-w-[100vw] overflow-x-hidden">
      
      {/* Input Section */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
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
          
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <div className="flex w-full gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {formats.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => field.onChange(f.id)}
                      className={cn(
                        "flex-1 min-w-[70px] h-12 rounded-xl text-sm font-semibold transition-colors border",
                        field.value === f.id 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "bg-card border-border text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createDownload.isPending} className="w-full h-14 rounded-xl text-lg font-bold shadow-md">
            {createDownload.isPending ? "Adding..." : "Download"}
          </Button>
        </form>
      </Form>

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
