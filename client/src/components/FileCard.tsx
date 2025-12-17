import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Activity, GitBranch, Database, MoreVertical, Folder } from "lucide-react";
import { InpFile } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileCardProps {
  file: InpFile;
}

export function FileCard({ file }: FileCardProps) {
  return (
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Open in Editor</DropdownMenuItem>
            <DropdownMenuItem>Run Simulation</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
  );
}
