import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Players from "./pages/Players";
import Console from "./pages/Console";
import Chat from "./pages/Chat";
import Lists from "./pages/Lists";
import Plugins from "./pages/Plugins";
import Scheduler from "./pages/Scheduler";
import Settings from "./pages/Settings";
import Grinding from "./pages/Grinding";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/players" component={Players} />
        <Route path="/console" component={Console} />
        <Route path="/chat" component={Chat} />
        <Route path="/lists" component={Lists} />
        <Route path="/plugins" component={Plugins} />
        <Route path="/scheduler" component={Scheduler} />
        <Route path="/grinding" component={Grinding} />
        <Route path="/backups" component={() => <div className="p-8 text-center text-muted-foreground">Backups panel functionality coming soon. Check Aternos dashboard.</div>} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
