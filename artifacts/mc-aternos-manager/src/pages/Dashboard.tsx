import { useState } from "react";
import {
  useGetBotStatus,
  useStartBot,
  useStopBot,
  useGetServerStats,
  useSendCommand,
  useGetServerConfig,
} from "@workspace/api-client-react";
import {
  Power, Activity, Cpu, HardDrive, Clock, Users,
  Sun, Moon, CloudSun, CloudRain, ShieldAlert, Zap,
  Swords, Box, Heart, Beef, AlertTriangle, Settings, Wifi, WifiOff,
  MapPin, BarChart2
} from "lucide-react";
import { cn, formatUptime } from "@/lib/utils";
import { useLocation } from "wouter";

function formatBytes(mb: number) {
  if (!mb) return "0 MB";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [startError, setStartError] = useState<string | null>(null);

  const { data: botStatus, refetch: refetchBot } = useGetBotStatus({ query: { refetchInterval: 2000 } });
  const { data: stats } = useGetServerStats({ query: { refetchInterval: 2000 } });
  const { data: config } = useGetServerConfig();

  const { mutate: startBot, isPending: isStarting } = useStartBot({
    mutation: {
      onSuccess: () => { setStartError(null); refetchBot(); },
      onError: (err: any) => {
        setStartError(err?.message || "Failed to start bot. Check Settings first.");
      }
    }
  });
  const { mutate: stopBot, isPending: isStopping } = useStopBot({
    mutation: { onSuccess: () => refetchBot() }
  });
  const { mutate: sendCommand } = useSendCommand();

  const isRunning = botStatus?.running ?? false;
  const isConnected = botStatus?.connected ?? false;
  const serverConfigured = !!(config?.serverIp);

  const handleCommand = (cmd: string) => sendCommand({ data: { command: cmd } });

  const quickActions = [
    { label: "Day", icon: Sun, cmd: "time set day", color: "text-yellow-400" },
    { label: "Night", icon: Moon, cmd: "time set night", color: "text-indigo-400" },
    { label: "Clear", icon: CloudSun, cmd: "weather clear", color: "text-sky-400" },
    { label: "Rain", icon: CloudRain, cmd: "weather rain", color: "text-blue-500" },
    { label: "Save All", icon: HardDrive, cmd: "save-all", color: "text-emerald-400" },
    { label: "Reload", icon: Zap, cmd: "reload", color: "text-fuchsia-400" },
    { label: "Survival", icon: Swords, cmd: "gamemode survival @a", color: "text-orange-400" },
    { label: "Creative", icon: Box, cmd: "gamemode creative @a", color: "text-cyan-400" },
    { label: "Peaceful", icon: Heart, cmd: "difficulty peaceful", color: "text-pink-400" },
    { label: "Hard", icon: ShieldAlert, cmd: "difficulty hard", color: "text-red-500" },
    { label: "Feed All", icon: Beef, cmd: "effect give @a saturation 1 255", color: "text-amber-600" },
    { label: "Heal All", icon: Heart, cmd: "effect give @a instant_health 1 255", color: "text-red-400" },
  ];

  return (
    <div className="space-y-5">

      {/* ─── SETUP WARNING ─── */}
      {!serverConfigured && (
        <div className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-300 font-semibold text-sm">Server not configured</p>
            <p className="text-yellow-400/70 text-xs mt-0.5">Enter your Aternos Server IP, Bot Name, and Version in Settings before starting the bot.</p>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-semibold rounded-xl transition-colors border border-yellow-500/20"
          >
            <Settings className="w-4 h-4" />
            Open Settings
          </button>
        </div>
      )}

      {/* ─── START ERROR ─── */}
      {startError && (
        <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm flex-1">{startError}</p>
          <button onClick={() => setStartError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-5">

        {/* ─── BOT CONTROL HERO ─── */}
        <div className="flex-1 glass-panel-heavy rounded-3xl p-7 relative overflow-hidden flex flex-col justify-between min-h-[280px]">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Activity className="w-64 h-64" />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">Bot Controller</h2>
              {isConnected ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/20 text-primary text-xs font-bold uppercase border border-primary/30">
                  <Wifi className="w-3 h-3" /> Connected
                </span>
              ) : isRunning ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase border border-yellow-500/30 animate-pulse">
                  <Zap className="w-3 h-3" /> Connecting...
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-muted-foreground text-xs font-bold uppercase border border-white/10">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}
            </div>

            {/* Server info row */}
            {serverConfigured && (
              <div className="flex flex-wrap items-center gap-3 mb-4 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <MapPin className="w-3 h-3 text-primary" />
                  {config?.serverIp}:{config?.serverPort || "25565"}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  🤖 {config?.botName}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  🎮 v{config?.version || "1.20.4"}
                </span>
                {botStatus?.reconnectCount ? (
                  <span className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                    🔄 Reconnects: {botStatus.reconnectCount}
                  </span>
                ) : null}
              </div>
            )}

            <p className="text-muted-foreground text-sm max-w-md">
              {serverConfigured
                ? "Keeps your Aternos server online 24/7 — bot joins as a fake player so the server never shuts down."
                : "Configure your server details in Settings, then press START BOT."}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4 mt-6 relative z-10">
            <button
              onClick={() => {
                setStartError(null);
                isRunning ? stopBot() : startBot();
              }}
              disabled={isStarting || isStopping}
              className={cn(
                "group relative px-7 py-4 rounded-2xl font-bold text-base flex items-center gap-3 transition-all duration-300",
                isRunning
                  ? "bg-destructive/10 text-destructive border-2 border-destructive/50 hover:bg-destructive/20"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(76,175,80,0.35)] border-2 border-transparent",
                (isStarting || isStopping) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Power className={cn("w-5 h-5", isRunning && "animate-pulse")} />
              {isStarting ? "Starting..." : isStopping ? "Stopping..." : isRunning ? "STOP BOT" : "START BOT 24/7"}
            </button>

            {isRunning && (
              <div className="flex gap-5 bg-black/40 px-5 py-3.5 rounded-2xl border border-white/5">
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Uptime</div>
                  <div className="text-xl font-mono text-white">{formatUptime(botStatus?.uptime || 0)}</div>
                </div>
                {isConnected && (
                  <>
                    <div className="w-px bg-white/10" />
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">❤ Health</div>
                      <div className="text-xl font-mono text-white">{botStatus?.health ?? 20}/20</div>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div>
                      <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">🍖 Hunger</div>
                      <div className="text-xl font-mono text-white">{botStatus?.hunger ?? 20}/20</div>
                    </div>
                    {botStatus?.position && (
                      <>
                        <div className="w-px bg-white/10" />
                        <div>
                          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">📍 XYZ</div>
                          <div className="text-sm font-mono text-white">
                            {botStatus.position.x} / {botStatus.position.y} / {botStatus.position.z}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── QUICK ACTIONS ─── */}
        <div className="w-full md:w-[380px] glass-panel rounded-3xl p-5 flex flex-col">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" /> Quick Actions
          </h3>
          <div className="grid grid-cols-3 gap-2 flex-1">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleCommand(action.cmd)}
                  disabled={!isConnected}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all duration-200 active:scale-95",
                    isConnected
                      ? "bg-black/20 border-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer"
                      : "bg-black/10 border-white/5 opacity-40 cursor-not-allowed"
                  )}
                  title={!isConnected ? "Start the bot first" : action.label}
                >
                  <Icon className={cn("w-5 h-5", action.color)} />
                  <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{action.label}</span>
                </button>
              );
            })}
          </div>
          {!isConnected && (
            <p className="text-xs text-muted-foreground text-center mt-3 opacity-60">Start bot to use quick actions</p>
          )}
        </div>
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} title="Server TPS" value={isConnected ? (stats?.tps?.toFixed(1) ?? "--") : "--"} subValue="Ticks Per Second" color="text-primary" good={isConnected && (stats?.tps ?? 0) >= 18} />
        <StatCard icon={Users} title="Online Players" value={isConnected ? `${stats?.playersOnline ?? 0}` : "--"} subValue="Currently connected" color="text-accent" />
        <StatCard icon={Cpu} title="CPU Usage" value={isConnected ? `${stats?.cpuUsage ?? 0}%` : "--"} subValue="Estimated server load" color="text-blue-400" />
        <StatCard icon={HardDrive} title="RAM Usage" value={isConnected ? formatBytes(stats?.ramUsage ?? 0) : "--"} subValue={`Total: ${formatBytes(stats?.ramTotal ?? 1024)}`} color="text-fuchsia-400" />
      </div>

      {/* ─── EXTRA STATS ROW ─── */}
      {isConnected && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Clock} title="Bot Uptime" value={formatUptime(botStatus?.uptime ?? 0)} subValue="Time running" color="text-green-400" />
          <StatCard icon={BarChart2} title="Entities" value={`${stats?.entityCount ?? 0}`} subValue="In loaded chunks" color="text-orange-400" />
          <StatCard icon={HardDrive} title="Chunks Loaded" value={`${stats?.chunkCount ?? 0}`} subValue="Active chunks" color="text-pink-400" />
          <StatCard icon={Zap} title="Reconnects" value={`${botStatus?.reconnectCount ?? 0}`} subValue="Auto-reconnect count" color="text-yellow-400" />
        </div>
      )}

    </div>
  );
}

function StatCard({ icon: Icon, title, value, subValue, color, good }: any) {
  return (
    <div className="glass-panel rounded-2xl p-5 hover:-translate-y-0.5 transition-transform duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className={cn("p-2.5 rounded-xl bg-white/5", color)}>
          <Icon className="w-5 h-5" />
        </div>
        {good !== undefined && (
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", good ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-400")}>
            {good ? "GOOD" : "LOW"}
          </span>
        )}
      </div>
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-1">{title}</h4>
        <div className="text-2xl font-bold text-white font-mono tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
      </div>
    </div>
  );
}
