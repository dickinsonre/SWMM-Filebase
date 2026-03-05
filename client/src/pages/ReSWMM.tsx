import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Scissors, ChevronDown, ChevronUp, Save, Loader2, FolderOpen, CheckCircle2, AlertCircle } from "lucide-react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { toast } from "@/hooks/use-toast";
import { useFiles } from "@/context/FileContext";

export type DiscretizationMethod = 'none' | 'fixed_interval' | 'dx_d_ratio';

export interface ReswmmConfig {
  enabled: boolean;
  method: DiscretizationMethod;
  fixedMinLength: number;
  fixedMaxLength: number;
  dxDRatio: number;
  mnsa: number;
}

export const DEFAULT_RESWMM: ReswmmConfig = {
  enabled: false,
  method: 'fixed_interval',
  fixedMinLength: 50,
  fixedMaxLength: 200,
  dxDRatio: 5,
  mnsa: 12.566,
};

const STORAGE_KEY = 'reswmm-config';

export function getReswmmConfig(): ReswmmConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_RESWMM, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_RESWMM };
}

export function saveReswmmConfig(config: ReswmmConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface ApplyResult {
  directory: string;
  totalFiles: number;
  filesChanged: number;
  filesCreated: number;
  method: string;
  results: {
    filename: string;
    changed: boolean;
    stats: any;
    newFileId?: string;
  }[];
}

export default function ReSWMM() {
  const [config, setConfig] = useState<ReswmmConfig>(getReswmmConfig);
  const [showDesc, setShowDesc] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [applyingDir, setApplyingDir] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ApplyResult | null>(null);
  const { files, refreshFiles } = useFiles();

  const directories = Array.from(new Set(files.map(f => f.directory))).sort();

  const update = (partial: Partial<ReswmmConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      saveReswmmConfig(next);
      return next;
    });
  };

  const handleApply = async (directory: string) => {
    if (!config.enabled) {
      toast({
        title: "ReSWMM not enabled",
        description: "Toggle 'Enable ReSWMM' first",
        variant: "destructive",
      });
      return;
    }

    setApplyingDir(directory);
    setLastResult(null);
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
      setLastResult(data);
      toast({
        title: "ReSWMM Complete",
        description: `${data.filesChanged} of ${data.totalFiles} files discretized. ${data.filesCreated} _Disc.inp files created.`,
      });
      refreshFiles();
    } catch (err) {
      toast({
        title: "ReSWMM failed",
        description: err instanceof Error ? err.message : "Failed to apply ReSWMM",
        variant: "destructive",
      });
    } finally {
      setApplyingDir(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-reswmm-title">
              <Scissors className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              ReSWMM Conduit Discretization
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Split long conduits into shorter segments for better numerical stability
            </p>
          </div>

          <Card className="border-primary/30">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Configuration</CardTitle>
              <CardDescription className="text-sm">
                Set discretization method and parameters, then apply to any directory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="reswmm-toggle" className="text-sm font-medium">Enable ReSWMM</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, you can apply discretization to directories below
                  </p>
                </div>
                <Switch
                  id="reswmm-toggle"
                  checked={config.enabled}
                  onCheckedChange={(checked) => update({ enabled: checked })}
                  data-testid="toggle-reswmm"
                />
              </div>

              <button
                onClick={() => setShowDesc(!showDesc)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                data-testid="button-reswmm-desc-toggle"
              >
                {showDesc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                What is ReSWMM?
              </button>

              {showDesc && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg space-y-2">
                  <p>
                    ReSWMM is a conduit discretization tool originally created by Robson Leo Pachaly. It improves hydraulic simulations by splitting long conduits into shorter, more uniform segments with intermediate junction nodes.
                  </p>
                  <p>
                    This addresses the CFL (Courant-Friedrichs-Lewy) stability condition: when a network mixes very long and very short conduits, the shortest conduit dictates the maximum stable time step for the entire model, causing instability or excessive run times.
                  </p>
                  <p>
                    Discretized files are saved as <code className="bg-muted px-1 rounded">filename_Disc.inp</code> alongside the originals.
                  </p>
                </div>
              )}

              {config.enabled && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Discretization Method</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                          config.method === 'fixed_interval'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                        onClick={() => update({ method: 'fixed_interval' })}
                        data-testid="reswmm-method-fixed"
                      >
                        <div className="font-medium mb-0.5">Fixed Interval</div>
                        <div className="text-xs text-muted-foreground">Equal-length segments within a specified range</div>
                      </button>
                      <button
                        className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                          config.method === 'dx_d_ratio'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                        onClick={() => update({ method: 'dx_d_ratio' })}
                        data-testid="reswmm-method-dxd"
                      >
                        <div className="font-medium mb-0.5">Dx/D Ratio</div>
                        <div className="text-xs text-muted-foreground">Segment length proportional to pipe diameter</div>
                      </button>
                    </div>
                  </div>

                  {config.method === 'fixed_interval' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <Label className="text-xs text-muted-foreground">Minimum Segment Length</Label>
                          <span className="text-sm font-mono font-medium" data-testid="text-reswmm-min-len">{config.fixedMinLength} ft</span>
                        </div>
                        <Slider
                          min={10}
                          max={500}
                          step={5}
                          value={[config.fixedMinLength]}
                          onValueChange={([v]) => update({ fixedMinLength: Math.min(v, config.fixedMaxLength - 10) })}
                          data-testid="slider-reswmm-min-len"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <Label className="text-xs text-muted-foreground">Maximum Segment Length</Label>
                          <span className="text-sm font-mono font-medium" data-testid="text-reswmm-max-len">{config.fixedMaxLength} ft</span>
                        </div>
                        <Slider
                          min={50}
                          max={1000}
                          step={10}
                          value={[config.fixedMaxLength]}
                          onValueChange={([v]) => update({ fixedMaxLength: Math.max(v, config.fixedMinLength + 10) })}
                          data-testid="slider-reswmm-max-len"
                        />
                      </div>
                    </div>
                  )}

                  {config.method === 'dx_d_ratio' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <Label className="text-xs text-muted-foreground">Dx/D Ratio</Label>
                        <span className="text-sm font-mono font-medium" data-testid="text-reswmm-dxd">{config.dxDRatio}</span>
                      </div>
                      <Slider
                        min={1}
                        max={20}
                        step={0.5}
                        value={[config.dxDRatio]}
                        onValueChange={([v]) => update({ dxDRatio: v })}
                        data-testid="slider-reswmm-dxd"
                      />
                      <p className="text-xs text-muted-foreground">
                        Smaller pipes get shorter segments automatically. A ratio of 5 means segment length = 5 x pipe diameter.
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <Label className="text-xs text-muted-foreground">MNSA (Minimum Nodal Surface Area)</Label>
                      <span className="text-sm font-mono font-medium" data-testid="text-reswmm-mnsa">{config.mnsa.toFixed(1)} ft²</span>
                    </div>
                    <Slider
                      min={0.1}
                      max={100}
                      step={0.1}
                      value={[config.mnsa]}
                      onValueChange={([v]) => update({ mnsa: +v.toFixed(1) })}
                      data-testid="slider-reswmm-mnsa"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ponded area at intermediate junctions. Default 12.566 ft² = 4 ft diameter manhole.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {config.enabled && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Apply to Directory
                </CardTitle>
                <CardDescription className="text-sm">
                  Select a directory to discretize all .inp files within it. New <code className="bg-muted px-1 rounded text-xs">_Disc.inp</code> files will be created.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {directories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No directories found. Upload some .inp files first.</p>
                ) : (
                  <div className="space-y-2">
                    {directories.map(dir => {
                      const fileCount = files.filter(f => f.directory === dir && !f.filename.endsWith('_Disc.inp')).length;
                      const isApplying = applyingDir === dir;
                      return (
                        <div
                          key={dir}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:border-primary/30 transition-colors"
                          data-testid={`reswmm-dir-row-${dir}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{dir}</div>
                            <div className="text-xs text-muted-foreground">{fileCount} model{fileCount !== 1 ? 's' : ''}</div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApply(dir)}
                            disabled={isApplying || fileCount === 0}
                            className="gap-1.5 ml-3"
                            data-testid={`button-apply-reswmm-${dir}`}
                          >
                            {isApplying ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Scissors className="h-4 w-4" />
                            )}
                            {isApplying ? "Applying..." : "Apply"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {lastResult && (
            <Card className="border-green-500/30">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Results — {lastResult.directory}
                </CardTitle>
                <CardDescription className="text-sm">
                  {lastResult.filesChanged} of {lastResult.totalFiles} files discretized using {lastResult.method === 'fixed_interval' ? 'Fixed Interval' : 'Dx/D Ratio'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lastResult.results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                        r.changed ? 'bg-green-500/5 border border-green-500/20' : 'bg-muted/30 border border-border/40'
                      }`}
                      data-testid={`reswmm-result-${i}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs truncate">{r.filename}</div>
                        {r.changed && r.stats && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.stats.reswmmOrigConduits} conduits → {r.stats.reswmmNewConduits} | {r.stats.reswmmNewJunctions} new junctions | {r.stats.reswmmSplitLinks} split
                          </div>
                        )}
                      </div>
                      {r.changed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
