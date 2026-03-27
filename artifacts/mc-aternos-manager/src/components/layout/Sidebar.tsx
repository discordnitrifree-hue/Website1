import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  TerminalSquare, 
  MessageSquare, 
  ListOrdered, 
  Settings, 
  Puzzle, 
  CalendarClock,
  Archive,
  Sword
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Players", icon: Users },
  { href: "/console", label: "Console", icon: TerminalSquare },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/lists", label: "Server Lists", icon: ListOrdered },
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/scheduler", label: "Scheduler", icon: CalendarClock },
  { href: "/grinding", label: "Grinding & PvP", icon: Sword, highlight: true },
  { href: "/backups", label: "Backups", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-white/5 bg-background/95 backdrop-blur-xl hidden md:flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="relative w-10 h-10 flex items-center justify-center bg-primary/20 rounded-xl border border-primary/30 box-glow">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo-icon.png`} 
            alt="Logo" 
            className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(76,175,80,0.8)]"
          />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg leading-none tracking-wide text-white">ATERNOS</h1>
          <p className="text-xs text-primary font-mono tracking-wider">MANAGER</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-custom">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Menu</div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          const isHighlight = (item as any).highlight;
          return (
            <Link key={item.href} href={item.href} className="block">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : isHighlight
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(76,175,80,0.5)]" />
                )}
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="font-medium text-sm">{item.label}</span>
                {isHighlight && !isActive && <span className="ml-auto text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">NEW</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <h4 className="text-sm font-semibold text-white mb-1">Need Help?</h4>
          <p className="text-xs text-muted-foreground mb-3">Check the documentation for bot setup.</p>
          <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-white transition-colors">
            View Docs
          </button>
        </div>
      </div>
    </aside>
  );
}
