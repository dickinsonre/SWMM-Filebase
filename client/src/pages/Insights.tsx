import { useState, useEffect, useMemo } from "react";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Database, GitBranch, Activity, Layers, Ruler, Droplets, Loader2 } from "lucide-react";

interface ChartBin {
  label: string;
  count: number;
}

interface ModelPoint {
  filename: string;
  directory: string;
  nodes: number;
  links: number;
  subcatchments: number;
}

interface InsightsData {
  totalModels: number;
  totalElements: number;
  totalConduits: number;
  processedFiles: number;
  sampledFiles: number;
  pipeDiameters: ChartBin[];
  shapes: ChartBin[];
  manningsN: ChartBin[];
  conduitLengths: ChartBin[];
  offsets: ChartBin[];
  modelComplexity: ModelPoint[];
}

function BarChartViz({ data, color = "bg-primary", label }: { data: ChartBin[]; color?: string; label: string }) {
  const max = Math.max(1, ...data.map(d => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
        return (
          <div key={i} className="group" data-testid={`bar-${label}-${i}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium truncate mr-2">{d.label}</span>
              <span className="text-muted-foreground shrink-0">{d.count.toLocaleString()} ({pct}%)</span>
            </div>
            <div className="h-5 bg-muted/30 rounded-sm overflow-hidden">
              <div
                className={`h-full ${color} rounded-sm transition-all duration-500 group-hover:opacity-80`}
                style={{ width: `${(d.count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: ChartBin[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-pink-500',
    'bg-teal-500', 'bg-indigo-500'
  ];
  const textColors = [
    'text-blue-500', 'text-emerald-500', 'text-amber-500', 'text-purple-500',
    'text-rose-500', 'text-cyan-500', 'text-orange-500', 'text-pink-500',
    'text-teal-500', 'text-indigo-500'
  ];

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {(() => {
            let cumulative = 0;
            return data.map((d, i) => {
              const pct = total > 0 ? d.count / total : 0;
              const dashArray = `${pct * 251.2} ${251.2}`;
              const dashOffset = -cumulative * 251.2;
              cumulative += pct;
              const strokeColors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#f43f5e', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1'];
              return (
                <circle
                  key={i}
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke={strokeColors[i % strokeColors.length]}
                  strokeWidth="16"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-500"
                />
              );
            });
          })()}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold">{total.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">total</div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {data.slice(0, 8).map((d, i) => {
          const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
          return (
            <div key={i} className="flex items-center gap-2 text-xs" data-testid={`shape-legend-${i}`}>
              <div className={`w-3 h-3 rounded-sm shrink-0 ${colors[i % colors.length]}`} />
              <span className="truncate flex-1">{d.label}</span>
              <span className={`font-mono font-medium shrink-0 ${textColors[i % textColors.length]}`}>{pct}%</span>
            </div>
          );
        })}
        {data.length > 8 && (
          <div className="text-xs text-muted-foreground">+{data.length - 8} more types</div>
        )}
      </div>
    </div>
  );
}

function ScatterPlot({ data }: { data: ModelPoint[] }) {
  const maxNodes = Math.max(1, ...data.map(d => d.nodes));
  const maxLinks = Math.max(1, ...data.map(d => d.links));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;
  }

  const avgRatio = data.length > 0
    ? data.reduce((s, d) => s + (d.nodes > 0 ? d.links / d.nodes : 0), 0) / data.length
    : 1;

  return (
    <div className="space-y-3">
      <div className="relative h-48 sm:h-64 border border-border/40 rounded-lg bg-muted/10 overflow-hidden">
        {data.slice(0, 200).map((d, i) => {
          const x = (d.nodes / maxNodes) * 90 + 5;
          const y = 95 - (d.links / maxLinks) * 90;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/60 hover:bg-primary hover:scale-150 transition-all cursor-pointer group"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${d.filename}\n${d.nodes} nodes, ${d.links} links`}
            />
          );
        })}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
          Nodes →
        </div>
        <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground">
          Links →
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data.length} models plotted</span>
        <span>Avg ratio: ~{avgRatio.toFixed(2)} links per node</span>
      </div>
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/insights")
      .then(res => {
        if (!res.ok) throw new Error("Failed to load insights");
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-insights-title">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Database Insights
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Statistical analysis across all loaded SWMM5 models
            </p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground text-sm">Analyzing model database...</p>
              <p className="text-muted-foreground text-xs mt-1">This may take a moment on first load</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="insights-stat-cards">
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="insight-total-models">{data.totalModels.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Models</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="insight-total-elements">{data.totalElements.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Elements</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="insight-total-conduits">{data.totalConduits.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Conduits</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-bold" data-testid="insight-processed">{data.processedFiles}</p>
                      <p className="text-xs text-muted-foreground">Files Analyzed</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border/40">
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-blue-500" />
                      Pipe Diameter Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">Circular pipe sizes across analyzed models</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2">
                    <BarChartViz data={data.pipeDiameters} color="bg-blue-500" label="diameter" />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-500" />
                      Cross-Section Shapes
                    </CardTitle>
                    <CardDescription className="text-xs">Shape type distribution across all conduits</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2">
                    <DonutChart data={data.shapes} />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-amber-500" />
                      Manning's n Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">Roughness coefficient values used in conduits</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2">
                    <BarChartViz data={data.manningsN} color="bg-amber-500" label="mannings" />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-purple-500" />
                      Conduit Length Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">Length ranges of conduits (ft)</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2">
                    <BarChartViz data={data.conduitLengths} color="bg-purple-500" label="length" />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-rose-500" />
                      Offset Patterns
                    </CardTitle>
                    <CardDescription className="text-xs">Inlet/outlet offset configurations</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2">
                    <BarChartViz data={data.offsets} color="bg-rose-500" label="offset" />
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-500" />
                      Model Complexity
                    </CardTitle>
                    <CardDescription className="text-xs">Node count vs link count per model</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2">
                    <ScatterPlot data={data.modelComplexity} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
