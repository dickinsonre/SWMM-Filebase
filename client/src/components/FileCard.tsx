import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Activity, GitBranch, Database, MoreVertical, Folder, Map, Eye, Loader2 } from "lucide-react";
import { InpFile, CoordinateData } from "@/lib/api";
import { useFiles } from "@/context/FileContext";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface FileCardProps {
  file: InpFile;
}

export function FileCard({ file }: FileCardProps) {
  const { removeFile } = useFiles();
  const [showContent, setShowContent] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [coordinates, setCoordinates] = useState<CoordinateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);

  const handleViewContent = async () => {
    setLoading(true);
    try {
      const fullFile = await getInpFile(file.id);
      setFileContent(fullFile.fileContent || "No content available");
      setShowContent(true);
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

  return (
    <>
      <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-medium font-mono tracking-tight text-foreground/90">
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

      <Dialog open={showContent} onOpenChange={setShowContent}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-mono">{file.filename}</DialogTitle>
          </DialogHeader>
          <Textarea 
            value={fileContent} 
            readOnly 
            className="font-mono text-xs h-[60vh] resize-none"
            data-testid="file-content-textarea"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showMap} onOpenChange={setShowMap}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Map className="h-5 w-5" />
              Model Map: {file.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[65vh]">
            {coordinates && coordinates.nodes.length > 0 ? (
              <MapVisualization coordinates={coordinates} width={900} height={500} />
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
    </>
  );
}
