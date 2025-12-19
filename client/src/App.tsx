import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileProvider } from "@/context/FileContext";
import Dashboard from "@/pages/Dashboard";
import AIAnalysis from "@/pages/AIAnalysis";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ai-analysis" component={AIAnalysis} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FileProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </FileProvider>
    </QueryClientProvider>
  );
}

export default App;
