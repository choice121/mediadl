import { Link, useLocation } from "wouter";
import { Download, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Download", icon: Download },
    { href: "/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background text-foreground relative pb-[calc(64px+env(safe-area-inset-bottom))]">
      {/* Main Content */}
      <main className="flex-1 w-full max-w-full">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-card border-t border-border pb-[env(safe-area-inset-bottom)] z-50">
        <nav className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full min-h-[48px] gap-1 rounded-lg transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
