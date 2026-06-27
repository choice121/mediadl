import { Link, useLocation } from "wouter";
import { Download, History, Settings, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });

  const navItems = [
    { href: "/", label: "Dashboard", icon: Download },
    { href: "/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground selection:bg-primary/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 font-mono font-bold tracking-tight text-lg">
            <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
              <Download className="w-4 h-4 text-primary-foreground" />
            </div>
            MediaDL
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-mono text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Activity className={cn("w-3 h-3", health?.status === "ok" ? "text-primary" : "text-destructive")} />
          Status: {health?.status || "offline"}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
