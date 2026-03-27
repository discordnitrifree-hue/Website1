import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <div className="glass-panel p-12 text-center rounded-3xl max-w-md w-full">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-muted-foreground mb-8">The chunk you are looking for has not been generated yet.</p>
        <Link 
          href="/" 
          className="inline-flex px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all active:scale-95"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
