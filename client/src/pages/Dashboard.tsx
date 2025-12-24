import { useState, useEffect } from "react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { FileCard } from "@/components/FileCard";
import { useFiles } from "@/context/FileContext";
import { InpFile, QuickAccessFile, ContentSearchResult, searchFileContent, getPinnedFiles, getRecentFiles, exportDirectory } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, SortAsc, Plus, Loader2, Pin, Clock, FileSearch, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";
import heroBg from "@assets/generated_images/technical_hydrology_network_blueprint_abstract_background.png";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [contentSearchResults, setContentSearchResults] = useState<ContentSearchResult[]>([]);
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const [pinnedFiles, setPinnedFiles] = useState<QuickAccessFile[]>([]);
  const [recentFiles, setRecentFiles] = useState<QuickAccessFile[]>([]);
  const [exportingDir, setExportingDir] = useState<string | null>(null);
  const { files, loading, error } = useFiles();

  useEffect(() => {
    loadQuickAccess();
  }, []);

  const loadQuickAccess = async () => {
    try {
      const [pinned, recent] = await Promise.all([
        getPinnedFiles(),
        getRecentFiles(5)
      ]);
      setPinnedFiles(pinned);
      setRecentFiles(recent);
    } catch (err) {
      console.error("Failed to load quick access files:", err);
    }
  };

  const handleContentSearch = async () => {
    if (!contentSearchQuery.trim()) return;
    
    setIsSearchingContent(true);
    try {
      const results = await searchFileContent(contentSearchQuery);
      setContentSearchResults(results);
      if (results.length === 0) {
        toast({
          title: "No results",
          description: `No files contain "${contentSearchQuery}"`,
        });
      }
    } catch (err) {
      toast({
        title: "Search failed",
        description: "Failed to search file content",
        variant: "destructive"
      });
    } finally {
      setIsSearchingContent(false);
    }
  };

  const clearContentSearch = () => {
    setContentSearchQuery("");
    setContentSearchResults([]);
  };

  const handleExportDirectory = async (directory: string) => {
    setExportingDir(directory);
    try {
      await exportDirectory(directory);
      toast({
        title: "Export complete",
        description: `Downloaded ${directory} as ZIP`,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        description: "Failed to export directory",
        variant: "destructive"
      });
    } finally {
      setExportingDir(null);
    }
  };

  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.directory]) {
      acc[file.directory] = [];
    }
    acc[file.directory].push(file);
    return acc;
  }, {} as Record<string, InpFile[]>);

  const filteredDirectories = Object.keys(groupedFiles).filter(dir => 
     dir.toLowerCase().includes(searchQuery.toLowerCase()) || 
     groupedFiles[dir].some(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <MobileHeader />
        <Sidebar />
        <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your models...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <MobileHeader />
        <Sidebar />
        <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-destructive mb-2">Error loading files</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="relative h-32 sm:h-48 rounded-xl overflow-hidden border border-border/40 shadow-sm group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-blue-900/90 mix-blend-multiply z-10" />
            <img 
              src={heroBg} 
              alt="Hydrology Pattern" 
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-4 sm:px-8">
              <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 tracking-tight">SWMM5 Models</h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-xl">
                {files.length} files across {Object.keys(groupedFiles).length} directories
              </p>
            </div>
          </div>

          {/* Quick Access Section */}
          {(pinnedFiles.length > 0 || recentFiles.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pinnedFiles.length > 0 && (
                <div className="bg-card/50 border border-border/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Pin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pinned Files</h3>
                  </div>
                  <div className="space-y-2">
                    {pinnedFiles.map(file => (
                      <Link key={file.id} href={`/file/${file.id}`}>
                        <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors" data-testid={`pinned-file-${file.id}`}>
                          <span className="text-sm font-mono truncate">{file.filename}</span>
                          <span className="text-xs text-muted-foreground truncate">({file.directory})</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {recentFiles.length > 0 && (
                <div className="bg-card/50 border border-border/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Files</h3>
                  </div>
                  <div className="space-y-2">
                    {recentFiles.map(file => (
                      <Link key={file.id} href={`/file/${file.id}`}>
                        <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors" data-testid={`recent-file-${file.id}`}>
                          <span className="text-sm font-mono truncate">{file.filename}</span>
                          <span className="text-xs text-muted-foreground truncate">({file.directory})</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search files and directories..." 
                className="pl-9 h-11 bg-card border-border/60 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-input"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-muted-foreground border-border/60 shadow-sm h-11">
                <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
              </Button>
              <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-muted-foreground border-border/60 shadow-sm h-11">
                <SortAsc className="h-4 w-4" /> <span className="hidden sm:inline">Sort</span>
              </Button>
              <Button className="flex-1 sm:flex-none gap-2 shadow-md h-11">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Model</span>
              </Button>
            </div>
          </div>

          {/* Content Search */}
          <div className="bg-card/50 border border-border/40 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileSearch className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Search File Content</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search within .inp files..."
                  value={contentSearchQuery}
                  onChange={(e) => setContentSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleContentSearch()}
                  className="pr-8 h-11"
                  data-testid="content-search-input"
                />
                {contentSearchQuery && (
                  <button
                    onClick={clearContentSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button onClick={handleContentSearch} disabled={isSearchingContent || !contentSearchQuery.trim()} className="h-11" data-testid="content-search-button">
                {isSearchingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-1">Search</span>
              </Button>
            </div>

            {/* Content Search Results */}
            <AnimatePresence>
              {contentSearchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-3"
                  data-testid="content-search-results"
                >
                  <div className="text-sm text-muted-foreground" data-testid="content-search-count">
                    Found {contentSearchResults.length} file(s) containing "{contentSearchQuery}"
                  </div>
                  {contentSearchResults.map(result => (
                    <div key={result.id} className="bg-muted/30 rounded-lg p-3 border border-border/40" data-testid={`search-result-${result.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-medium">{result.filename}</span>
                        <span className="text-xs text-muted-foreground">{result.directory}</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {result.matches.slice(0, 5).map((match, idx) => (
                          <div key={idx} className="text-xs font-mono bg-background/50 p-1.5 rounded flex gap-2" data-testid={`match-line-${result.id}-${idx}`}>
                            <span className="text-muted-foreground shrink-0">L{match.lineNumber}:</span>
                            <span className="truncate">{match.content}</span>
                          </div>
                        ))}
                        {result.matches.length > 5 && (
                          <div className="text-xs text-muted-foreground">
                            +{result.matches.length - 5} more matches
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* File Grid */}
        <div className="space-y-8">
          {filteredDirectories.length === 0 && files.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
              <p className="text-muted-foreground mb-2">No files yet</p>
              <p className="text-sm text-muted-foreground/70">Upload your first .inp file to get started</p>
            </div>
          )}

          {filteredDirectories.map((directory) => (
            <motion.div 
              key={directory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {directory}
                </h2>
                <div className="h-px flex-1 bg-border/60" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExportDirectory(directory)}
                  disabled={exportingDir === directory}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid={`export-dir-${directory}`}
                >
                  {exportingDir === directory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">Export</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {groupedFiles[directory]
                  .filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === "")
                  .map((file) => (
                  <FileCard key={file.id} file={file} onPinChange={loadQuickAccess} />
                ))}
              </div>
            </motion.div>
          ))}

          {filteredDirectories.length === 0 && files.length > 0 && (
            <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
              <p className="text-muted-foreground">No files found matching your search.</p>
              <Button variant="link" onClick={() => setSearchQuery("")}>Clear Search</Button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
