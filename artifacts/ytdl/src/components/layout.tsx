import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, ListVideo, History, Activity } from "lucide-react";
import { useGetStats } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: stats } = useGetStats({ query: { refetchInterval: 2000 } });

  const navItems = [
    { href: "/", label: "Download", icon: LayoutDashboard },
    { href: "/queue", label: "Queue", icon: ListVideo },
    { href: "/history", label: "History", icon: History },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground dark">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar shrink-0">
        <span className="font-bold tracking-tight text-lg text-sidebar-primary">
          MediaDL<span className="text-muted-foreground">.app</span>
        </span>
        {stats && (
          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span>
              <span className="text-primary font-semibold">{stats.downloading}</span> active
              {" · "}
              <span>{stats.pending}</span> pending
            </span>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-w-0 pb-20">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-sidebar"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-mono uppercase tracking-wider transition-colors relative ${
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/50 active:text-sidebar-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-b-full" />
              )}
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.href === "/queue" && stats && stats.downloading > 0 && (
                <span className="absolute top-2 right-[calc(50%-18px)] bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {stats.downloading}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
