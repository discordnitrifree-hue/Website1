import { useState } from "react";
import { useGetPlayers, useSendCommand } from "@workspace/api-client-react";
import { Search, Shield, Ban, Gavel, Box, Sword, UserX, MoreVertical, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Players() {
  const { data, isLoading } = useGetPlayers({ query: { refetchInterval: 3000 } });
  const { mutate: sendCommand } = useSendCommand();
  const [search, setSearch] = useState("");

  const players = data?.players || [];
  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleAction = (cmdPattern: string, playerName: string) => {
    sendCommand({ data: { command: cmdPattern.replace("{player}", playerName) } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Player Management</h2>
          <p className="text-muted-foreground">Manage online players, health, and statuses.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search players..."
            className="w-full bg-card border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Player</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ping</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Health / Hunger</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading players...</td></tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
                      <UserX className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-white font-medium mb-1">No players online</h3>
                    <p className="text-sm text-muted-foreground">There are currently no players matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <PlayerRow key={player.name} player={player} onAction={handleAction} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player, onAction }: { player: any; onAction: (cmd: string, name: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <tr className="hover:bg-white/[0.03] transition-colors relative">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <img
            src={`https://minotar.net/helm/${player.name}/32.png`}
            alt={player.name}
            className="w-8 h-8 rounded-md bg-black/50"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://minotar.net/helm/steve/32.png"; }}
          />
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              {player.name}
              {player.isOp && <Shield className="w-3.5 h-3.5 text-yellow-400" title="Operator" />}
            </div>
            <div className="text-xs text-muted-foreground font-mono capitalize">{player.gamemode || "survival"}</div>
          </div>
        </div>
      </td>

      <td className="p-4">
        {player.online ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-muted-foreground text-xs font-medium border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            Offline
          </span>
        )}
      </td>

      <td className="p-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            (player.pingMs || 0) < 50 ? "bg-primary" : (player.pingMs || 0) < 150 ? "bg-yellow-400" : "bg-destructive"
          )} />
          <span className="text-sm font-mono text-white">{player.pingMs || 0}ms</span>
        </div>
      </td>

      <td className="p-4">
        <div className="w-36 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-red-400 w-4">❤</span>
            <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${((player.health || 20) / 20) * 100}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{player.health || 20}/20</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 w-4">🍖</span>
            <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-amber-600 rounded-full" style={{ width: `${((player.hunger || 20) / 20) * 100}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{player.hunger || 20}/20</span>
          </div>
        </div>
      </td>

      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Always visible quick action buttons */}
          <button
            onClick={() => onAction("gamemode survival {player}", player.name)}
            className="p-1.5 text-muted-foreground hover:text-orange-400 hover:bg-white/5 rounded-md transition-colors"
            title="Set Survival Mode"
          >
            <Sword className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAction("gamemode creative {player}", player.name)}
            className="p-1.5 text-muted-foreground hover:text-cyan-400 hover:bg-white/5 rounded-md transition-colors"
            title="Set Creative Mode"
          >
            <Box className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAction(player.isOp ? "deop {player}" : "op {player}", player.name)}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              player.isOp ? "text-yellow-400 bg-yellow-400/10" : "text-muted-foreground hover:text-yellow-400 hover:bg-white/5"
            )}
            title={player.isOp ? "Remove Operator" : "Make Operator"}
          >
            <Shield className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* 3-dot dropdown menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop to close on outside click */}
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-50 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{player.name}</p>
                  </div>
                  <div className="py-1">
                    <MenuItem icon={<Zap className="w-3.5 h-3.5" />} label="Teleport to Spawn" onClick={() => { onAction("tp {player} 0 64 0", player.name); setMenuOpen(false); }} color="text-blue-400" />
                    <MenuItem icon={<Eye className="w-3.5 h-3.5" />} label="Spectator Mode" onClick={() => { onAction("gamemode spectator {player}", player.name); setMenuOpen(false); }} color="text-purple-400" />
                    <MenuItem icon={<Zap className="w-3.5 h-3.5" />} label="Heal Player" onClick={() => { onAction("heal {player}", player.name); setMenuOpen(false); }} color="text-green-400" />
                    <MenuItem icon={<Zap className="w-3.5 h-3.5" />} label="Feed Player" onClick={() => { onAction("feed {player}", player.name); setMenuOpen(false); }} color="text-amber-400" />
                    <div className="my-1 border-t border-white/5" />
                    <MenuItem icon={<Gavel className="w-3.5 h-3.5" />} label="Kick Player" onClick={() => { onAction("kick {player} Kicked by Admin", player.name); setMenuOpen(false); }} color="text-yellow-400" />
                    <MenuItem icon={<Ban className="w-3.5 h-3.5" />} label="Ban Player" onClick={() => { onAction("ban {player} Banned by Admin", player.name); setMenuOpen(false); }} color="text-destructive" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function MenuItem({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left", color || "text-white")}
    >
      {icon}
      {label}
    </button>
  );
}
