import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar, MobileHeader } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, GitCompare, Loader2, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { compareInpFiles, type SectionDiff, type DiffLine } from "@/lib/diff";

interface InpFile {
  id: number;
  filename: string;
  directory: string;
  nodeCount: number;
  linkCount: number;
  subcatchmentCount: number;
}

interface CompareResponse {
  file1: { id: number; filename: string; directory: string; nodeCount: number; linkCount: number; subcatchmentCount: number; content: string };
  file2: { id: number; filename: string; directory: string; nodeCount: number; linkCount: number; subcatchmentCount: number; content: string };
}

export default function CompareModels() {
  const [file1Id, setFile1Id] = useState<string>("");
  const [file2Id, setFile2Id] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);

  const { data: files = [] } = useQuery<InpFile[]>({
    queryKey: ["/api/inp-files/all"],
    queryFn: async () => {
      const allFiles: InpFile[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`/api/inp-files?limit=${limit}&offset=${offset}`);
        if (!res.ok) throw new Error("Failed to fetch files");
        const data = await res.json();
        allFiles.push(...data.files);
        hasMore = data.hasMore;
        offset += limit;
      }
      return allFiles;
    },
  });

  const { data: compareData, isLoading, error } = useQuery<CompareResponse>({
    queryKey: ["/api/inp-files/compare", file1Id, file2Id],
    queryFn: async () => {
      const res = await fetch(`/api/inp-files/compare?file1=${file1Id}&file2=${file2Id}`);
      if (!res.ok) throw new Error("Failed to compare files");
      return res.json();
    },
    enabled: !!file1Id && !!file2Id && file1Id !== file2Id,
  });

  const diffResult = useMemo(() => {
    if (!compareData) return null;
    return compareInpFiles(compareData.file1.content, compareData.file2.content);
  }, [compareData]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  const generateMarkdownReport = () => {
    if (!diffResult || !compareData) return;

    const lines: string[] = [];
    lines.push(`# SWMM5 Model Comparison Report`);
    lines.push('');
    lines.push(`**Generated:** ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push(`## Files Compared`);
    lines.push('');
    lines.push(`| | Filename | Directory | Nodes | Links | Subcatchments |`);
    lines.push(`|---|---|---|---|---|---|`);
    lines.push(`| Base | ${compareData.file1.filename} | ${compareData.file1.directory} | ${compareData.file1.nodeCount} | ${compareData.file1.linkCount} | ${compareData.file1.subcatchmentCount} |`);
    lines.push(`| Compare | ${compareData.file2.filename} | ${compareData.file2.directory} | ${compareData.file2.nodeCount} | ${compareData.file2.linkCount} | ${compareData.file2.subcatchmentCount} |`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push('');
    lines.push(`- **Lines Added:** ${stats.added}`);
    lines.push(`- **Lines Removed:** ${stats.removed}`);
    lines.push(`- **Lines Unchanged:** ${stats.unchanged}`);
    lines.push(`- **Sections Changed:** ${stats.changedSections} of ${diffResult.length}`);
    lines.push('');
    lines.push(`## Section-by-Section Diff`);
    lines.push('');

    for (const section of diffResult) {
      if (!section.hasChanges) continue;
      const changeCount = section.lines.filter(l => l.type !== 'unchanged').length;
      lines.push(`### [${section.name}] — ${changeCount} change${changeCount !== 1 ? 's' : ''}`);
      lines.push('');
      lines.push('```diff');
      for (const line of section.lines) {
        if (line.type === 'added') {
          lines.push(`+ ${line.content}`);
        } else if (line.type === 'removed') {
          lines.push(`- ${line.content}`);
        } else {
          lines.push(`  ${line.content}`);
        }
      }
      lines.push('```');
      lines.push('');
    }

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${compareData.file1.filename}_vs_${compareData.file2.filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sectionsToShow = useMemo(() => {
    if (!diffResult) return [];
    return showOnlyChanges ? diffResult.filter(s => s.hasChanges) : diffResult;
  }, [diffResult, showOnlyChanges]);

  const stats = useMemo(() => {
    if (!diffResult) return { added: 0, removed: 0, unchanged: 0, changedSections: 0 };
    let added = 0, removed = 0, unchanged = 0, changedSections = 0;
    for (const section of diffResult) {
      if (section.hasChanges) changedSections++;
      for (const line of section.lines) {
        if (line.type === 'added') added++;
        else if (line.type === 'removed') removed++;
        else unchanged++;
      }
    }
    return { added, removed, unchanged, changedSections };
  }, [diffResult]);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />
      <Sidebar />
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitCompare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Compare Models</h1>
              <p className="text-muted-foreground">Compare two SWMM5 model files side by side</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Select Files to Compare</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">First Model (Base)</label>
                  <Select value={file1Id} onValueChange={setFile1Id}>
                    <SelectTrigger data-testid="select-file1">
                      <SelectValue placeholder="Select first file..." />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map(file => (
                        <SelectItem key={file.id} value={String(file.id)} disabled={String(file.id) === file2Id}>
                          {file.filename} ({file.directory})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Second Model (Compare)</label>
                  <Select value={file2Id} onValueChange={setFile2Id}>
                    <SelectTrigger data-testid="select-file2">
                      <SelectValue placeholder="Select second file..." />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map(file => (
                        <SelectItem key={file.id} value={String(file.id)} disabled={String(file.id) === file1Id}>
                          {file.filename} ({file.directory})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Comparing files...</span>
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 py-4 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to compare files. Please try again.</span>
              </CardContent>
            </Card>
          )}

          {diffResult && compareData && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-green-600">+{stats.added}</div>
                    <div className="text-sm text-muted-foreground">Lines Added</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-red-600">-{stats.removed}</div>
                    <div className="text-sm text-muted-foreground">Lines Removed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-muted-foreground">{stats.unchanged}</div>
                    <div className="text-sm text-muted-foreground">Unchanged</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-amber-600">{stats.changedSections}</div>
                    <div className="text-sm text-muted-foreground">Sections Changed</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    {compareData.file1.filename}
                  </Badge>
                  <span className="text-muted-foreground">vs</span>
                  <Badge variant="outline" className="text-sm">
                    {compareData.file2.filename}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateMarkdownReport}
                    data-testid="button-download-report"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOnlyChanges(!showOnlyChanges)}
                    data-testid="button-toggle-changes"
                  >
                    {showOnlyChanges ? "Show All Sections" : "Show Only Changes"}
                  </Button>
                </div>
              </div>

              {sectionsToShow.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center gap-2 py-12">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <span className="text-lg">Files are identical - no differences found</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {sectionsToShow.map(section => (
                    <SectionDiffView
                      key={section.name}
                      section={section}
                      isExpanded={expandedSections.has(section.name)}
                      onToggle={() => toggleSection(section.name)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!file1Id || !file2Id || file1Id === file2Id ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <GitCompare className="h-12 w-12 mb-4 opacity-50" />
                <p>Select two different files above to compare them</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function SectionDiffView({ section, isExpanded, onToggle }: { section: SectionDiff; isExpanded: boolean; onToggle: () => void }) {
  const changeCount = section.lines.filter(l => l.type !== 'unchanged').length;
  
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={cn(section.hasChanges ? "border-amber-500/50" : "")}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-mono font-semibold">[{section.name}]</span>
                {section.hasChanges && (
                  <Badge variant="secondary" className="text-amber-600">
                    {changeCount} change{changeCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{section.lines.length} lines</span>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="font-mono text-xs">
                {section.lines.map((line, idx) => (
                  <DiffLineView key={idx} line={line} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function DiffLineView({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        "flex border-b border-border/50 last:border-0",
        line.type === 'added' && "bg-green-500/10",
        line.type === 'removed' && "bg-red-500/10"
      )}
    >
      <div className="w-12 px-2 py-0.5 text-right text-muted-foreground border-r border-border/50 select-none shrink-0">
        {line.lineNumber1 ?? ''}
      </div>
      <div className="w-12 px-2 py-0.5 text-right text-muted-foreground border-r border-border/50 select-none shrink-0">
        {line.lineNumber2 ?? ''}
      </div>
      <div className="w-6 px-1 py-0.5 text-center border-r border-border/50 select-none shrink-0">
        {line.type === 'added' && <span className="text-green-600">+</span>}
        {line.type === 'removed' && <span className="text-red-600">-</span>}
      </div>
      <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
        {line.content || ' '}
      </div>
    </div>
  );
}
