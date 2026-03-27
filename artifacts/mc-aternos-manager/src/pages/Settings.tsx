import { useState, useEffect } from "react";
import { useGetServerConfig, useSaveServerConfig } from "@workspace/api-client-react";
import { Settings as SettingsIcon, Save, Server, Shield, Globe, Gamepad2, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { data: config, isLoading } = useGetServerConfig();
  const { mutate: saveConfig, isPending } = useSaveServerConfig();
  const [formData, setFormData] = useState<any>({});
  const [onlineModeGuideOpen, setOnlineModeGuideOpen] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    saveConfig({ data: formData });
  };

  if (isLoading) return <div className="p-8 text-center text-white animate-pulse">Loading configuration...</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl py-4 z-20 border-b border-white/5 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Server Configuration
          </h2>
          <p className="text-muted-foreground text-sm">Manage connection details and server.properties.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isPending}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ─── ONLINE MODE FIX BANNER ─── */}
      <div className="rounded-2xl border border-red-500/40 bg-red-500/5 overflow-hidden">
        <button
          onClick={() => setOnlineModeGuideOpen(v => !v)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-red-500/10 transition-colors"
        >
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="text-red-300 font-bold text-sm">"Failed to verify username" / "Invalid session" error?</div>
            <div className="text-red-400/70 text-xs mt-0.5">Tera server online-mode pe hai. Click karke step-by-step fix dekho →</div>
          </div>
          {onlineModeGuideOpen
            ? <ChevronDown className="w-5 h-5 text-red-400 flex-shrink-0" />
            : <ChevronRight className="w-5 h-5 text-red-400 flex-shrink-0" />
          }
        </button>

        {onlineModeGuideOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-red-500/20">
            <p className="text-red-300/80 text-sm pt-4">
              Yeh error tab aata hai jab server <strong className="text-red-300">online-mode=true</strong> pe hota hai — matlab server sirf premium (paid) Minecraft accounts allow karta hai.
              Bot cracked (offline) mode se connect karta hai, isliye reject ho jaata hai.
              <br /><br />
              <strong className="text-yellow-300">✅ Solution: Server ko offline/cracked mode pe set karo.</strong>
            </p>

            {/* Aternos */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🌐</span>
                <span className="text-white font-bold text-sm">Aternos Server</span>
              </div>
              {["1. aternos.org pe jaao → apna server select karo", "2. Left menu mein 'Options' click karo", "3. 'Server Properties' section dhoondo", "4. 'online-mode' wali setting dhoondo", "5. Isko FALSE / OFF karo", "6. Server restart karo — done! ✅"].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold text-xs mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                  <span>{step.replace(/^\d+\.\s/, "")}</span>
                </div>
              ))}
            </div>

            {/* NexoHost / PaidMC */}
            <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💎</span>
                <span className="text-white font-bold text-sm">NexoHost / PaidMC / Paid Hosting</span>
              </div>
              {["Apne hosting panel pe jaao (e.g. panel.nexohost.online)", "Left sidebar mein 'Files' ya 'File Manager' click karo", "server.properties file dhoondo aur open karo", "'online-mode=true' line ko 'online-mode=false' se replace karo", "File save karo → server restart karo → done! ✅"].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary font-bold text-xs mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-xs font-mono">online-mode=<span className="line-through text-red-400">true</span> → online-mode=<span className="text-green-400">false</span></p>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
              <strong>ℹ️ Note:</strong> online-mode=false karne se cracked/TLauncher players bhi server pe aa sakenge. Agar sirf apne aap ko allow karna chahte ho toh Whitelist on karo (Security section mein).
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Connection Setup */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Server className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-white">Bot Connection Setup</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Aternos Server IP</label>
              <input 
                type="text" 
                value={formData.serverIp || ''} 
                onChange={e => handleChange('serverIp', e.target.value)}
                placeholder="yourserver.aternos.me"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Server Port</label>
                <input 
                  type="text" 
                  value={formData.serverPort || '25565'} 
                  onChange={e => handleChange('serverPort', e.target.value)}
                  placeholder="25565"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Default: 25565</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Minecraft Version</label>
                <select
                  value={formData.version || '1.21.11'}
                  onChange={e => handleChange('version', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="1.21.11">1.21.11 ✨ Latest 2026</option>
                  <option value="1.21.10">1.21.10</option>
                  <option value="1.21.9">1.21.9</option>
                  <option value="1.21.8">1.21.8</option>
                  <option value="1.21.7">1.21.7</option>
                  <option value="1.21.6">1.21.6</option>
                  <option value="1.21.5">1.21.5</option>
                  <option value="1.21.4">1.21.4</option>
                  <option value="1.21.3">1.21.3</option>
                  <option value="1.21.1">1.21.1</option>
                  <option value="1.20.4">1.20.4</option>
                  <option value="1.20.2">1.20.2</option>
                  <option value="1.20.1">1.20.1</option>
                  <option value="1.19.4">1.19.4</option>
                  <option value="1.19.2">1.19.2</option>
                  <option value="1.18.2">1.18.2</option>
                  <option value="1.17.1">1.17.1</option>
                  <option value="1.16.5">1.16.5</option>
                  <option value="1.12.2">1.12.2</option>
                  <option value="1.8.9">1.8.9</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Bot Name (Username)</label>
                <input 
                  type="text" 
                  value={formData.botName || ''} 
                  onChange={e => handleChange('botName', e.target.value)}
                  placeholder="247_AFK_Bot"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Reconnect Delay (seconds)</label>
                <input 
                  type="number"
                  min="1"
                  max="60"
                  value={formData.reconnectDelay || 5} 
                  onChange={e => handleChange('reconnectDelay', parseFloat(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-4">
              <ToggleRow 
                label="Has Login Plugin? (AuthMe)" 
                desc="Enable if your server requires /login password"
                checked={formData.hasLoginPlugin} 
                onChange={(v) => handleChange('hasLoginPlugin', v)} 
              />
              
              {formData.hasLoginPlugin && (
                <div className="pt-2 animate-slide-up">
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Bot Login Password</label>
                  <input 
                    type="password" 
                    value={formData.botPassword || ''} 
                    onChange={e => handleChange('botPassword', e.target.value)}
                    placeholder="Enter password for /login"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-black/20 rounded-xl border border-white/5">
              <ToggleRow 
                label="Auto-Reconnect" 
                desc="Automatically reconnect bot if kicked or server restarts"
                checked={formData.autoReconnect} 
                onChange={(v) => handleChange('autoReconnect', v)} 
              />
            </div>
          </div>
        </div>

        {/* Gameplay Settings */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400"><Gamepad2 className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-white">Gameplay (server.properties)</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Game Mode</label>
                <select 
                  value={formData.gameMode || 'survival'}
                  onChange={e => handleChange('gameMode', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none"
                >
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                  <option value="spectator">Spectator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Difficulty</label>
                <select 
                  value={formData.difficulty || 'normal'}
                  onChange={e => handleChange('difficulty', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none"
                >
                  <option value="peaceful">Peaceful</option>
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Max Players</label>
              <input 
                type="number" 
                value={formData.maxPlayers || 20} 
                onChange={e => handleChange('maxPlayers', parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-3 pt-2">
              <ToggleRow label="PVP Enabled" checked={formData.pvp} onChange={v => handleChange('pvp', v)} />
              <ToggleRow label="Hardcore Mode" checked={formData.hardcore} onChange={v => handleChange('hardcore', v)} />
              <ToggleRow label="Enable Command Blocks" checked={formData.enableCommandBlocks} onChange={v => handleChange('enableCommandBlocks', v)} />
              <ToggleRow label="Force Gamemode" checked={formData.forceGamemode} onChange={v => handleChange('forceGamemode', v)} />
              <ToggleRow label="Allow Flight" checked={formData.allowFlight} onChange={v => handleChange('allowFlight', v)} />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400"><Shield className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-white">Security</h3>
          </div>
          <div className="space-y-4">
            <ToggleRow label="Enable Whitelist" desc="Only allow specific players to join" checked={formData.enableWhitelist} onChange={v => handleChange('enableWhitelist', v)} />
            <ToggleRow label="Online Mode (Cracked)" desc="Must be OFF if using TLauncher/Cracked clients" checked={formData.onlineMode} onChange={v => handleChange('onlineMode', v)} />
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Spawn Protection (radius)</label>
              <input 
                type="number" 
                value={formData.spawnProtection || 16} 
                onChange={e => handleChange('spawnProtection', parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Presentation Settings */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400"><Globe className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-white">Presentation</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">MOTD (Message of the Day)</label>
              <input 
                type="text" 
                value={formData.motd || ''} 
                onChange={e => handleChange('motd', e.target.value)}
                placeholder="A Minecraft Server"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Resource Pack URL</label>
              <input 
                type="text" 
                value={formData.resourcePack || ''} 
                onChange={e => handleChange('resourcePack', e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary focus:outline-none"
              />
            </div>
            <ToggleRow label="Announce Player Achievements" checked={formData.announcePlayerAchievements} onChange={v => handleChange('announcePlayerAchievements', v)} />
          </div>
        </div>

      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "w-11 h-6 rounded-full transition-colors relative",
          checked ? "bg-primary" : "bg-white/10"
        )}
      >
        <span className={cn(
          "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-md",
          checked ? "translate-x-5" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}
