import { useState } from "react";
import { useGetSchedules, useCreateSchedule, useDeleteSchedule } from "@workspace/api-client-react";
import { CalendarClock, Plus, Trash2, Play, Pause, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Scheduler() {
  const { data, refetch } = useGetSchedules();
  const { mutate: create } = useCreateSchedule({ onSuccess: () => { refetch(); setShowForm(false); } });
  const { mutate: del } = useDeleteSchedule({ onSuccess: () => refetch() });
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", command: "", interval: 60, enabled: true });

  const schedules = data?.schedules || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create({ data: formData });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-400" />
            Task Scheduler
          </h2>
          <p className="text-muted-foreground text-sm">Automate recurring server commands via the bot.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 border-l-4 border-l-indigo-500 animate-slide-up space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Task Name</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Hourly Broadcast" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Command (without /)</label>
              <input type="text" required value={formData.command} onChange={e => setFormData({...formData, command: e.target.value})} placeholder="say Remember to vote!" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Interval (Minutes)</label>
              <input type="number" required min={1} value={formData.interval} onChange={e => setFormData({...formData, interval: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
                Save Task
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {schedules.map(task => (
          <div key={task.id} className="glass-panel rounded-2xl p-5 hover:bg-white/[0.02] transition-colors relative group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", task.enabled ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground")}>
                  {task.enabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-white">{task.name}</h3>
              </div>
              <button onClick={() => del({ id: task.id })} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-green-400 mb-4 border border-white/5 break-all">
              /{task.command}
            </div>
            
            <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-white/5 pt-3">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Every {task.interval}m</span>
              {task.nextRun && <span>Next: {new Date(task.nextRun).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
