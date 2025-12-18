import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BrainCircuit, Settings, FolderOpen, UploadCloud, Search, FolderInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useFiles } from "@/context/FileContext";
import { useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

export function Sidebar() {
  const [location] = useLocation();
  const { files, uploadFiles } = useFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ai-analysis", label: "AI Analysis", icon: BrainCircuit },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const directoryCounts = files.reduce((acc, file) => {
    acc[file.directory] = (acc[file.directory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueDirectories = Object.keys(directoryCounts);

  const handleFileUpload = async (fileList: FileList, source: 'file' | 'directory') => {
    const inpFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.inp'));
    
    if (inpFiles.length === 0) {
      toast({
        title: "No .inp files found",
        description: "Please select valid SWMM5 .inp files.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // For directory imports, extract directory path from first file
      let directory = "Imported Files";
      if (source === 'directory' && inpFiles[0].webkitRelativePath) {
        const pathParts = inpFiles[0].webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          directory = pathParts.slice(0, -1).join('/');
        }
      }

      await uploadFiles(inpFiles, directory);
      
      const fileNames = inpFiles.map(f => f.name).join(', ');
      toast({
        title: "Import Successful",
        description: `Uploaded: ${fileNames}`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDirectoryImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files, 'directory');
    }
    e.target.value = '';
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files, 'file');
    }
    e.target.value = '';
  };

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
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md text-xs gap-2 px-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {uploading ? 'Uploading...' : 'File'}
          </Button>
          <Button 
            className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 shadow-sm border border-sidebar-border text-xs gap-2 px-2"
            onClick={() => dirInputRef.current?.click()}
            disabled={uploading}
          >
            <FolderInput className="h-3.5 w-3.5" />
            {uploading ? 'Uploading...' : 'Folder'}
          </Button>
        </div>

        {/* Hidden Inputs */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".inp" 
          multiple
          onChange={handleFileImport} 
        />
        <input 
          type="file" 
          ref={dirInputRef} 
          className="hidden" 
          // @ts-ignore
          webkitdirectory="" 
          directory=""
          multiple 
          accept=".inp"
          onChange={handleDirectoryImport}
        />

        <nav className="space-y-1 mb-8">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
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
            {uniqueDirectories.map((dir, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs font-normal text-sidebar-foreground/70 h-auto py-1.5 px-2 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground truncate"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <FolderOpen className="h-3 w-3 mr-2 shrink-0 opacity-70" />
                  <span className="truncate">{dir.split('/').pop()}</span>
                </div>
                <span className="text-[10px] text-muted-foreground ml-2 opacity-60">
                  {directoryCounts[dir]}
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="mt-auto p-4 border-t border-sidebar-border/40">
        <a 
          href="https://github.com/SWMMEnablement/1729-SWMM5-Models" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 mb-3 rounded-md text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Sample SWMM5 Models
        </a>
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
