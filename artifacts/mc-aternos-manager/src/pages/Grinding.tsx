import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Pickaxe, Sword, Shield, Target, Play, Square, RefreshCw, Eye,
  Activity, AlertCircle, CheckCircle, ChevronDown, Hammer, Sparkles,
  Crosshair, Bot, Heart, Zap, ShieldCheck, Puzzle, Brain,
  Wifi, Hash, Type, Move, Lock
} from "lucide-react";
import { useGetBotStatus } from "@workspace/api-client-react";

const API = "/api";

interface GrindingStatus { mode: string; blockTarget: string; blocksCollected: number; isActive: boolean; lastAction: string; }
interface PvpStatus { enabled: boolean; mode: string; reach: number; attackSpeed: number; currentTarget: string | null; kills: number; lastAction: string; }
interface StealthStatus { enabled: boolean; humanMovement: boolean; randomChat: boolean; lookAround: boolean; antiAfk: boolean; }
interface AntiBotStatus {
  enabled: boolean; autoLogin: boolean; captchaSolver: boolean;
  verifyCommands: boolean; movementVerify: boolean; responseDelay: number;
  lastChallenge: string; lastResponse: string; challengesSolved: number;
}
interface AutoHealStatus {
  enabled: boolean; useTotem: boolean; usePotion: boolean;
  useGoldenApple: boolean; useFood: boolean;
  healthThreshold: number; hungerThreshold: number;
  lastHealAction: string; healsTotal: number;
}

const BLOCK_OPTIONS = [
  { value: "diamond", label: "💎 Diamond Ore" },
  { value: "iron", label: "⚙️ Iron Ore" },
  { value: "gold", label: "🥇 Gold Ore" },
  { value: "coal", label: "⬛ Coal Ore" },
  { value: "redstone", label: "🔴 Redstone Ore" },
  { value: "emerald", label: "💚 Emerald Ore" },
  { value: "netherite", label: "🔥 Ancient Debris" },
  { value: "log", label: "🌲 Wood Logs" },
  { value: "stone", label: "🪨 Stone/Cobble" },
  { value: "gravel", label: "⬜ Gravel" },
];
const CRAFT_OPTIONS = [
  { value: "wooden_pickaxe", label: "⛏️ Wooden Pickaxe" },
  { value: "stone_pickaxe", label: "🪨 Stone Pickaxe" },
  { value: "iron_pickaxe", label: "🔩 Iron Pickaxe" },
  { value: "wooden_axe", label: "🪓 Wooden Axe" },
  { value: "wooden_sword", label: "⚔️ Wooden Sword" },
  { value: "crafting_table", label: "🔲 Crafting Table" },
];

