import React from "react";
import { useGetRecent } from "@workspace/api-client-react";
import { DownloadItem } from "@/components/download-item";

export default function History() {
  const { data: recentDownloads } = useGetRecent({ query: { refetchInterval: 5000 } });

  return (
    <div className="flex flex-col gap-0">
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">History</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Last 10 completed downloads</p>
      </div>

      <div className="px-4 pt-4 pb-4">
        {recentDownloads && recentDownloads.length > 0 ? (
          <div className="space-y-2">
            {recentDownloads.map((d) => (
              <DownloadItem key={d.id} download={d} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground font-mono text-xs">No completed downloads yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
