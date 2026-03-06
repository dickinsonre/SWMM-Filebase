import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BrainCircuit, Settings, FolderOpen, UploadCloud, Search, FolderInput, ChevronDown, ChevronRight, Trash2, GitCompare, Loader2, Menu, Scissors, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFiles } from "@/context/FileContext";
import { useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const [location] = useLocation();
  const { files, uploadFiles, removeDirectory } = useFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [directoriesCollapsed, setDirectoriesCollapsed] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [pendingDirectory, setPendingDirectory] = useState("Imported Files");

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, description: "Overview of all your SWMM models and statistics" },
    { href: "/compare", label: "Compare Models", icon: GitCompare, description: "Side-by-side comparison of model parameters" },
    { href: "/ai-analysis", label: "AI Analysis", icon: BrainCircuit, description: "Automated model health checks and recommendations" },
    { href: "/insights", label: "Database Insights", icon: BarChart3, description: "Statistical analysis across all loaded models" },
    { href: "/reswmm", label: "ReSWMM", icon: Scissors, description: "Conduit discretization for CFL stability" },
    { href: "/settings", label: "Settings", icon: Settings, description: "Configure application preferences" },
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
    setUploadProgress({ current: 0, total: inpFiles.length });
    try {
      let directory = "Imported Files";
      if (source === 'directory' && inpFiles[0].webkitRelativePath) {
        const pathParts = inpFiles[0].webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          directory = pathParts.slice(0, -1).join('/');
        }
      }

      const result = await uploadFiles(inpFiles, directory);
      setUploadProgress({ current: inpFiles.length, total: inpFiles.length });
      
      const parts: string[] = [];
      if (result.count > 0) parts.push(`${result.count} imported`);
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} duplicate${result.skippedCount !== 1 ? 's' : ''} skipped`);
      if (result.failedCount > 0) parts.push(`${result.failedCount} failed`);

      toast({
        title: result.count > 0 ? "Import Successful" : (result.skippedCount > 0 ? "All Duplicates" : "Import Failed"),
        description: parts.join(', '),
        variant: result.count > 0 ? "default" : (result.skippedCount > 0 ? "default" : "destructive")
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
      const inpFiles = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.inp'));
      
      if (inpFiles.length === 0) {
        toast({
          title: "No .inp files found",
          description: "The selected folder contains no SWMM5 .inp files.",
          variant: "destructive"
        });
        e.target.value = '';
        return;
      }
      
      let directory = "Imported Files";
      if (inpFiles[0].webkitRelativePath) {
        const pathParts = inpFiles[0].webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          directory = pathParts[0];
        }
      }
      
      setPendingFiles(inpFiles);
      setPendingDirectory(directory);
      setSelectedFiles(new Set(inpFiles.map(f => f.name)));
      setShowFileSelector(true);
    }
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    const filesToUpload = pendingFiles.filter(f => selectedFiles.has(f.name));
    
    if (filesToUpload.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to import.",
        variant: "destructive"
      });
      return;
    }
    
    setShowFileSelector(false);
    setUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });
    
    try {
      const result = await uploadFiles(filesToUpload, pendingDirectory);
      setUploadProgress({ current: filesToUpload.length, total: filesToUpload.length });
      
      const parts: string[] = [];
      if (result.count > 0) parts.push(`${result.count} imported`);
      if (result.skippedCount > 0) parts.push(`${result.skippedCount} duplicate${result.skippedCount !== 1 ? 's' : ''} skipped`);
      if (result.failedCount > 0) parts.push(`${result.failedCount} failed`);

      toast({
        title: result.count > 0 ? "Import Successful" : (result.skippedCount > 0 ? "All Duplicates" : "Import Failed"),
        description: parts.join(', '),
        variant: result.count > 0 ? "default" : (result.skippedCount > 0 ? "default" : "destructive")
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setPendingFiles([]);
      setSelectedFiles(new Set());
    }
  };

  const toggleFileSelection = (filename: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === pendingFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(pendingFiles.map(f => f.name)));
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files, 'file');
    }
    e.target.value = '';
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6 border-b border-sidebar-border/40">
        <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
           <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
             <BrainCircuit className="h-5 w-5" />
           </div>
           SWMM 5 <span className="text-primary font-mono">Miner</span>
        </h1>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="space-y-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md text-xs gap-2 px-2 min-h-[44px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="upload-file-button"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" />
              )}
              File
            </Button>
            <Button 
              className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 shadow-sm border border-sidebar-border text-xs gap-2 px-2 min-h-[44px]"
              onClick={() => dirInputRef.current?.click()}
              disabled={uploading}
              data-testid="upload-folder-button"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderInput className="h-3.5 w-3.5" />
              )}
              Folder
            </Button>
          </div>
          
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
                data-testid="upload-progress-container"
              >
                <div className="bg-sidebar-accent/30 rounded-lg p-3 border border-sidebar-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs font-medium" data-testid="upload-status-text">
                      Uploading {uploadProgress.total} file{uploadProgress.total !== 1 ? 's' : ''}...
                    </span>
                  </div>
                  <div className="h-1.5 bg-sidebar-border/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        ease: "linear"
                      }}
                      style={{ width: "50%" }}
                      data-testid="upload-progress-bar"
                    />
                  </div>
                  <p className="text-[10px] text-sidebar-foreground/50 mt-1">
                    Processing and analyzing file content...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
          onChange={handleDirectoryImport}
        />

        <nav className="space-y-1 mb-8">
          <TooltipProvider delayDuration={300}>
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} onClick={handleNavClick}>
                      <span className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors cursor-pointer min-h-[44px]",
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{item.label}</span>
                          <span className="text-[10px] font-normal opacity-60 leading-tight">{item.description}</span>
                        </div>
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        <div className="mb-4 px-3">
          <button 
            onClick={() => setDirectoriesCollapsed(!directoriesCollapsed)}
            className="flex items-center justify-between w-full text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 hover:text-sidebar-foreground/70 transition-colors min-h-[44px]"
            data-testid="toggle-directories"
          >
            <div className="flex items-center gap-2">
              {directoriesCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              <span>Directories</span>
            </div>
            <span className="font-mono text-[10px] bg-sidebar-accent/50 px-1.5 py-0.5 rounded" data-testid="total-file-count">
              {files.length} files
            </span>
          </button>
          {!directoriesCollapsed && (
            <div className="relative mb-3">
               <Search className="absolute left-2 top-2.5 h-3 w-3 text-sidebar-foreground/40" />
               <Input 
                 placeholder="Filter..." 
                 className="h-10 pl-7 text-xs bg-sidebar-accent/30 border-sidebar-border/50 text-sidebar-foreground placeholder:text-sidebar-foreground/30 focus-visible:ring-sidebar-ring"
               />
            </div>
          )}
        </div>

        {!directoriesCollapsed && (
          <ScrollArea className="h-[200px] md:h-[300px] px-3">
            <div className="space-y-1">
              {uniqueDirectories.map((dir, i) => (
                <div key={i} className="flex items-center group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start text-xs font-normal text-sidebar-foreground/70 h-auto py-2.5 px-2 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground truncate min-h-[44px]"
                    data-testid={`directory-${i}`}
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <FolderOpen className="h-3 w-3 mr-2 shrink-0 opacity-70" />
                      <span className="truncate">{dir.split('/').pop()}</span>
                    </div>
                    <span className="font-mono font-bold text-[10px] bg-primary text-white px-1.5 py-0.5 rounded ml-2" data-testid={`directory-count-${i}`}>
                      {directoryCounts[dir]}
                    </span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        data-testid={`delete-directory-${i}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{dir.split('/').pop()}" and all {directoryCounts[dir]} files inside it? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={async () => {
                            try {
                              await removeDirectory(dir);
                              toast({
                                title: "Folder deleted",
                                description: `Deleted ${directoryCounts[dir]} files from ${dir.split('/').pop()}`,
                              });
                            } catch (error) {
                              toast({
                                title: "Delete failed",
                                description: error instanceof Error ? error.message : "Failed to delete folder",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
      
      <div className="mt-auto p-4 border-t border-sidebar-border/40">
        <a 
          href="https://github.com/SWMMEnablement/1729-SWMM5-Models" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 mb-3 rounded-md text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-colors min-h-[44px]"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          Sample SWMM5 Models
        </a>
        <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent/30 border border-sidebar-border/50" data-testid="app-version-info">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
             <span className="text-xs font-medium">SWMM5 Network Miner</span>
             <span className="text-[10px] text-sidebar-foreground/50">v1.0.0 · Open Source</span>
          </div>
        </div>
      </div>

      <Dialog open={showFileSelector} onOpenChange={setShowFileSelector}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Files to Import</DialogTitle>
            <DialogDescription>
              Found {pendingFiles.length} .inp files in "{pendingDirectory}". Select which files to import.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 py-2 border-b">
            <Checkbox 
              id="select-all"
              checked={selectedFiles.size === pendingFiles.length}
              onCheckedChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All ({selectedFiles.size}/{pendingFiles.length})
            </label>
          </div>
          
          <ScrollArea className="flex-1 max-h-[300px] pr-4">
            <div className="space-y-1">
              {pendingFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 py-2.5 px-2 rounded hover:bg-muted/50 cursor-pointer min-h-[44px]"
                  onClick={() => toggleFileSelection(file.name)}
                >
                  <Checkbox 
                    checked={selectedFiles.has(file.name)}
                    onCheckedChange={() => toggleFileSelection(file.name)}
                  />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowFileSelector(false)} className="min-h-[44px]">
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={selectedFiles.size === 0} className="min-h-[44px]">
              Import {selectedFiles.size} File{selectedFiles.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Sidebar() {
  return (
    <div className="w-64 border-r border-border h-screen fixed left-0 top-0 hidden md:block">
      <SidebarContent />
    </div>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            SWMM 5 <span className="text-primary font-mono">Miner</span>
          </span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10" data-testid="mobile-menu-button">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
