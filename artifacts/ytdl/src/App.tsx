import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Queue from "@/pages/queue";
import History from "@/pages/history";
import Schedules from "@/pages/schedules";
import Login from "@/pages/login";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/queue" component={Queue} />
        <Route path="/history" component={History} />
        <Route path="/schedules" component={Schedules} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "authed" | "unauthed">("loading");

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json() as { authenticated: boolean; authRequired: boolean };
      setState(data.authenticated ? "authed" : "unauthed");
    } catch {
      setState("authed"); // If API unreachable, let through (fail open)
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <div className="text-muted-foreground font-mono text-sm">Loading…</div>
      </div>
    );
  }

  if (state === "unauthed") {
    return <Login onLogin={() => setState("authed")} />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthGate>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
