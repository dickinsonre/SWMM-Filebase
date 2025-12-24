import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Activity, GitBranch, Database, MoreVertical, Folder, Map, Eye, Loader2, Copy, Check, Pin, Download, Play, FileOutput, Save, X } from "lucide-react";
import { InpFile, CoordinateData, togglePinFile, exportFiles, recordFileAccess, updateInpFileContent } from "@/lib/api";
import { useFiles } from "@/context/FileContext";
import { toast } from "@/hooks/use-toast";
import { runSwmmSimulation } from "@/lib/swmmEngine";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { getInpFile } from "@/lib/api";
import { MapVisualization } from "./MapVisualization";
import { MinecraftMap } from "./MinecraftMap";

interface FileCardProps {
  file: InpFile;
  onPinChange?: () => void;
}

export function FileCard({ file, onPinChange }: FileCardProps) {
  const { removeFile } = useFiles();
  const [showContent, setShowContent] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showMinecraftMap, setShowMinecraftMap] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [coordinates, setCoordinates] = useState<CoordinateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      toast({
        title: "Copied",
        description: "File content copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleViewContent = async () => {
    setLoading(true);
    try {
      const fullFile = await getInpFile(file.id);
      const content = fullFile.fileContent || "No content available";
      setFileContent(content);
      setOriginalContent(content);
      setHasChanges(false);
      setShowContent(true);
      await recordFileAccess(file.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setFileContent(newContent);
    setHasChanges(newContent !== originalContent);
  };

  const handleSaveContent = async () => {
    setSaving(true);
    try {
      await updateInpFileContent(file.id, fileContent);
      setOriginalContent(fileContent);
      setHasChanges(false);
      toast({
        title: "Saved",
        description: "File content has been updated",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save file content",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseContent = () => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    setShowContent(false);
    setHasChanges(false);
  };

  const handleDelete = async () => {
    try {
      await removeFile(file.id);
      toast({
        title: "File deleted",
        description: `${file.filename} has been removed`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const handleShowMap = async () => {
    setMapLoading(true);
    try {
      const fullFile = await getInpFile(file.id);
      setCoordinates(fullFile.coordinates);
      setShowMap(true);
      await recordFileAccess(file.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load map data",
        variant: "destructive"
      });
    } finally {
      setMapLoading(false);
    }
  };

  const handleShowMinecraftMap = async () => {
    setMapLoading(true);
    try {
      const fullFile = await getInpFile(file.id);
      setCoordinates(fullFile.coordinates);
      setShowMinecraftMap(true);
      await recordFileAccess(file.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load map data",
        variant: "destructive"
      });
    } finally {
      setMapLoading(false);
    }
  };

  const handleTogglePin = async () => {
    setPinLoading(true);
    try {
      const result = await togglePinFile(file.id);
      setIsPinned(result.isPinned);
      toast({
        title: result.isPinned ? "File pinned" : "File unpinned",
        description: result.isPinned ? `${file.filename} added to quick access` : `${file.filename} removed from quick access`,
      });
      onPinChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle pin",
        variant: "destructive"
      });
    } finally {
      setPinLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      await exportFiles([file.id]);
      toast({
        title: "Export complete",
        description: `Downloaded ${file.filename} as ZIP`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export file",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulationLoading(true);
    try {
      const fullFile = await getInpFile(file.id);
      if (!fullFile.fileContent) {
        throw new Error("File content is empty");
      }

      const result = await runSwmmSimulation(fullFile.fileContent, file.filename);
      
      if (result.success) {
        setReportContent(result.reportContent);
        setShowReport(true);
        toast({
          title: "Simulation Complete",
          description: result.message,
        });
      } else {
        setReportContent(result.reportContent || result.message);
        setShowReport(true);
        toast({
          title: "Simulation Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Simulation Failed",
        description: error instanceof Error ? error.message : "Failed to run simulation",
        variant: "destructive"
      });
    } finally {
      setSimulationLoading(false);
    }
  };

  return (
    <>
      <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-medium font-mono tracking-tight text-foreground/90 break-words max-w-[180px]">
                {file.filename}
              </CardTitle>
              <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1">
                <Folder className="h-3 w-3" />
                <span>{file.directory}</span>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`file-menu-${file.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewContent} disabled={loading} data-testid={`view-content-${file.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                {loading ? "Loading..." : "View Content"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShowMap} disabled={mapLoading} data-testid={`show-map-${file.id}`}>
                <Map className="h-4 w-4 mr-2" />
                {mapLoading ? "Loading..." : "Show Map"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShowMinecraftMap} disabled={mapLoading} data-testid={`show-minecraft-map-${file.id}`}>
                <Map className="h-4 w-4 mr-2" />
                {mapLoading ? "Loading..." : "Show Minecraft Map"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleTogglePin} disabled={pinLoading} data-testid={`pin-file-${file.id}`}>
                <Pin className="h-4 w-4 mr-2" />
                {pinLoading ? "..." : isPinned ? "Unpin" : "Pin to Quick Access"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={exportLoading} data-testid={`export-file-${file.id}`}>
                <Download className="h-4 w-4 mr-2" />
                {exportLoading ? "Exporting..." : "Export as ZIP"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRunSimulation} disabled={simulationLoading} data-testid={`run-simulation-${file.id}`}>
                <Play className="h-4 w-4 mr-2" />
                {simulationLoading ? "Running..." : "Run Simulation"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)} data-testid={`delete-file-${file.id}`}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 py-4">
            <div className="flex flex-col items-center justify-center p-2 rounded bg-muted/30 border border-border/40">
              <Activity className="h-4 w-4 text-primary mb-1" />
              <span className="text-xs font-mono font-bold">{file.nodeCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nodes</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded bg-muted/30 border border-border/40">
              <GitBranch className="h-4 w-4 text-primary mb-1" />
              <span className="text-xs font-mono font-bold">{file.linkCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Links</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded bg-muted/30 border border-border/40">
              <Database className="h-4 w-4 text-primary mb-1" />
              <span className="text-xs font-mono font-bold">{file.subcatchmentCount}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Subs</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
             <div className="text-[10px] text-muted-foreground font-mono">
               {file.size} • {file.lastModified}
             </div>
             <Badge variant="outline" className="text-[10px] h-5 bg-background font-normal text-muted-foreground border-border">
               v5.1.015
             </Badge>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showContent} onOpenChange={(open) => !open && handleCloseContent()}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-auto sm:max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <DialogTitle className="font-mono flex items-center gap-2 text-sm sm:text-base truncate">
                {file.filename}
                {hasChanges && <Badge variant="secondary" className="text-xs">Unsaved</Badge>}
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  className="gap-2 h-11 min-w-[44px]"
                  data-testid="copy-content-button"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant={hasChanges ? "default" : "outline"}
                  size="sm"
                  onClick={handleSaveContent}
                  disabled={!hasChanges || saving}
                  className="gap-2 h-11 min-w-[44px]"
                  data-testid="save-content-button"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving" : "Save"}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <Textarea 
            value={fileContent}
            onChange={handleContentChange}
            className="font-mono text-xs flex-1 min-h-0 resize-none"
            data-testid="file-content-textarea"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="w-[95vw] max-w-5xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2 text-sm sm:text-base">
              <Map className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Map: {file.filename}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            {coordinates && coordinates.nodes.length > 0 ? (
              <div className="w-full h-full min-h-[300px]">
                <MapVisualization coordinates={coordinates} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg border border-border">
                <div className="text-center text-muted-foreground">
                  <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Coordinate Data</p>
                  <p className="text-sm mt-2">
                    This file does not contain a [COORDINATES] section.
                  </p>
                  <p className="text-xs mt-4 max-w-md mx-auto">
                    Add node coordinates to your .inp file to visualize the model layout.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMinecraftMap} onOpenChange={setShowMinecraftMap}>
        <DialogContent className="w-[95vw] max-w-5xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2 text-sm sm:text-base">
              <Map className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">Minecraft: {file.filename}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            {coordinates && coordinates.nodes.length > 0 ? (
              <div className="w-full h-full min-h-[300px]">
                <MinecraftMap coordinates={coordinates} />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg border border-border">
                <div className="text-center text-muted-foreground">
                  <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No Coordinate Data</p>
                  <p className="text-sm mt-2">
                    This file does not contain a [COORDINATES] section.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{file.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-auto sm:max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <DialogTitle className="font-mono flex items-center gap-2 text-sm sm:text-base">
                <FileOutput className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">Report: {file.filename}</span>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(reportContent);
                    toast({
                      title: "Copied",
                      description: "Report content copied to clipboard",
                    });
                  }}
                  className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-0 h-11 min-w-[44px]"
                  data-testid="copy-report-button"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReport(false)}
                  className="gap-2 h-11 min-w-[44px]"
                  data-testid="close-report-button"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          </DialogHeader>
          <Textarea 
            value={reportContent} 
            readOnly 
            className="font-mono text-xs flex-1 min-h-0 resize-none"
            data-testid="report-content-textarea"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
