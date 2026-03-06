import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileProvider } from "@/context/FileContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Dashboard from "@/pages/Dashboard";
import AIAnalysis from "@/pages/AIAnalysis";
import Settings from "@/pages/Settings";
import CompareModels from "@/pages/CompareModels";
import ReSWMM from "@/pages/ReSWMM";
import Insights from "@/pages/Insights";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/compare" component={CompareModels} />
      <Route path="/ai-analysis" component={AIAnalysis} />
      <Route path="/insights" component={Insights} />
      <Route path="/reswmm" component={ReSWMM} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FileProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </FileProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
