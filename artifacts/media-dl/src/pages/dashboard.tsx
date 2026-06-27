import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Download as DownloadIcon, Link as LinkIcon, Database, Activity, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { DownloadItem } from "@/components/download-item";
import { formatBytes } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
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
            title: "Download added to queue",
            description: "It will begin shortly.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to add download to queue.",
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

  const queue = [...activeDownloads, ...pendingDownloads];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Input Section */}
      <Card className="p-6 bg-card border-border shadow-none">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-4">
            <div className="flex-1 space-y-0">
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          placeholder="Paste URL here..." 
                          className="pl-10 h-12 bg-background border-input font-mono text-sm" 
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="font-mono text-xs mt-2" />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[120px] h-12 bg-background border-input font-mono text-sm uppercase">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="best" className="font-mono uppercase text-sm">Best</SelectItem>
                      <SelectItem value="mp4" className="font-mono uppercase text-sm">MP4</SelectItem>
                      <SelectItem value="webm" className="font-mono uppercase text-sm">WebM</SelectItem>
                      <SelectItem value="mp3" className="font-mono uppercase text-sm">MP3</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createDownload.isPending} className="h-12 px-8 font-mono font-bold tracking-tight">
              {createDownload.isPending ? "ADDING..." : "DOWNLOAD"}
            </Button>
          </form>
        </Form>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase">Storage Used</div>
            <div className="text-lg font-mono font-bold">{formatBytes(stats?.totalSizeBytes)}</div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
            <Activity className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase">Active</div>
            <div className="text-lg font-mono font-bold">{stats?.downloading || 0}</div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
            <Clock className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase">Pending</div>
            <div className="text-lg font-mono font-bold">{stats?.pending || 0}</div>
          </div>
        </Card>
        <Card className="p-4 bg-card border-border shadow-none flex items-center gap-4">
          <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground uppercase">Completed</div>
            <div className="text-lg font-mono font-bold">{stats?.completed || 0}</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Active Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" /> Active Queue
            </h2>
            <Badge variant="secondary" className="font-mono rounded-sm">{queue.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {queue.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/50">
                <div className="text-muted-foreground font-mono text-sm">Queue is empty</div>
              </div>
            ) : (
              queue.map(item => (
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

        {/* Recently Completed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Recent
            </h2>
            <Badge variant="secondary" className="font-mono rounded-sm">{recentDownloads.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {recentDownloads.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg bg-card/50">
                <div className="text-muted-foreground font-mono text-sm">No recent downloads</div>
              </div>
            ) : (
              recentDownloads.slice(0, 5).map(item => (
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
      </div>

    </div>
  );
}
