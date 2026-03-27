import { useGetPlugins } from "@workspace/api-client-react";
import { Puzzle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Plugins() {
  const { data, isLoading } = useGetPlugins();
  const plugins = data?.plugins || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Puzzle className="w-6 h-6 text-fuchsia-400" />
          Installed Plugins
        </h2>
        <p className="text-muted-foreground text-sm">View currently installed server plugins and their status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-muted-foreground">Loading plugins...</div>
        ) : plugins.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center rounded-2xl">
            <Puzzle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-white mb-2">No Plugins Found</h3>
            <p className="text-muted-foreground">This server is running Vanilla or has no plugins installed.</p>
          </div>
        ) : (
          plugins.map((plugin, i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 border-l-4 border-l-primary/50 hover:bg-white/[0.02] transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-white">{plugin.name}</h3>
                {plugin.enabled ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Version:</span>
                  <span className="text-white font-mono">{plugin.version}</span>
                </div>
                {plugin.author && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Author:</span>
                    <span className="text-white">{plugin.author}</span>
                  </div>
                )}
              </div>
              {plugin.description && (
                <p className="mt-4 text-xs text-muted-foreground leading-relaxed line-clamp-2" title={plugin.description}>
                  {plugin.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
