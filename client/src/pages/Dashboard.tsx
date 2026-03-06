import { useState, useEffect, useMemo } from "react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { FileCard } from "@/components/FileCard";
import { useFiles } from "@/context/FileContext";
import { InpFile, QuickAccessFile, ContentSearchResult, searchFileContent, getPinnedFiles, getRecentFiles, exportDirectory, getInpFile } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, SortAsc, Plus, Loader2, Pin, Clock, FileSearch, Download, X, Check, ArrowUp, ArrowDown, Activity, GitBranch, Database, FolderOpen, BarChart3, Map, BrainCircuit, GitCompare, Pickaxe, Scissors, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getReswmmConfig, type ReswmmConfig } from "./ReSWMM";
import heroBg from "@assets/generated_images/technical_hydrology_network_blueprint_abstract_background.png";

function highlightText(text: string, term: string) {
  if (!term) return text;
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark> : part
  );
}

type SortField = "name" | "size" | "nodeCount" | "linkCount" | "subcatchmentCount";
type SortDirection = "asc" | "desc";

interface FilterState {
  minNodes: number;
  maxNodes: number;
  minLinks: number;
  maxLinks: number;
  selectedDirectories: string[];
}

interface StatsData {
  totalFiles: number;
  totalDirectories: number;
  totalNodes: number;
  totalLinks: number;
  totalSubcatchments: number;
  totalSizeBytes: number;
  avgNodesPerFile: number;
  avgLinksPerFile: number;
  inpCount: number;
  xpCount: number;
}

