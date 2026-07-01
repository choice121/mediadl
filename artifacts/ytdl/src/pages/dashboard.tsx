import React, { useState, useCallback } from "react";
import {
  useCreateDownload,
  useBatchCreateDownloads,
  useListDownloads,
  usePreviewUrl,
  useGetCookiesStatus,
  useClearCookies,
  useSetCookies,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DownloadItem } from "@/components/download-item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  Loader2,
  Cookie,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDuration(secs: number | null | undefined): string {
  if (!secs) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Cookies dialog ──────────────────────────────────────────────────────────

function CookiesDialog() {
  const { data: status } = useGetCookiesStatus();
  const setCookies = useSetCookies();
  const clearCookies = useClearCookies();
  const { toast } = useToast();
  const [cookieText, setCookieText] = useState("");
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    if (!cookieText.trim()) return;
    setCookies.mutate(
      { data: { content: cookieText } },
      {
        onSuccess: () => {
          toast({ title: "Cookies saved" });
          setCookieText("");
          setOpen(false);
        },
        onError: (e) => toast({ title: "Failed to save cookies", description: String(e), variant: "destructive" }),
      }
    );
  };

  const handleClear = () => {
    clearCookies.mutate(undefined, {
      onSuccess: () => toast({ title: "Cookies cleared" }),
      onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors">
          <Cookie className="w-3.5 h-3.5" />
          <span>Cookies</span>
          {status?.set ? (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          ) : (
            <AlertCircle className="w-3 h-3 text-yellow-500" />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Browser Cookies</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-[12px] text-muted-foreground">
          <p>
            YouTube requires browser cookies on server environments to avoid rate limiting.
            Export your cookies using a browser extension (e.g.{" "}
            <span className="font-mono text-foreground">Get cookies.txt LOCALLY</span>) and paste the content below.
          </p>
          {status?.set && (
            <div className="flex items-center gap-2 text-green-600 bg-green-500/10 rounded px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Cookies are configured. Downloads should bypass bot detection.
            </div>
          )}
        </div>
        <Textarea
          value={cookieText}
          onChange={(e) => setCookieText(e.target.value)}
          placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / FALSE ..."
          className="font-mono text-xs min-h-[160px] resize-none"
        />
        <div className="flex gap-2 justify-end">
          {status?.set && (
            <Button variant="outline" size="sm" onClick={handleClear} className="text-xs font-mono">
              Clear cookies
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!cookieText.trim() || setCookies.isPending}
            className="text-xs font-mono"
          >
            {setCookies.isPending ? "Saving…" : "Save cookies"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Channel browser tab ─────────────────────────────────────────────────────

interface BrowseVideo {
  id: string | null;
  url: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  uploader: string | null;
}

function ChannelBrowser({
  format,
  quality,
}: {
  format: DownloadInputFormat;
  quality: string;
}) {
  const [browseInput, setBrowseInput] = useState("");
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const batchCreate = useBatchCreateDownloads();

  const preview = usePreviewUrl(
    { url: activeUrl! },
    { query: { enabled: !!activeUrl, staleTime: 5 * 60 * 1000 } }
  );

  const videos: BrowseVideo[] = (preview.data?.videos ?? []) as BrowseVideo[];

  const handleBrowse = () => {
    if (!browseInput.trim()) return;
    setSelected(new Set());
    setActiveUrl(browseInput.trim());
  };

  const toggleVideo = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);

  const toggleAll = () => {
    if (selected.size === videos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(videos.map((v) => v.url)));
    }
  };

  const handleDownloadSelected = () => {
    if (selected.size === 0) return;
    const items = [...selected].map((url) => ({
      url,
      format,
      quality: format === "mp4" ? quality : undefined,
    }));
    batchCreate.mutate(
      { data: { items } },
      {
        onSuccess: () => {
          toast({ title: `${items.length} video${items.length > 1 ? "s" : ""} queued` });
          setSelected(new Set());
        },
        onError: (e) =>
          toast({ title: "Failed", description: String(e), variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleBrowse();
        }}
        className="flex gap-2"
      >
        <Input
          value={browseInput}
          onChange={(e) => setBrowseInput(e.target.value)}
          placeholder="https://youtube.com/@channel or /playlist?list=..."
          className="flex-1 h-10 text-sm font-mono"
          autoComplete="url"
          inputMode="url"
        />
        <Button
          type="submit"
          disabled={!browseInput.trim() || preview.isFetching}
          className="h-10 px-4 font-mono text-xs uppercase tracking-wider font-bold shrink-0 gap-1.5"
        >
          {preview.isFetching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          Browse
        </Button>
      </form>

      {preview.isError && (
        <div className="text-xs text-destructive font-mono bg-destructive/10 rounded px-3 py-2">
          {String(preview.error)}
        </div>
      )}

      {videos.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between py-1.5 border-b border-border">
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === videos.length && videos.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              {selected.size === videos.length && videos.length > 0 ? "Deselect all" : "Select all"}
            </button>
            <span className="text-[11px] font-mono text-muted-foreground">
              {videos.length} video{videos.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Video list */}
          <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1">
            {videos.map((video) => {
              const isSelected = selected.has(video.url);
              return (
                <button
                  key={video.url}
                  onClick={() => toggleVideo(video.url)}
                  className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-card border border-transparent hover:border-border hover:bg-muted/40"
                  }`}
                >
                  {/* Checkbox */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Thumbnail */}
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-16 h-9 object-cover rounded shrink-0 bg-muted"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-16 h-9 rounded bg-muted shrink-0" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-snug">
                      {video.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {video.uploader && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {video.uploader}
                        </span>
                      )}
                      {video.duration != null && (
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {fmtDuration(video.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Download button */}
          <Button
            onClick={handleDownloadSelected}
            disabled={selected.size === 0 || batchCreate.isPending}
            className="w-full h-11 font-mono text-xs uppercase tracking-wider font-bold"
          >
            {batchCreate.isPending
              ? "Queuing…"
              : selected.size === 0
              ? "Select videos to download"
              : `Download ${selected.size} selected`}
          </Button>
        </>
      )}

      {activeUrl && !preview.isFetching && !preview.isError && videos.length === 0 && (
        <p className="text-xs text-muted-foreground font-mono text-center py-6">
          No videos found. Try a different URL.
        </p>
      )}

      {!activeUrl && (
        <p className="text-[10px] text-muted-foreground font-mono">
          Paste a YouTube channel, playlist, or supported URL and click Browse to preview
          and select individual videos before downloading.
        </p>
      )}
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────────────

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

    createDownload.mutate(
      { data: { url: url.trim(), format, quality: quality !== "best" ? quality : undefined } },
      {
        onSuccess: (result) => {
          const count = Array.isArray(result) ? result.length : 1;
          toast({
            title: count > 1 ? `${count} videos added to queue` : "Added to queue",
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
            quality: quality !== "best" ? quality : undefined,
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
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-border flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Download</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single video, browse a channel/playlist, or paste multiple URLs.
          </p>
        </div>
        <div className="pt-1">
          <CookiesDialog />
        </div>
      </div>

      <div className="px-4 pt-4 pb-3 bg-card border-b border-border">
        {/* Format / Quality selectors */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Format
            </Label>
            <Select value={format} onValueChange={(v) => setFormat(v as DownloadInputFormat)}>
              <SelectTrigger className="h-10 font-mono text-sm" data-testid="select-format">
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
              disabled={format !== "mp4"}
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

        {/* Tabs */}
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-3 h-9">
            <TabsTrigger value="single" className="text-[11px] font-mono uppercase tracking-wider">
              Single
            </TabsTrigger>
            <TabsTrigger value="browse" className="text-[11px] font-mono uppercase tracking-wider">
              Browse
            </TabsTrigger>
            <TabsTrigger value="batch" className="text-[11px] font-mono uppercase tracking-wider">
              Batch
            </TabsTrigger>
          </TabsList>

          {/* Single tab */}
          <TabsContent value="single" className="mt-0 space-y-2">
            <form onSubmit={handleFetchSingle} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
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
              Single video URL. For channels/playlists use the Browse tab.
            </p>
          </TabsContent>

          {/* Browse tab */}
          <TabsContent value="browse" className="mt-0">
            <ChannelBrowser format={format} quality={quality} />
          </TabsContent>

          {/* Batch tab */}
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

      {/* Active downloads */}
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
    </div>
  );
}
