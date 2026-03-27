import { useState } from "react";
import { 
  useGetWhitelist, useAddToWhitelist, useRemoveFromWhitelist,
  useGetBanlist, useBanPlayer, useUnbanPlayer,
  useGetOpList, useAddOp, useRemoveOp
} from "@workspace/api-client-react";
import { UserPlus, Trash2, Shield, Ban, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Lists() {
  const [activeTab, setActiveTab] = useState<'whitelist' | 'banlist' | 'ops'>('whitelist');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Server Lists</h2>
        <p className="text-muted-foreground">Manage whitelist, banned players, and server operators.</p>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-4">
        <TabButton active={activeTab === 'whitelist'} onClick={() => setActiveTab('whitelist')} icon={ListChecks} label="Whitelist" color="text-green-400" />
        <TabButton active={activeTab === 'banlist'} onClick={() => setActiveTab('banlist')} icon={Ban} label="Banlist" color="text-red-400" />
        <TabButton active={activeTab === 'ops'} onClick={() => setActiveTab('ops')} icon={Shield} label="Operators" color="text-accent" />
      </div>

      <div className="glass-panel rounded-2xl p-6 min-h-[400px]">
        {activeTab === 'whitelist' && <WhitelistTab />}
        {activeTab === 'banlist' && <BanlistTab />}
        {activeTab === 'ops' && <OpsTab />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, color }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
        active 
          ? "bg-white/10 text-white shadow-lg" 
          : "text-muted-foreground hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? color : "")} />
      {label}
    </button>
  );
}

// --- TAB COMPONENTS ---

function WhitelistTab() {
  const { data, refetch } = useGetWhitelist();
  const { mutate: add } = useAddToWhitelist({ mutation: { onSuccess: () => refetch() } });
  const { mutate: remove } = useRemoveFromWhitelist({ mutation: { onSuccess: () => refetch() } });
  
  return <ListManager 
    title="Whitelist" 
    description="Players allowed to join when whitelist is enabled."
    items={data?.players || []} 
    onAdd={(name) => add({ data: { name } })}
    onRemove={(name) => remove({ name })}
    placeholder="Enter Minecraft Username"
  />;
}

function BanlistTab() {
  const { data, refetch } = useGetBanlist();
  const { mutate: add } = useBanPlayer({ mutation: { onSuccess: () => refetch() } });
  const { mutate: remove } = useUnbanPlayer({ mutation: { onSuccess: () => refetch() } });
  
  return <ListManager 
    title="Banned Players" 
    description="Players permanently blocked from the server."
    items={data?.players || []} 
    onAdd={(name) => add({ data: { name } })}
    onRemove={(name) => remove({ name })}
    placeholder="Enter Minecraft Username to ban"
    dangerMode
  />;
}

function OpsTab() {
  const { data, refetch } = useGetOpList();
  const { mutate: add } = useAddOp({ mutation: { onSuccess: () => refetch() } });
  const { mutate: remove } = useRemoveOp({ mutation: { onSuccess: () => refetch() } });
  
  return <ListManager 
    title="Server Operators" 
    description="Players with full admin permissions."
    items={data?.players || []} 
    onAdd={(name) => add({ data: { name } })}
    onRemove={(name) => remove({ name })}
    placeholder="Enter Minecraft Username to OP"
  />;
}

// --- REUSABLE MANAGER ---

function ListManager({ title, description, items, onAdd, onRemove, placeholder, dangerMode = false }: any) {
  const [input, setInput] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onAdd(input.trim());
      setInput("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-3">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button 
          type="submit"
          className={cn(
            "px-6 py-3 font-bold rounded-xl flex items-center gap-2 transition-transform active:scale-95",
            dangerMode ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
        >
          <UserPlus className="w-5 h-5" />
          Add Player
        </button>
      </form>

      <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">List is empty.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((item: string, idx: number) => (
              <li key={idx} className="p-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <img src={`https://minotar.net/helm/${item}/32.png`} alt={item} className="w-8 h-8 rounded-md bg-black/50" />
                  <span className="font-semibold text-white">{item}</span>
                </div>
                <button 
                  onClick={() => onRemove(item)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