function parseSize(size: string): number {
  const match = size.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "GB") return val * 1024 * 1024 * 1024;
  if (unit === "MB") return val * 1024 * 1024;
  if (unit === "KB") return val * 1024;
  return val;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contentSearchQuery, setContentSearchQuery] = useState("");
  const [contentSearchResults, setContentSearchResults] = useState<ContentSearchResult[]>([]);
  const [contentHighlightFile, setContentHighlightFile] = useState<{ id: string; term: string } | null>(null);
  const [highlightFileContent, setHighlightFileContent] = useState("");
  const [highlightFileLoading, setHighlightFileLoading] = useState(false);
  const [highlightFileName, setHighlightFileName] = useState("");
  const [isSearchingContent, setIsSearchingContent] = useState(false);
  const [pinnedFiles, setPinnedFiles] = useState<QuickAccessFile[]>([]);
  const [recentFiles, setRecentFiles] = useState<QuickAccessFile[]>([]);
  const [exportingDir, setExportingDir] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [applyingReswmm, setApplyingReswmm] = useState<string | null>(null);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    minNodes: 0,
    maxNodes: Infinity,
    minLinks: 0,
    maxLinks: Infinity,
    selectedDirectories: [],
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const { files, loading, error, refreshFiles, refreshCounter } = useFiles();

  const allDirectories = useMemo(() => {
    return Array.from(new Set(files.map(f => f.directory))).sort();
  }, [files]);

  const maxNodeCount = useMemo(() => Math.max(1, ...files.map(f => f.nodeCount)), [files]);
  const maxLinkCount = useMemo(() => Math.max(1, ...files.map(f => f.linkCount)), [files]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minNodes > 0) count++;
    if (filters.maxNodes < Infinity && filters.maxNodes < maxNodeCount) count++;
    if (filters.minLinks > 0) count++;
    if (filters.maxLinks < Infinity && filters.maxLinks < maxLinkCount) count++;
    if (filters.selectedDirectories.length > 0 && filters.selectedDirectories.length < allDirectories.length) count++;
    return count;
  }, [filters, maxNodeCount, maxLinkCount, allDirectories]);

  const clearFilters = () => {
    setFilters({
      minNodes: 0,
      maxNodes: Infinity,
      minLinks: 0,
      maxLinks: Infinity,
      selectedDirectories: [],
    });
  };

  useEffect(() => {
    loadQuickAccess();
    loadStats();
  }, []);

  useEffect(() => {
    loadStats();
    loadQuickAccess();
  }, [refreshCounter]);

  useEffect(() => {
    if (!contentHighlightFile) return;
    setHighlightFileLoading(true);
    getInpFile(contentHighlightFile.id).then((data) => {
      setHighlightFileContent(data.fileContent || "");
      setHighlightFileName(data.filename);
      setHighlightFileLoading(false);
    }).catch(() => {
      setHighlightFileLoading(false);
      toast({ title: "Error", description: "Failed to load file content", variant: "destructive" });
      setContentHighlightFile(null);
    });
  }, [contentHighlightFile]);

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

  const loadStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const handleLoadSamples = async () => {
    setLoadingSamples(true);
    try {
      const res = await fetch("/api/load-samples", { method: "POST" });
      const data = await res.json();
      if (data.loaded > 0) {
        toast({
          title: "Sample models loaded",
          description: `Loaded ${data.loaded} sample SWMM5 models`,
        });
        refreshFiles();
        loadStats();
      } else {
        toast({
          title: "Samples already loaded",
          description: data.message,
        });
      }
    } catch (err) {
      toast({
        title: "Failed to load samples",
        description: "Could not load sample models",
        variant: "destructive"
      });
    } finally {
      setLoadingSamples(false);
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

  const handleApplyReswmm = async (directory: string) => {
    const config = getReswmmConfig();
    if (!config.enabled) {
      toast({
        title: "ReSWMM not enabled",
        description: "Enable ReSWMM in Settings first",
        variant: "destructive",
      });
      return;
    }

    setApplyingReswmm(directory);
    try {
      const res = await fetch("/api/reswmm/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directory, config }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to apply ReSWMM");
      }
      toast({
        title: "ReSWMM Complete",
        description: `${data.filesChanged} of ${data.totalFiles} files discretized. ${data.filesCreated} _Disc.inp files created.`,
      });
      refreshFiles();
      loadStats();
    } catch (err) {
      toast({
        title: "ReSWMM failed",
        description: err instanceof Error ? err.message : "Failed to apply ReSWMM",
        variant: "destructive",
      });
    } finally {
      setApplyingReswmm(null);
    }
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    if (filters.minNodes > 0) result = result.filter(f => f.nodeCount >= filters.minNodes);
    if (filters.maxNodes < Infinity) result = result.filter(f => f.nodeCount <= filters.maxNodes);
    if (filters.minLinks > 0) result = result.filter(f => f.linkCount >= filters.minLinks);
    if (filters.maxLinks < Infinity) result = result.filter(f => f.linkCount <= filters.maxLinks);
    if (filters.selectedDirectories.length > 0) {
      result = result.filter(f => filters.selectedDirectories.includes(f.directory));
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.filename.localeCompare(b.filename); break;
        case "size": cmp = parseSize(a.size) - parseSize(b.size); break;
        case "nodeCount": cmp = a.nodeCount - b.nodeCount; break;
        case "linkCount": cmp = a.linkCount - b.linkCount; break;
        case "subcatchmentCount": cmp = a.subcatchmentCount - b.subcatchmentCount; break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, filters, sortField, sortDirection]);

  const groupedFiles = filteredAndSortedFiles.reduce((acc, file) => {
    if (!acc[file.directory]) {
      acc[file.directory] = [];
    }
    acc[file.directory].push(file);
    return acc;
  }, {} as Record<string, InpFile[]>);

  const searchLower = searchQuery.toLowerCase();
  const filteredDirectories = Object.keys(groupedFiles).filter(dir => 
     !searchQuery || dir.toLowerCase().includes(searchLower) || 
     groupedFiles[dir].some(f => f.filename.toLowerCase().includes(searchLower))
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
              <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 tracking-tight" data-testid="text-page-title">SWMM5 Model Intelligence</h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-xl" data-testid="text-file-summary">
                {stats && stats.totalFiles > 0 
                  ? `Insights from ${stats.totalFiles.toLocaleString()} models · ${(stats.totalNodes + stats.totalLinks + stats.totalSubcatchments).toLocaleString()} elements across ${stats.totalDirectories} directories`
                  : "Mine, analyze, and compare SWMM5 models — upload your .inp files or load our sample library"
                }
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && stats.totalFiles > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="stats-cards">
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-total-files">{stats.totalFiles}</p>
                    <p className="text-xs text-muted-foreground">Models</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {stats.inpCount > 0 && <span>{stats.inpCount} .inp</span>}
                      {stats.inpCount > 0 && stats.xpCount > 0 && <span> · </span>}
                      {stats.xpCount > 0 && <span>{stats.xpCount} .xp</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-total-nodes">{stats.totalNodes.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Nodes</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <GitBranch className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-total-links">{stats.totalLinks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Links</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-total-subs">{stats.totalSubcatchments.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Subcatchments</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/40 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-directories">{stats.totalDirectories}</p>
                    <p className="text-xs text-muted-foreground">Directories</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty State with Onboarding */}
          {files.length === 0 && (
            <div className="space-y-6" data-testid="empty-state-onboarding">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Pickaxe className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">Mine Models</h3>
                    <p className="text-xs text-muted-foreground">Extract metadata, counts, and parameters from .inp files automatically</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <Map className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="font-semibold mb-1">Visualize Networks</h3>
                    <p className="text-xs text-muted-foreground">See your stormwater networks rendered as interactive maps with Minecraft-style views</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                      <BrainCircuit className="h-6 w-6 text-amber-500" />
                    </div>
                    <h3 className="font-semibold mb-1">AI Analysis</h3>
                    <p className="text-xs text-muted-foreground">Get automated health scores, error detection, and optimization recommendations</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                      <GitCompare className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="font-semibold mb-1">Compare Models</h3>
                    <p className="text-xs text-muted-foreground">Side-by-side diff comparison of any two models with section-level detail</p>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-12 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                <Pickaxe className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Get Started with SWMM5 Network Miner</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload your own .inp files using the sidebar, or load our sample models to explore the app's features right away.
                </p>
                <Button 
                  size="lg" 
                  onClick={handleLoadSamples} 
                  disabled={loadingSamples}
                  className="shadow-lg gap-2"
                  data-testid="button-load-samples"
                >
                  {loadingSamples ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {loadingSamples ? "Loading Samples..." : "Load Sample Models"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Includes residential, pump station, CSO, and LID models
                </p>
              </div>
            </div>
          )}

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

          {/* Search Bar - only show when files exist */}
          {files.length > 0 && (
            <>
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
                  <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-muted-foreground border-border/60 shadow-sm h-11 relative" data-testid="button-filters">
                        <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
                        {activeFilterCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" data-testid="filter-count-badge">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start" data-testid="filter-popover">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Filter Models</h4>
                          {activeFilterCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7" data-testid="button-clear-filters">
                              Clear all
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Node Count: {filters.minNodes} – {filters.maxNodes === Infinity ? maxNodeCount : filters.maxNodes}</Label>
                          <Slider
                            min={0}
                            max={maxNodeCount}
                            step={1}
                            value={[filters.minNodes, filters.maxNodes === Infinity ? maxNodeCount : filters.maxNodes]}
                            onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minNodes: min, maxNodes: max >= maxNodeCount ? Infinity : max }))}
                            data-testid="slider-node-count"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Link Count: {filters.minLinks} – {filters.maxLinks === Infinity ? maxLinkCount : filters.maxLinks}</Label>
                          <Slider
                            min={0}
                            max={maxLinkCount}
                            step={1}
                            value={[filters.minLinks, filters.maxLinks === Infinity ? maxLinkCount : filters.maxLinks]}
                            onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minLinks: min, maxLinks: max >= maxLinkCount ? Infinity : max }))}
                            data-testid="slider-link-count"
                          />
                        </div>

                        {allDirectories.length > 1 && (
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Directories</Label>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {allDirectories.map(dir => (
                                <label key={dir} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded" data-testid={`filter-dir-${dir}`}>
                                  <Checkbox
                                    checked={filters.selectedDirectories.length === 0 || filters.selectedDirectories.includes(dir)}
                                    onCheckedChange={(checked) => {
                                      setFilters(prev => {
                                        const current = prev.selectedDirectories.length === 0 ? [...allDirectories] : [...prev.selectedDirectories];
                                        if (checked) {
                                          const next = Array.from(new Set([...current, dir]));
                                          return { ...prev, selectedDirectories: next.length === allDirectories.length ? [] : next };
                                        } else {
                                          const next = current.filter(d => d !== dir);
                                          return { ...prev, selectedDirectories: next };
                                        }
                                      });
                                    }}
                                  />
                                  <span className="truncate">{dir}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={sortOpen} onOpenChange={setSortOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 sm:flex-none gap-2 text-muted-foreground border-border/60 shadow-sm h-11" data-testid="button-sort">
                        <SortAsc className="h-4 w-4" /> <span className="hidden sm:inline">Sort</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start" data-testid="sort-popover">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm px-2 py-1">Sort By</h4>
                        {([
                          ["name", "Name"],
                          ["size", "File Size"],
                          ["nodeCount", "Node Count"],
                          ["linkCount", "Link Count"],
                          ["subcatchmentCount", "Subcatchments"],
                        ] as [SortField, string][]).map(([field, label]) => (
                          <button
                            key={field}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors ${sortField === field ? "bg-muted/70 font-medium" : ""}`}
                            onClick={() => {
                              if (sortField === field) {
                                setSortDirection(d => d === "asc" ? "desc" : "asc");
                              } else {
                                setSortField(field);
                                setSortDirection("asc");
                              }
                            }}
                            data-testid={`sort-option-${field}`}
                          >
                            <span className="flex items-center gap-2">
                              {sortField === field && <Check className="h-3 w-3 text-primary" />}
                              {sortField !== field && <span className="w-3" />}
                              {label}
                            </span>
                            {sortField === field && (
                              sortDirection === "asc" ? <ArrowUp className="h-3 w-3 text-muted-foreground" /> : <ArrowDown className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none gap-2 text-muted-foreground border-border/60 shadow-sm h-11"
                    onClick={() => {
                      if (collapsedDirs.size === filteredDirectories.length) {
                        setCollapsedDirs(new Set());
                      } else {
                        setCollapsedDirs(new Set(filteredDirectories));
                      }
                    }}
                    data-testid="button-collapse-all"
                  >
                    {collapsedDirs.size === filteredDirectories.length ? (
                      <><ChevronDown className="h-4 w-4" /> <span className="hidden sm:inline">Expand All</span></>
                    ) : (
                      <><ChevronRight className="h-4 w-4" /> <span className="hidden sm:inline">Collapse All</span></>
                    )}
                  </Button>

                  <Button className="flex-1 sm:flex-none gap-2 shadow-md h-11" data-testid="button-new-model">
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
                      placeholder='Search within .inp files (e.g. "Green-Ampt", "PUMP", "DYNWAVE")...'
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{result.directory}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setContentHighlightFile({ id: result.id, term: contentSearchQuery })}
                                data-testid={`view-search-result-${result.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {result.matches.slice(0, 5).map((match, idx) => (
                              <div key={idx} className="text-xs font-mono bg-background/50 p-1.5 rounded flex gap-2" data-testid={`match-line-${result.id}-${idx}`}>
                                <span className="text-muted-foreground shrink-0">L{match.lineNumber}:</span>
                                <span className="truncate">{highlightText(match.content, contentSearchQuery)}</span>
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
            </>
          )}
        </div>

        {/* File Grid */}
        <div className="space-y-8">
          {filteredDirectories.map((directory) => (
            <motion.div 
              key={directory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="flex items-center gap-2 flex-1 cursor-pointer select-none"
                  role="button"
                  tabIndex={0}
                  onClick={() => setCollapsedDirs(prev => {
                    const next = new Set(prev);
                    next.has(directory) ? next.delete(directory) : next.add(directory);
                    return next;
                  })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsedDirs(prev => { const next = new Set(prev); next.has(directory) ? next.delete(directory) : next.add(directory); return next; }); }}}
                  data-testid={`toggle-dir-${directory}`}
                >
                  {collapsedDirs.has(directory) ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform" />
                  )}
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    {directory}
                  </h2>
                  <span className="text-xs text-muted-foreground/70 tabular-nums">
                    ({groupedFiles[directory]?.length ?? 0})
                  </span>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApplyReswmm(directory)}
                  disabled={applyingReswmm === directory}
                  className="text-muted-foreground hover:text-foreground"
                  data-testid={`reswmm-dir-${directory}`}
                >
                  {applyingReswmm === directory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scissors className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">ReSWMM</span>
                </Button>
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
              
              <AnimatePresence initial={false}>
                {!collapsedDirs.has(directory) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {groupedFiles[directory]
                        .filter(f => !searchQuery || directory.toLowerCase().includes(searchLower) || f.filename.toLowerCase().includes(searchLower))
                        .map((file) => (
                        <FileCard key={file.id} file={file} onPinChange={loadQuickAccess} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {filteredDirectories.length === 0 && files.length > 0 && (
            <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
              <p className="text-muted-foreground">No files found matching your search.</p>
              <Button variant="link" onClick={() => setSearchQuery("")} data-testid="button-clear-search">Clear Search</Button>
            </div>
          )}
        </div>

      </main>

      <Dialog open={!!contentHighlightFile} onOpenChange={(open) => !open && setContentHighlightFile(null)}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-auto sm:max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm sm:text-base">
              {highlightFileName}
            </DialogTitle>
          </DialogHeader>
          {highlightFileLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto bg-muted/30 rounded-md p-3 font-mono text-xs leading-5" data-testid="highlight-viewer">
              {highlightFileContent.split('\n').map((line, i) => (
                <div key={i} className="flex gap-3 hover:bg-muted/50">
                  <span className="text-muted-foreground/50 select-none shrink-0 w-10 text-right tabular-nums">{i + 1}</span>
                  <span className="whitespace-pre">{contentHighlightFile ? highlightText(line, contentHighlightFile.term) : line}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
