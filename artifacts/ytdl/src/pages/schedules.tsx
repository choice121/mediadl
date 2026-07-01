import { useState } from "react";
import {
  useListSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useRunScheduleNow,
  ScheduleInputFormat,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListSchedulesQueryKey } from "@workspace/api-client-react";
import { Plus, Play, Trash2, Clock } from "lucide-react";

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at noon", value: "0 12 * * *" },
  { label: "Every week (Monday)", value: "0 9 * * 1" },
];

function formatDate(s: string | null | undefined): string {
  if (!s) return "Never";
  return new Date(s).toLocaleString();
}

export default function Schedules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    url: "",
    format: "best" as ScheduleInputFormat,
    cronExpr: "0 0 * * *",
    enabled: true,
  });

  const { data: schedules = [], isLoading } = useListSchedules({
    query: { refetchInterval: 10_000 },
  });

  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const runNow = useRunScheduleNow();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim() || !form.cronExpr.trim()) return;

    createSchedule.mutate(
      {
        data: {
          label: form.label.trim(),
          url: form.url.trim(),
          format: form.format,
          cronExpr: form.cronExpr.trim(),
          enabled: form.enabled,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Schedule created" });
          setOpen(false);
          setForm({ label: "", url: "", format: "best", cronExpr: "0 0 * * *", enabled: true });
          invalidate();
        },
        onError: (err) => {
          toast({ title: "Failed", description: String(err), variant: "destructive" });
        },
      }
    );
  }

  function handleToggle(id: number, enabled: boolean) {
    updateSchedule.mutate(
      { id, data: { enabled } },
      {
        onSuccess: () => { invalidate(); },
        onError: (err) => {
          toast({ title: "Failed to update", description: String(err), variant: "destructive" });
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteSchedule.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Schedule deleted" });
          invalidate();
        },
        onError: (err) => {
          toast({ title: "Failed", description: String(err), variant: "destructive" });
        },
      }
    );
  }

  function handleRunNow(id: number) {
    runNow.mutate(
      { id },
      {
        onSuccess: (res) => {
          toast({ title: `Dispatched ${res.dispatched} download${res.dispatched !== 1 ? "s" : ""}` });
          invalidate();
        },
        onError: (err) => {
          toast({ title: "Failed to run", description: String(err), variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-5 pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Schedules</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Auto-download channels & playlists on a cron schedule.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 px-3 font-mono text-xs uppercase tracking-wider font-bold gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent className="dark max-w-sm">
            <DialogHeader>
              <DialogTitle>New Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="My channel"
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://youtube.com/@channel"
                  className="h-10 text-sm font-mono"
                  inputMode="url"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Format</Label>
                  <Select
                    value={form.format}
                    onValueChange={(v) => setForm((f) => ({ ...f, format: v as ScheduleInputFormat }))}
                  >
                    <SelectTrigger className="h-10 text-sm font-mono">
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
                  <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Preset</Label>
                  <Select
                    onValueChange={(v) => setForm((f) => ({ ...f, cronExpr: v }))}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Pick…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Cron Expression</Label>
                <Input
                  value={form.cronExpr}
                  onChange={(e) => setForm((f) => ({ ...f, cronExpr: e.target.value }))}
                  placeholder="0 0 * * *"
                  className="h-10 text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground font-mono">min hour day month weekday</p>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
                />
              </div>
              <Button
                type="submit"
                disabled={!form.label.trim() || !form.url.trim() || !form.cronExpr.trim() || createSchedule.isPending}
                className="w-full h-10 font-mono text-xs uppercase tracking-wider font-bold"
              >
                {createSchedule.isPending ? "Creating…" : "Create Schedule"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading && (
          <div className="py-12 text-center text-muted-foreground font-mono text-xs">Loading…</div>
        )}

        {!isLoading && schedules.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border rounded-xl">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-muted-foreground font-mono text-xs">No schedules yet</p>
            <p className="text-muted-foreground/60 font-mono text-[10px] mt-1">
              Create one to auto-download channels & playlists
            </p>
          </div>
        )}

        {schedules.map((s) => (
          <div
            key={s.id}
            className="bg-card border border-border rounded-xl p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm truncate">{s.label}</span>
                  <Badge
                    variant={s.enabled ? "default" : "secondary"}
                    className="text-[9px] font-mono uppercase px-1.5 py-0"
                  >
                    {s.enabled ? "Active" : "Paused"}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0">
                    {s.format}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{s.url}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  <span className="text-primary">{s.cronExpr}</span>
                  {" · "}Last: {formatDate(s.lastRunAt)}
                </p>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={(v) => handleToggle(s.id, v)}
                className="shrink-0 mt-0.5"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 font-mono text-[10px] uppercase tracking-wider gap-1"
                onClick={() => handleRunNow(s.id)}
                disabled={runNow.isPending}
              >
                <Play className="w-3 h-3" />
                Run now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(s.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
