import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, XCircle, Info, FileText, PlayCircle, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useFiles } from "@/context/FileContext";
import { getInpFile } from "@/lib/api";
import { analyzeInpFile, type AnalysisResult, type SectionCategory } from "@/lib/inpAnalyzer";

interface Percentiles {
  nodePercentile: number;
  linkPercentile: number;
  subcatchmentPercentile: number;
}

function computePercentile(value: number, allValues: number[]): number {
  if (allValues.length === 0) return 50;
  const sorted = [...allValues].sort((a, b) => a - b);
  let below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

export default function AIAnalysis() {
  const { files, loading: filesLoading } = useFiles();
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzedFileName, setAnalyzedFileName] = useState<string>("");
  const [percentiles, setPercentiles] = useState<Percentiles | null>(null);

  interface BatchResult {
    fileId: string;
    filename: string;
    directory: string;
    score: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  }

  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [sortField, setSortField] = useState<'score' | 'errorCount' | 'warningCount' | 'filename'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedBatchResults = useMemo(() => {
    return [...batchResults].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'filename') {
        cmp = a.filename.localeCompare(b.filename);
      } else {
        cmp = a[sortField] - b[sortField];
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [batchResults, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'score' ? 'asc' : 'desc');
    }
  };

  const handleAnalyzeAll = async () => {
    if (files.length === 0) return;
    setIsBatchAnalyzing(true);
    setBatchResults([]);
    setBatchProgress(0);
    setBatchTotal(files.length);

    const results: BatchResult[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const fileData = await getInpFile(files[i].id);
        if (fileData.fileContent && fileData.fileContent.trim().length > 0) {
          const analysis = analyzeInpFile(fileData.fileContent);
          results.push({
            fileId: files[i].id,
            filename: files[i].filename,
            directory: files[i].directory,
            score: analysis.score,
            errorCount: analysis.issues.filter(issue => issue.type === 'error').length,
            warningCount: analysis.issues.filter(issue => issue.type === 'warning').length,
            infoCount: analysis.issues.filter(issue => issue.type === 'info').length,
          });
        } else {
          results.push({
            fileId: files[i].id,
            filename: files[i].filename,
            directory: files[i].directory,
            score: 0,
            errorCount: 0,
            warningCount: 0,
            infoCount: 0,
          });
        }
      } catch {
        results.push({
          fileId: files[i].id,
          filename: files[i].filename,
          directory: files[i].directory,
          score: -1,
          errorCount: -1,
          warningCount: -1,
          infoCount: -1,
        });
      }
      setBatchProgress(i + 1);
      setBatchResults([...results]);
    }

    setIsBatchAnalyzing(false);
  };

  useEffect(() => {
    if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [files, selectedFileId]);

  const handleAnalyze = async () => {
    if (!selectedFileId) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setResult(null);

    try {
      const fileData = await getInpFile(selectedFileId);
      const selectedFile = files.find(f => f.id === selectedFileId);
      setAnalyzedFileName(selectedFile?.filename || fileData.filename);

      if (!fileData.fileContent || fileData.fileContent.trim().length === 0) {
        setAnalysisError("File content is empty or could not be retrieved.");
        setIsAnalyzing(false);
        return;
      }

      const analysisResult = analyzeInpFile(fileData.fileContent);
      setResult(analysisResult);

      if (files.length > 1) {
        const allNodes = files.map(f => f.nodeCount);
        const allLinks = files.map(f => f.linkCount);
        const allSubs = files.map(f => f.subcatchmentCount);
        setPercentiles({
          nodePercentile: computePercentile(analysisResult.stats.nodeCount, allNodes),
          linkPercentile: computePercentile(analysisResult.stats.linkCount, allLinks),
          subcatchmentPercentile: computePercentile(analysisResult.stats.subcatchmentCount, allSubs),
        });
      } else {
        setPercentiles(null);
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    if (score >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500 shrink-0" />;
      default: return <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />;
    }
  };

  const getIssueBadgeVariant = (type: string): "destructive" | "secondary" | "outline" => {
    switch (type) {
      case 'error': return "destructive";
      case 'warning': return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen flex flex-col">
        <div className="mb-8">
           <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">AI Model Inspector</h1>
           <p className="text-muted-foreground">Audit your .INP files for common errors, stability issues, and optimization opportunities.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
          <div className="flex flex-col gap-4">
            <Card className="flex-1 flex flex-col border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Sparkles className="h-5 w-5 text-primary" />
                   Analysis Configuration
                </CardTitle>
                <CardDescription>Select a file from your library to run a structural audit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target File</label>
                  <Select value={selectedFileId} onValueChange={setSelectedFileId}>
                    <SelectTrigger data-testid="select-file">
                      <SelectValue placeholder={filesLoading ? "Loading files..." : files.length === 0 ? "No files available" : "Select .inp file"} />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map((file) => (
                        <SelectItem key={file.id} value={file.id} data-testid={`select-file-option-${file.id}`}>
                          <span className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            {file.directory !== "default" ? `${file.directory}/` : ""}{file.filename}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {files.length === 0 && !filesLoading && (
                    <p className="text-xs text-muted-foreground">Upload or load sample .inp files from the Dashboard first.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Analysis Scope</label>
                  <p className="text-xs text-muted-foreground">Full structural audit including sections, connectivity, slopes, roughness values, and missing definitions.</p>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea 
                    placeholder="Add any notes about this analysis run..." 
                    className="flex-1 resize-none bg-muted/20"
                    data-testid="input-notes"
                  />
                </div>

                <Button 
                  className="w-full mt-auto text-lg py-6 shadow-lg shadow-primary/20" 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedFileId || files.length === 0}
                  data-testid="button-analyze"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 animate-pulse" /> Analyzing Model...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Run Analysis <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col h-full">
            {analysisError && (
              <Card className="border-red-300 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span data-testid="text-analysis-error">{analysisError}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {result ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col gap-4 overflow-auto"
              >
                <Card className="border-border/60 shadow-sm overflow-hidden relative">
                   <div className={`absolute top-0 left-0 w-2 h-full ${getScoreBarColor(result.score)}`} />
                   <CardHeader>
                     <div className="flex justify-between items-center">
                       <div>
                         <CardTitle data-testid="text-report-title">Analysis Report</CardTitle>
                         <p className="text-sm text-muted-foreground mt-1" data-testid="text-analyzed-file">{analyzedFileName}</p>
                       </div>
                       <div className={`text-2xl font-bold font-mono ${getScoreColor(result.score)}`} data-testid="text-health-score">{result.score}/100</div>
                     </div>
                   </CardHeader>
                   <CardContent>
                     <p className="text-sm text-muted-foreground mb-4" data-testid="text-summary">{result.summary}</p>

                     <div className="grid grid-cols-3 gap-2 mb-4">
                       <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
                         <div className="text-lg font-bold" data-testid="text-stat-nodes">{result.stats.nodeCount}</div>
                         <div className="text-xs text-muted-foreground">Nodes</div>
                         {percentiles && (
                           <div className="text-[10px] text-primary font-medium mt-0.5" data-testid="text-node-percentile">
                             {percentiles.nodePercentile}th percentile
                           </div>
                         )}
                       </div>
                       <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
                         <div className="text-lg font-bold" data-testid="text-stat-links">{result.stats.linkCount}</div>
                         <div className="text-xs text-muted-foreground">Links</div>
                         {percentiles && (
                           <div className="text-[10px] text-primary font-medium mt-0.5" data-testid="text-link-percentile">
                             {percentiles.linkPercentile}th percentile
                           </div>
                         )}
                       </div>
                       <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
                         <div className="text-lg font-bold" data-testid="text-stat-subcatchments">{result.stats.subcatchmentCount}</div>
                         <div className="text-xs text-muted-foreground">Subcatchments</div>
                         {percentiles && (
                           <div className="text-[10px] text-primary font-medium mt-0.5" data-testid="text-sub-percentile">
                             {percentiles.subcatchmentPercentile}th percentile
                           </div>
                         )}
                       </div>
                     </div>

                     {percentiles && (
                       <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4" data-testid="percentile-comparison">
                         <div className="text-xs font-medium text-primary mb-1">Compared to {files.length} loaded models</div>
                         <p className="text-xs text-muted-foreground">
                           This model's complexity is in the {percentiles.nodePercentile}th percentile for nodes
                           and {percentiles.linkPercentile}th percentile for links.
                           {percentiles.nodePercentile >= 75 && " It's a larger-than-average model."}
                           {percentiles.nodePercentile <= 25 && " It's a smaller-than-average model."}
                           {percentiles.nodePercentile > 25 && percentiles.nodePercentile < 75 && " It's an average-sized model."}
                         </p>
                       </div>
                     )}

                     <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                       <span>{result.stats.totalSections} sections found</span>
                       {result.stats.missingSections.length > 0 && (
                         <span>· {result.stats.missingSections.length} common sections missing</span>
                       )}
                     </div>

                     {result.sectionCategories && result.sectionCategories.length > 0 && (
                       <div className="space-y-2 mb-4" data-testid="section-completeness">
                         <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Section Completeness</div>
                         {result.sectionCategories.map((cat, i) => (
                           <div key={i} className="space-y-1" data-testid={`section-cat-${i}`}>
                             <div className="flex items-center justify-between text-xs">
                               <span className="font-medium">{cat.name}</span>
                               <span className="text-muted-foreground">
                                 {cat.sections.filter(s => s.found).length}/{cat.sections.length} ({cat.completeness}%)
                               </span>
                             </div>
                             <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                               <div
                                 className={`h-full rounded-full transition-all ${
                                   cat.completeness === 100 ? 'bg-green-500' :
                                   cat.completeness >= 50 ? 'bg-blue-500' :
                                   cat.completeness > 0 ? 'bg-amber-500' : 'bg-muted/50'
                                 }`}
                                 style={{ width: `${cat.completeness}%` }}
                               />
                             </div>
                             <div className="flex flex-wrap gap-1">
                               {cat.sections.map((sec, j) => (
                                 <span
                                   key={j}
                                   className={`text-[10px] px-1.5 py-0.5 rounded ${
                                     sec.found
                                       ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                       : 'bg-muted/30 text-muted-foreground line-through'
                                   }`}
                                 >
                                   {sec.name}
                                 </span>
                               ))}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                     
                     {result.issues.length > 0 ? (
                       <div className="space-y-2 max-h-64 overflow-y-auto">
                         {result.issues.map((issue, i: number) => (
                           <div key={i} className="flex gap-3 p-3 rounded-md bg-muted/30 border border-border/50" data-testid={`issue-item-${i}`}>
                             {getIssueIcon(issue.type)}
                             <div className="flex-1 min-w-0">
                               <span className="text-sm">{issue.message}</span>
                             </div>
                             <Badge variant={getIssueBadgeVariant(issue.type)} className="shrink-0 text-xs">
                               {issue.type}
                             </Badge>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="flex gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                         <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                         <span className="text-sm text-green-700 dark:text-green-400">No issues detected — model structure looks good!</span>
                       </div>
                     )}
                   </CardContent>
                </Card>

                {result.suggestions.length > 0 && (
                  <Card className="border-border/60 shadow-sm bg-primary/5 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-primary flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> 
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-4">
                        {result.suggestions.map((s: string, i: number) => (
                          <li key={i} className="flex gap-3 text-sm" data-testid={`suggestion-item-${i}`}>
                            <span className="font-mono text-primary/60 font-bold">{String(i + 1).padStart(2, '0')}</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : !analysisError && (
              <div className="h-full rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                  <BrainCircuit className="h-8 w-8 opacity-40" />
                </div>
                <h3 className="text-lg font-medium mb-1">Ready to Analyze</h3>
                <p className="max-w-xs text-sm opacity-70">
                  Select a model file and run the analysis to identify errors and optimization opportunities.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    Batch Analysis
                  </CardTitle>
                  <CardDescription>Run the structural audit on all loaded files at once.</CardDescription>
                </div>
                <Button
                  onClick={handleAnalyzeAll}
                  disabled={isBatchAnalyzing || files.length === 0}
                  data-testid="button-analyze-all"
                >
                  {isBatchAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 animate-pulse" />
                      Analyzing {batchProgress}/{batchTotal}...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Analyze All ({files.length} files)
                    </span>
                  )}
                </Button>
              </div>
              {isBatchAnalyzing && (
                <div className="mt-3">
                  <Progress value={batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{batchProgress} of {batchTotal} files analyzed</p>
                </div>
              )}
            </CardHeader>

            {batchResults.length > 0 && (
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="batch-results-table">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left p-3 font-medium">
                            <button
                              className="flex items-center gap-1 hover:text-primary transition-colors"
                              onClick={() => handleSort('filename')}
                              data-testid="sort-filename"
                            >
                              File
                              {sortField === 'filename' ? (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </button>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <button
                              className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                              onClick={() => handleSort('score')}
                              data-testid="sort-score"
                            >
                              Health Score
                              {sortField === 'score' ? (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </button>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <button
                              className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                              onClick={() => handleSort('errorCount')}
                              data-testid="sort-errors"
                            >
                              Errors
                              {sortField === 'errorCount' ? (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </button>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <button
                              className="flex items-center gap-1 mx-auto hover:text-primary transition-colors"
                              onClick={() => handleSort('warningCount')}
                              data-testid="sort-warnings"
                            >
                              Warnings
                              {sortField === 'warningCount' ? (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBatchResults.map((r, idx) => (
                          <tr
                            key={r.fileId}
                            className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                            data-testid={`batch-row-${r.fileId}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{r.filename}</div>
                                  {r.directory !== "default" && (
                                    <div className="text-xs text-muted-foreground truncate">{r.directory}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {r.score === -1 ? (
                                <Badge variant="outline" className="text-muted-foreground">Failed</Badge>
                              ) : (
                                <span className={`font-mono font-bold ${getScoreColor(r.score)}`} data-testid={`batch-score-${r.fileId}`}>
                                  {r.score}/100
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {r.errorCount === -1 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : r.errorCount > 0 ? (
                                <Badge variant="destructive" className="font-mono" data-testid={`batch-errors-${r.fileId}`}>{r.errorCount}</Badge>
                              ) : (
                                <span className="text-green-600 font-mono" data-testid={`batch-errors-${r.fileId}`}>0</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {r.warningCount === -1 ? (
                                <span className="text-muted-foreground">—</span>
                              ) : r.warningCount > 0 ? (
                                <Badge variant="secondary" className="font-mono" data-testid={`batch-warnings-${r.fileId}`}>{r.warningCount}</Badge>
                              ) : (
                                <span className="text-green-600 font-mono" data-testid={`batch-warnings-${r.fileId}`}>0</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {!isBatchAnalyzing && batchResults.length > 0 && (
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground" data-testid="batch-summary">
                    <span>{batchResults.length} files analyzed</span>
                    <span>Avg score: {Math.round(batchResults.filter(r => r.score >= 0).reduce((sum, r) => sum + r.score, 0) / Math.max(1, batchResults.filter(r => r.score >= 0).length))}/100</span>
                    <span>Total errors: {batchResults.filter(r => r.errorCount >= 0).reduce((sum, r) => sum + r.errorCount, 0)}</span>
                    <span>Total warnings: {batchResults.filter(r => r.warningCount >= 0).reduce((sum, r) => sum + r.warningCount, 0)}</span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
