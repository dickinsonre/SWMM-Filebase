import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Sparkles, AlertTriangle, CheckCircle2, ArrowRight, XCircle, Info, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useFiles } from "@/context/FileContext";
import { getInpFile } from "@/lib/api";
import { analyzeInpFile, type AnalysisResult } from "@/lib/inpAnalyzer";

export default function AIAnalysis() {
  const { files, loading: filesLoading } = useFiles();
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzedFileName, setAnalyzedFileName] = useState<string>("");

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
                       </div>
                       <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
                         <div className="text-lg font-bold" data-testid="text-stat-links">{result.stats.linkCount}</div>
                         <div className="text-xs text-muted-foreground">Links</div>
                       </div>
                       <div className="text-center p-2 rounded bg-muted/30 border border-border/50">
                         <div className="text-lg font-bold" data-testid="text-stat-subcatchments">{result.stats.subcatchmentCount}</div>
                         <div className="text-xs text-muted-foreground">Subcatchments</div>
                       </div>
                     </div>

                     <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                       <span>{result.stats.totalSections} sections found</span>
                       {result.stats.missingSections.length > 0 && (
                         <span>· {result.stats.missingSections.length} common sections missing</span>
                       )}
                     </div>
                     
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
      </main>
    </div>
  );
}
