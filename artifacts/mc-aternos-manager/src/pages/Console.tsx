import { useState, useRef, useEffect } from "react";
import { useGetServerLogs, useSendCommand } from "@workspace/api-client-react";
import { Terminal, Send, Trash2, Power } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Console() {
  const { data, isLoading } = useGetServerLogs({ query: { refetchInterval: 2000 } });
  const { mutate: sendCommand, isPending } = useSendCommand();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const logs = data?.logs || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    
    sendCommand({ data: { command: input } }, {
      onSuccess: () => setInput("")
    });
  };

  const getLogColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR': return 'text-red-400';
      case 'SEVERE': return 'text-red-500 font-bold bg-red-500/10';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-gray-300';
      case 'DEBUG': return 'text-gray-500';
      default: return 'text-white';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-primary" />
            Live Console
          </h2>
          <p className="text-muted-foreground text-sm">Direct access to the server terminal.</p>
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-card border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border-t-4 border-t-primary/50">
        {/* Terminal Header */}
        <div className="bg-black/40 px-4 py-2 flex items-center gap-2 border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="ml-2 text-xs font-mono text-muted-foreground">server.log</span>
        </div>

        {/* Logs Area */}
        <div 
          ref={scrollRef}
          className="flex-1 bg-[#0a0a0c] p-4 overflow-y-auto scrollbar-custom font-mono text-sm leading-relaxed"
        >
          {isLoading && logs.length === 0 ? (
            <div className="text-muted-foreground animate-pulse">Connecting to server console...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={cn("py-0.5 break-all hover:bg-white/[0.02]", getLogColor(log.level))}>
                <span className="text-gray-500 mr-3">[{log.timestamp}]</span>
                <span className="font-semibold w-16 inline-block">[{log.level}]</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="bg-black/40 p-4 border-t border-white/5 flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono font-bold">/</span>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter server command..."
              className="w-full bg-[#121214] border border-white/10 rounded-xl py-3 pl-8 pr-4 font-mono text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <button 
            type="submit" 
            disabled={isPending || !input.trim()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:transform-none"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
