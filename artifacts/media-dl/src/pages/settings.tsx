import { useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { formatBytes } from "@/lib/utils";

export default function Settings() {
  const { data: stats } = useGetStats({ 
    query: { 
      queryKey: getGetStatsQueryKey()
    } 
  });

  return (
    <div className="w-full flex flex-col px-4 pt-6 pb-8 space-y-8 max-w-[100vw] overflow-x-hidden">
      
      <div className="space-y-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">App preferences & info</p>
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
        </div>
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

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Preferences</h2>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground text-center">
            Preferences coming soon.
          </p>
        </div>
      </div>

    </div>
  );
}