export default function Grinding() {
  const { data: botStatus } = useGetBotStatus({ query: { refetchInterval: 2000 } });
  const connected = botStatus?.connected ?? false;

  const [grinding, setGrinding] = useState<GrindingStatus | null>(null);
  const [pvp, setPvp] = useState<PvpStatus | null>(null);
  const [stealth, setStealth] = useState<StealthStatus | null>(null);
  const [antibot, setAntibot] = useState<AntiBotStatus | null>(null);
  const [autoheal, setAutoheal] = useState<AutoHealStatus | null>(null);

  const [grindMode, setGrindMode] = useState("mining");
  const [blockTarget, setBlockTarget] = useState("diamond");
  const [craftItem, setCraftItem] = useState("wooden_pickaxe");
  const [pvpMode, setPvpMode] = useState("killaura");
  const [pvpReach, setPvpReach] = useState(4.0);
  const [pvpCps, setPvpCps] = useState(12);
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const showMsg = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

  const fetchAll = useCallback(async () => {
    try {
      const [g, p, s, a, h] = await Promise.all([
        fetch(`${API}/bot/grinding`).then(r => r.json()),
        fetch(`${API}/bot/pvp`).then(r => r.json()),
        fetch(`${API}/bot/stealth`).then(r => r.json()),
        fetch(`${API}/bot/antibot`).then(r => r.json()),
        fetch(`${API}/bot/autoheal`).then(r => r.json()),
      ]);
      setGrinding(g); setPvp(p); setStealth(s); setAntibot(a); setAutoheal(h);
    } catch {}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const t = setInterval(fetchAll, 2500); return () => clearInterval(t); }, [fetchAll]);

  const post = async (url: string, body?: any) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return r.json();
  };
  const patch = async (url: string, body: any) => {
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return r.json();
  };

  const handleGrindStart = async () => {
    setLoading("grind"); const r = await post(`${API}/bot/grinding/start`, { mode: grindMode, blockTarget });
    if (r.error) showMsg(r.error, false); else { showMsg(`⛏️ ${grindMode} started!`); setGrinding(r.status); }
    setLoading(null);
  };
  const handleGrindStop = async () => {
    setLoading("grind-s"); const r = await post(`${API}/bot/grinding/stop`);
    setGrinding(r.status); showMsg("Grinding stopped."); setLoading(null);
  };
  const handleCraft = async () => {
    setLoading("craft"); const r = await post(`${API}/bot/grinding/craft`, { item: craftItem });
    showMsg(r.message || "Done.", r.message?.startsWith("✅")); setLoading(null);
  };

  const handlePvpStart = async () => {
    setLoading("pvp"); const r = await post(`${API}/bot/pvp/start`, { mode: pvpMode, reach: pvpReach, attackSpeed: pvpCps });
    if (r.error) showMsg(r.error, false); else { showMsg("⚔️ KillAura activated!"); setPvp(r.status); }
    setLoading(null);
  };
  const handlePvpStop = async () => {
    setLoading("pvp-s"); const r = await post(`${API}/bot/pvp/stop`);
    setPvp(r.status); showMsg("PvP stopped."); setLoading(null);
  };

  const toggleStealth = async (key: keyof StealthStatus, val: boolean) => {
    const r = await patch(`${API}/bot/stealth`, { [key]: val }); setStealth(r.status);
  };
  const toggleAntibot = async (key: keyof AntiBotStatus, val: any) => {
    const r = await patch(`${API}/bot/antibot`, { [key]: val }); setAntibot(r.status);
  };
  const toggleAutoheal = async (key: keyof AutoHealStatus, val: any) => {
    const r = await patch(`${API}/bot/autoheal`, { [key]: val }); setAutoheal(r.status);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sword className="w-6 h-6 text-red-400" /> Advanced Bot Features
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">Auto-Grinding · PvP KillAura · Anti-Bot Bypass · CAPTCHA Solver · Auto-Heal</p>
      </div>

      {!connected && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm font-medium">Start the bot from Dashboard first before using these features.</p>
        </div>
      )}
      {msg && (
        <div className={cn("flex items-center gap-3 rounded-2xl px-5 py-3 border text-sm font-medium",
          msg.ok ? "bg-primary/10 border-primary/30 text-primary" : "bg-red-500/10 border-red-500/30 text-red-400")}>
          {msg.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* ─── ROW 1: Grinding + PvP ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* GRINDING */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Pickaxe className="w-5 h-5 text-amber-400" /> Auto Grinder
            </h3>
            {grinding?.isActive && (
              <span className="flex items-center gap-1.5 text-xs bg-primary/20 text-primary px-2.5 py-1 rounded-lg border border-primary/30 font-bold animate-pulse">
                <Activity className="w-3 h-3" /> ACTIVE
              </span>
            )}
          </div>
          {grinding && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <div className="text-muted-foreground">Blocks Collected</div>
                <div className="text-white font-bold text-xl font-mono">{grinding.blocksCollected}</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <div className="text-muted-foreground">Status</div>
                <div className="text-white text-[11px] font-mono mt-0.5 line-clamp-2">{grinding.lastAction}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[{ id: "mining", l: "⛏ Mining", d: "Mine ores" }, { id: "wood", l: "🌲 Wood", d: "Chop trees" },
              { id: "farming", l: "🌾 Farming", d: "Harvest crops" }, { id: "auto", l: "🤖 Auto", d: "Mine all" }].map(m => (
              <button key={m.id} onClick={() => setGrindMode(m.id)}
                className={cn("p-3 rounded-xl border text-left transition-all", grindMode === m.id ? "bg-primary/20 border-primary/50 text-primary" : "bg-black/20 border-white/10 text-muted-foreground hover:border-white/20")}>
                <div className="font-semibold text-sm">{m.l}</div>
                <div className="text-[11px] opacity-70">{m.d}</div>
              </button>
            ))}
          </div>
          {(grindMode === "mining" || grindMode === "auto") && (
            <div className="relative">
              <select value={blockTarget} onChange={e => setBlockTarget(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-primary/50">
                {BLOCK_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleGrindStart} disabled={loading === "grind" || !connected || grinding?.isActive}
              className={cn("flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                connected && !grinding?.isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white/5 text-muted-foreground cursor-not-allowed")}>
              {loading === "grind" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Start
            </button>
            <button onClick={handleGrindStop} disabled={!grinding?.isActive}
              className={cn("flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                grinding?.isActive ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" : "bg-white/5 text-muted-foreground cursor-not-allowed")}>
              {loading === "grind-s" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Stop
            </button>
          </div>
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs font-bold text-white mb-2 flex items-center gap-1.5"><Hammer className="w-3.5 h-3.5 text-orange-400" /> Auto Craft</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select value={craftItem} onChange={e => setCraftItem(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-primary/50">
                  {CRAFT_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={handleCraft} disabled={loading === "craft" || !connected}
                className={cn("px-4 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all",
                  connected ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30" : "bg-white/5 text-muted-foreground cursor-not-allowed")}>
                {loading === "craft" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Craft
              </button>
            </div>
          </div>
        </div>

        {/* PVP */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-red-400" /> PvP KillAura
            </h3>
            {pvp?.enabled && (
              <span className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-lg border border-red-500/30 font-bold animate-pulse">
                <Target className="w-3 h-3" /> FIGHTING
              </span>
            )}
          </div>
          {pvp && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <div className="text-muted-foreground">Target</div>
                <div className="text-white font-bold font-mono">{pvp.currentTarget || "None"}</div>
              </div>
              <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                <div className="text-muted-foreground">Status</div>
                <div className="text-white text-[11px] font-mono mt-0.5 line-clamp-2">{pvp.lastAction}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[{ id: "killaura", l: "🔥 KillAura", d: "Attack all" }, { id: "target", l: "🎯 Target", d: "Focus one" }, { id: "defensive", l: "🛡 Defensive", d: "Mobs only" }].map(m => (
              <button key={m.id} onClick={() => setPvpMode(m.id)}
                className={cn("p-3 rounded-xl border text-left transition-all", pvpMode === m.id ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-black/20 border-white/10 text-muted-foreground hover:border-white/20")}>
                <div className="font-semibold text-xs">{m.l}</div>
                <div className="text-[10px] opacity-70">{m.d}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Reach Distance</span>
                <span className="text-white font-bold font-mono">{pvpReach.toFixed(1)} blocks</span>
              </div>
              <input type="range" min={2} max={7} step={0.1} value={pvpReach} onChange={e => setPvpReach(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full accent-red-500 cursor-pointer" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>2.0 legit</span><span>4.5 hack</span><span>7.0 max</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Attack Speed</span>
                <span className="text-white font-bold font-mono">{pvpCps} CPS</span>
              </div>
              <input type="range" min={4} max={20} step={1} value={pvpCps} onChange={e => setPvpCps(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full accent-red-500 cursor-pointer" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>4 legit</span><span>12 good</span><span>20 max</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handlePvpStart} disabled={loading === "pvp" || !connected || pvp?.enabled}
              className={cn("flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
                connected && !pvp?.enabled ? "bg-red-500 text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.35)]" : "bg-white/5 text-muted-foreground cursor-not-allowed")}>
              {loading === "pvp" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sword className="w-4 h-4" />} Activate KillAura
            </button>
            <button onClick={handlePvpStop} disabled={!pvp?.enabled}
              className={cn("px-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
                pvp?.enabled ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" : "bg-white/5 text-muted-foreground cursor-not-allowed")}>
              {loading === "pvp-s" ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />} Off
            </button>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: Anti-Bot + Auto-Heal ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ANTI-BOT BYPASS */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" /> Anti-Bot Bypass
            </h3>
            {antibot?.enabled && (
              <span className="flex items-center gap-1.5 text-xs bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg border border-purple-500/30 font-bold">
                <ShieldCheck className="w-3 h-3" /> ON
              </span>
            )}
          </div>

          {/* Stats */}
          {antibot && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 text-center">
                <div className="text-muted-foreground">Solved</div>
                <div className="text-purple-300 font-bold text-lg font-mono">{antibot.challengesSolved}</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 col-span-2">
                <div className="text-muted-foreground">Last Challenge</div>
                <div className="text-white text-[11px] font-mono mt-0.5 line-clamp-1">{antibot.lastChallenge || "None yet"}</div>
                <div className="text-purple-300 text-[11px] font-mono line-clamp-1">{antibot.lastResponse ? `→ ${antibot.lastResponse}` : ""}</div>
              </div>
            </div>
          )}

          {antibot && (
            <div className="space-y-2">
              {[
                { key: "enabled" as const, label: "Master Switch", desc: "Enable all anti-bot protection", icon: ShieldCheck, color: "text-purple-400" },
                { key: "autoLogin" as const, label: "Auto Login/Register", desc: "AuthMe, nLogin, CMI detect karke auto /login /register bhejna", icon: Lock, color: "text-blue-400" },
                { key: "captchaSolver" as const, label: "CAPTCHA Solver", desc: "Math (3+4=?) aur word captcha auto solve", icon: Hash, color: "text-green-400" },
                { key: "verifyCommands" as const, label: "/verify Auto", desc: "Server jo /verify CODE bheje woh auto execute", icon: Puzzle, color: "text-cyan-400" },
                { key: "movementVerify" as const, label: "Movement Verify", desc: "Jump/Walk verification detect karke auto complete", icon: Move, color: "text-orange-400" },
              ].map(({ key, label, desc, icon: Icon, color }) => (
                <button key={key} onClick={() => toggleAntibot(key, !antibot[key])}
                  className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    antibot[key] ? "bg-purple-500/10 border-purple-500/30" : "bg-black/20 border-white/5 hover:border-white/10")}>
                  <Icon className={cn("w-4 h-4 flex-shrink-0", antibot[key] ? color : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold", antibot[key] ? "text-white" : "text-muted-foreground")}>{label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</div>
                  </div>
                  <div className={cn("w-8 h-4 rounded-full flex-shrink-0 relative transition-all", antibot[key] ? "bg-purple-500" : "bg-white/20")}>
                    <div className={cn("w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all", antibot[key] ? "right-0.5" : "left-0.5")} />
                  </div>
                </button>
              ))}

              {/* Response Delay slider */}
              <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Response Delay (human-like)</span>
                  <span className="text-white font-mono">{antibot.responseDelay}ms</span>
                </div>
                <input type="range" min={500} max={4000} step={100} value={antibot.responseDelay}
                  onChange={e => toggleAntibot("responseDelay", parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-purple-500 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>0.5s fast</span><span>1.2s human</span><span>4s slow</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AUTO-HEAL */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400" /> Auto-Heal System
            </h3>
            {autoheal?.enabled && (
              <span className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-300 px-2.5 py-1 rounded-lg border border-red-500/30 font-bold">
                <Activity className="w-3 h-3 animate-pulse" /> HEALING
              </span>
            )}
          </div>

          {autoheal && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 text-center">
                <div className="text-muted-foreground">Heals Used</div>
                <div className="text-red-300 font-bold text-lg font-mono">{autoheal.healsTotal}</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 col-span-2">
                <div className="text-muted-foreground">Last Action</div>
                <div className="text-white text-[11px] font-mono mt-0.5 line-clamp-2">{autoheal.lastHealAction}</div>
              </div>
            </div>
          )}

          {autoheal && (
            <div className="space-y-2">
              {[
                { key: "enabled" as const, label: "Auto-Heal On", desc: "Enable automatic healing system", icon: Heart, color: "text-red-400" },
                { key: "useTotem" as const, label: "Totem Auto-Equip", desc: "Totem of Undying offhand mein automatically equip karo", icon: Shield, color: "text-yellow-400" },
                { key: "usePotion" as const, label: "Instant Health Potion", desc: "HP < 6 hone par health potion peena/throw karna", icon: Zap, color: "text-pink-400" },
                { key: "useGoldenApple" as const, label: "Golden Apple", desc: "HP kam hone par golden apple auto-eat karna", icon: Sparkles, color: "text-amber-400" },
                { key: "useFood" as const, label: "Auto-Eat Food", desc: "Hunger kam hone par best available food khana", icon: Activity, color: "text-green-400" },
              ].map(({ key, label, desc, icon: Icon, color }) => (
                <button key={key} onClick={() => toggleAutoheal(key, !autoheal[key])}
                  className={cn("w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    autoheal[key] ? "bg-red-500/10 border-red-500/30" : "bg-black/20 border-white/5 hover:border-white/10")}>
                  <Icon className={cn("w-4 h-4 flex-shrink-0", autoheal[key] ? color : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold", autoheal[key] ? "text-white" : "text-muted-foreground")}>{label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{desc}</div>
                  </div>
                  <div className={cn("w-8 h-4 rounded-full flex-shrink-0 relative transition-all", autoheal[key] ? "bg-red-500" : "bg-white/20")}>
                    <div className={cn("w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all", autoheal[key] ? "right-0.5" : "left-0.5")} />
                  </div>
                </button>
              ))}

              {/* Thresholds */}
              <div className="bg-black/20 rounded-xl p-3 border border-white/5 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Heal below HP</span>
                    <span className="text-white font-mono">❤ {autoheal.healthThreshold}/20</span>
                  </div>
                  <input type="range" min={4} max={18} step={1} value={autoheal.healthThreshold}
                    onChange={e => toggleAutoheal("healthThreshold", parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-red-500 cursor-pointer" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Eat below Hunger</span>
                    <span className="text-white font-mono">🍖 {autoheal.hungerThreshold}/20</span>
                  </div>
                  <input type="range" min={4} max={18} step={1} value={autoheal.hungerThreshold}
                    onChange={e => toggleAutoheal("hungerThreshold", parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full accent-green-500 cursor-pointer" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── STEALTH ─── */}
      <div className="glass-panel rounded-3xl p-5">
        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-fuchsia-400" /> Stealth — Aternos ko pata na chale
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stealth && [
            { key: "antiAfk" as const, label: "Anti-AFK", desc: "Random sneak/jump/walk", color: "text-green-400", bg: "bg-green-500" },
            { key: "humanMovement" as const, label: "Human Movement", desc: "Micro look changes", color: "text-blue-400", bg: "bg-blue-500" },
            { key: "lookAround" as const, label: "Random Look", desc: "Random camera pan", color: "text-purple-400", bg: "bg-purple-500" },
            { key: "randomChat" as const, label: "Random Chat", desc: "Occasional messages", color: "text-yellow-400", bg: "bg-yellow-500" },
          ].map(({ key, label, desc, color, bg }) => (
            <button key={key} onClick={() => toggleStealth(key, !stealth[key])}
              className={cn("p-4 rounded-2xl border text-left transition-all",
                stealth[key] ? "bg-fuchsia-500/10 border-fuchsia-500/30" : "bg-black/20 border-white/5 hover:border-white/10")}>
              <div className="flex items-center justify-between mb-2">
                <Bot className={cn("w-4 h-4", stealth[key] ? color : "text-muted-foreground")} />
                <div className={cn("w-8 h-4 rounded-full relative transition-all", stealth[key] ? bg : "bg-white/20")}>
                  <div className={cn("w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all", stealth[key] ? "right-0.5" : "left-0.5")} />
                </div>
              </div>
              <div className={cn("font-semibold text-sm", stealth[key] ? "text-white" : "text-muted-foreground")}>{label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
