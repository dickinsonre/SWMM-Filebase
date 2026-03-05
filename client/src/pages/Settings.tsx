import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings as SettingsIcon, Moon, Bell, Database, Scissors, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { toast } from "@/hooks/use-toast";

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

export default function Settings() {
  const [config, setConfig] = useState<ReswmmConfig>(getReswmmConfig);
  const [showDesc, setShowDesc] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (partial: Partial<ReswmmConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
    setDirty(true);
  };

  const handleSave = () => {
    saveReswmmConfig(config);
    setDirty(false);
    toast({ title: "Settings saved", description: "ReSWMM configuration has been saved" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your application preferences
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6">
            <Card className="border-primary/30">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  ReSWMM Conduit Discretization
                </CardTitle>
                <CardDescription className="text-sm">
                  Split long conduits into shorter segments for better numerical stability in SWMM's dynamic wave solver
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="reswmm-toggle" className="text-sm font-medium">Enable ReSWMM</Label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, "Apply ReSWMM" will be available on every directory
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
                      Discretized files are saved as <code>filename_Disc.inp</code> alongside the originals.
                    </p>
                  </div>
                )}

                {config.enabled && (
                  <>
                    <Separator />

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Discretization Method</Label>
                      <div className="grid grid-cols-2 gap-2">
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

                    <Button onClick={handleSave} disabled={!dirty} className="w-full gap-2" data-testid="button-save-reswmm">
                      <Save className="h-4 w-4" />
                      Save ReSWMM Settings
                    </Button>
                  </>
                )}

                {!config.enabled && dirty && (
                  <Button onClick={handleSave} variant="outline" className="w-full gap-2" data-testid="button-save-reswmm">
                    <Save className="h-4 w-4" />
                    Save Settings
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                  Appearance
                </CardTitle>
                <CardDescription className="text-sm">
                  Customize how the application looks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Use dark theme for the application
                    </p>
                  </div>
                  <Switch id="dark-mode" defaultChecked data-testid="switch-dark-mode" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-sm">
                  Configure notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="upload-notifications" className="text-sm">Upload Notifications</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show notifications when files are uploaded
                    </p>
                  </div>
                  <Switch id="upload-notifications" defaultChecked data-testid="switch-upload-notifications" />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="analysis-notifications" className="text-sm">Analysis Notifications</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Show notifications when AI analysis completes
                    </p>
                  </div>
                  <Switch id="analysis-notifications" defaultChecked data-testid="switch-analysis-notifications" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                  Data Management
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage your stored data and files
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="auto-parse" className="text-sm">Auto-parse on Upload</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Automatically extract metadata when uploading files
                      </p>
                    </div>
                    <Switch id="auto-parse" defaultChecked data-testid="switch-auto-parse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
