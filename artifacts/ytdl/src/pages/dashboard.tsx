import React, { useState } from "react";
import {
  useCreateDownload,
  useBatchCreateDownloads,
  useListDownloads,
  DownloadInputFormat,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DownloadItem } from "@/components/download-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ChevronRight, ListVideo } from "lucide-react";

export default function Dashboard() {
  const [url, setUrl] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [format, setFormat] = useState<DownloadInputFormat>(DownloadInputFormat.best);
  const [quality, setQuality] = useState("best");
  const { toast } = useToast();

  const createDownload = useCreateDownload();
  const batchCreateDownloads = useBatchCreateDownloads();

  const { data: activeDownloads } = useListDownloads(
    { status: "downloading" },
    { query: { refetchInterval: 2000 } }
  );

  const handleFetchSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const isChannelOrPlaylist =
      url.includes("playlist?") ||
      url.includes("/playlist/") ||
      url.includes("/c/") ||
      url.includes("/@") ||
      url.includes("/channel/") ||
      url.includes("/user/") ||
      (url.includes("list=") && !url.includes("watch?v="));

    if (isChannelOrPlaylist) {
      toast({
        title: "Channel / Playlist detected",
        description: "Enumerating all videos — this may take a moment…",
      });
    }

    createDownload.mutate(
      { data: { url: url.trim(), format, quality: format === "mp4" ? quality : undefined } },
      {
        onSuccess: (result) => {
          const count = Array.isArray(result) ? result.length : 1;
          toast({
            title: count > 1
              ? `${count} videos added to queue`
              : "Added to queue",
          });
          setUrl("");
        },
        onError: (err) => {
          toast({ title: "Failed", description: String(err), variant: "destructive" });
        },
      }
    );
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = batchUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;

    batchCreateDownloads.mutate(
      {
        data: {
          items: urls.map((u) => ({
            url: u,
            format,
            quality: format === "mp4" ? quality : undefined,
          })),
        },
      },
      {
        onSuccess: () => {
          toast({ title: `${urls.length} items queued` });
          setBatchUrls("");
        },
        onError: (err) => {
          toast({ title: "Batch failed", description: String(err), variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">New Download</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Paste a URL — single video, playlist, or channel.
        </p>
      </div>

      <div className="px-4 pt-4 pb-3 bg-card border-b border-border">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Format
            </Label>
            <Select value={format} onValueChange={(v) => setFormat(v as DownloadInputFormat)}>
              <SelectTrigger
                className="h-10 font-mono text-sm"
                data-testid="select-format"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best</SelectItem>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="webm">WebM</SelectItem>
                <SelectItem value="mp3">MP3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Quality
            </Label>
            <Select
              value={quality}
              onValueChange={setQuality}
              disabled={format !== "mp4" && format !== "best"}
            >
              <SelectTrigger className="h-10 font-mono text-sm" data-testid="select-quality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Highest</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="480p">480p</SelectItem>
                <SelectItem value="360p">360p</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-3 h-9">
            <TabsTrigger value="single" className="text-[11px] font-mono uppercase tracking-wider">
              Single / Channel
            </TabsTrigger>
            <TabsTrigger value="batch" className="text-[11px] font-mono uppercase tracking-wider">
              Batch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-0 space-y-2">
            <form onSubmit={handleFetchSingle} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or /@channel"
                className="flex-1 h-11 text-sm font-mono"
                autoComplete="url"
                inputMode="url"
                data-testid="input-url"
              />
              <Button
                type="submit"
                disabled={!url.trim() || createDownload.isPending}
                className="h-11 px-5 font-mono text-xs uppercase tracking-wider font-bold shrink-0"
                data-testid="button-dispatch"
              >
                {createDownload.isPending ? "…" : "Go"}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground font-mono">
              Channel/playlist URLs are automatically expanded into individual jobs.
            </p>
          </TabsContent>

          <TabsContent value="batch" className="mt-0">
            <form onSubmit={handleBatchSubmit} className="space-y-3">
              <Textarea
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder={"Paste one URL per line:\nhttps://...\nhttps://..."}
                className="font-mono text-xs min-h-[100px] resize-none"
                data-testid="input-batch-urls"
              />
              <Button
                type="submit"
                disabled={!batchUrls.trim() || batchCreateDownloads.isPending}
                className="w-full h-11 font-mono text-xs uppercase tracking-wider font-bold"
                data-testid="button-dispatch-batch"
              >
                {batchCreateDownloads.isPending
                  ? "Queueing..."
                  : `Queue ${batchUrls.split("\n").filter((u) => u.trim()).length || ""} URLs`}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Active
          </h2>
          <Link
            href="/queue"
            className="flex items-center gap-0.5 text-[11px] font-mono text-primary"
            data-testid="link-view-queue"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {activeDownloads && activeDownloads.length > 0 ? (
          <div className="space-y-2">
            {activeDownloads.map((d) => (
              <DownloadItem key={d.id} download={d} />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground font-mono text-xs">No active downloads</p>
          </div>
        )}
      </div>

      {/* Channel/Playlist tip */}
      <div className="mx-4 mt-4 mb-2 px-3 py-2.5 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2">
        <ListVideo className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-snug">
          <span className="text-primary font-semibold">Channel downloads supported.</span>
          {" "}Paste a YouTube channel, playlist, or any supported URL — all videos are queued automatically.
          For recurring downloads, use <Link href="/schedules" className="text-primary underline underline-offset-2">Schedules</Link>.
        </p>
      </div>
    </div>
  );
}
