import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useGetServerStats, useGetBotStatus } from "@workspace/api-client-react";
import { Menu, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: stats } = useGetServerStats({ query: { refetchInterval: 5000 } });
  const { data: botStatus } = useGetBotStatus({ query: { refetchInterval: 5000 } });

  const isServerOnline = stats && stats.tps > 0;
  const isBotOnline = botStatus?.connected;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-bg.png)` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-background/50 to-background pointer-events-none" />

      <Sidebar />
      
      <main className="flex-1 md:ml-64 relative z-10 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 text-muted-foreground hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Status:</span>
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                isServerOnline 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}>
                <span className="relative flex h-2 w-2">
                  {isServerOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", isServerOnline ? "bg-primary" : "bg-destructive")}></span>
                </span>
                Server {isServerOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-white/5">
              {isBotOnline ? (
                <Wifi className="w-4 h-4 text-primary" />
              ) : (
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs font-mono font-medium text-white">
                Bot {isBotOnline ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {stats && (
              <div className="hidden sm:flex items-center gap-3 text-xs font-mono px-3 py-1.5 rounded-lg bg-card border border-white/5">
                <span className="text-muted-foreground">Players:</span>
                <span className="text-white font-bold">{stats.playersOnline}</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className="text-muted-foreground">TPS:</span>
                <span className={cn("font-bold", stats.tps >= 18 ? "text-primary" : stats.tps >= 14 ? "text-accent" : "text-destructive")}>
                  {stats.tps?.toFixed(1) ?? '0.0'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Main scrollable content area */}
        <div className="flex-1 overflow-y-auto scrollbar-custom p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full animate-slide-up">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
