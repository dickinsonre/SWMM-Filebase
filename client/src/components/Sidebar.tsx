import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BrainCircuit, Settings, FolderOpen, UploadCloud, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ai-analysis", label: "AI Analysis", icon: BrainCircuit },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const directories = [
    "Project_Alpha/North_Catchment",
    "Project_Alpha/City_Center",
    "Project_Beta/Baseline",
    "Project_Beta/Scenarios",
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-sidebar-border/40">
        <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
           <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
             <BrainCircuit className="h-5 w-5" />
           </div>
           SWMM<span className="text-primary font-mono">Mgr</span>
        </h1>
      </div>

      <div className="p-4">
        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md mb-6 gap-2">
          <UploadCloud className="h-4 w-4" />
          Import .INP File
        </Button>

        <nav className="space-y-1 mb-8">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mb-4 px-3">
          <h2 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3">
            Directories
          </h2>
          <div className="relative mb-3">
             <Search className="absolute left-2 top-2.5 h-3 w-3 text-sidebar-foreground/40" />
             <Input 
               placeholder="Filter..." 
               className="h-8 pl-7 text-xs bg-sidebar-accent/30 border-sidebar-border/50 text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-ring"
             />
          </div>
        </div>

        <ScrollArea className="h-[300px] px-3">
          <div className="space-y-1">
            {directories.map((dir, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs font-normal text-sidebar-foreground/70 h-auto py-1.5 px-2 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground truncate"
              >
                <FolderOpen className="h-3 w-3 mr-2 shrink-0 opacity-70" />
                <span className="truncate">{dir.split('/').pop()}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="mt-auto p-4 border-t border-sidebar-border/40">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent/30 border border-sidebar-border/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            JD
          </div>
          <div className="flex flex-col">
             <span className="text-xs font-medium">Jane Doe</span>
             <span className="text-[10px] text-sidebar-foreground/50">Hydrology Lead</span>
          </div>
        </div>
      </div>
    </div>
  );
}
