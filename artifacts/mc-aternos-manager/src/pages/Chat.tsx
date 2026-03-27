import { useState, useRef, useEffect } from "react";
import { useGetChatHistory, useSendChatMessage } from "@workspace/api-client-react";
import { MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { data, isLoading } = useGetChatHistory({ query: { refetchInterval: 2000 } });
  const { mutate: sendMessage, isPending } = useSendChatMessage();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = data?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    sendMessage({ data: { message: input } }, { onSuccess: () => setInput("") });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-400" />
          Server Chat
        </h2>
        <p className="text-muted-foreground text-sm">Chat globally with players in-game.</p>
      </div>

      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto scrollbar-custom space-y-4">
          {isLoading && messages.length === 0 ? (
            <div className="text-center text-muted-foreground animate-pulse mt-10">Loading chat history...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-10">No messages yet. Say hi!</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn(
                "flex gap-3 max-w-[80%]",
                msg.isBot ? "ml-auto flex-row-reverse" : ""
              )}>
                <img 
                  src={`https://minotar.net/helm/${msg.author}/32.png`} 
                  alt={msg.author} 
                  className="w-10 h-10 rounded-lg bg-black/50 flex-shrink-0"
                />
                <div className={cn(
                  "flex flex-col",
                  msg.isBot ? "items-end" : "items-start"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-white">{msg.author}</span>
                    <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed text-white",
                    msg.isBot ? "bg-blue-600/80 rounded-tr-sm" : "bg-white/10 rounded-tl-sm"
                  )}>
                    {msg.message}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-black/40 p-4 border-t border-white/5 flex gap-3">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            autoComplete="off"
          />
          <button 
            type="submit" 
            disabled={isPending || !input.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:transform-none"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
