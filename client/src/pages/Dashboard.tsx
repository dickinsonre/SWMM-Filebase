import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FileCard } from "@/components/FileCard";
import { mockInpFiles, InpFile } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, SortAsc, Plus } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@assets/generated_images/technical_hydrology_network_blueprint_abstract_background.png";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<InpFile[]>(mockInpFiles);

  // Group files by directory
  const groupedFiles = files.reduce((acc, file) => {
    if (!acc[file.directory]) {
      acc[file.directory] = [];
    }
    acc[file.directory].push(file);
    return acc;
  }, {} as Record<string, InpFile[]>);

  const filteredDirectories = Object.keys(groupedFiles).filter(dir => 
     dir.toLowerCase().includes(searchQuery.toLowerCase()) || 
     groupedFiles[dir].some(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="relative h-48 rounded-xl overflow-hidden border border-border/40 shadow-sm group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-blue-900/90 mix-blend-multiply z-10" />
            <img 
              src={heroBg} 
              alt="Hydrology Pattern" 
              className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-center px-8">
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Project Dashboard</h1>
              <p className="text-blue-100 max-w-xl">
                Manage your SWMM5 models. {files.length} active files across {Object.keys(groupedFiles).length} project directories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search files, nodes, or descriptions..." 
                className="pl-9 h-10 bg-card border-border/60 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 text-muted-foreground border-border/60 shadow-sm">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button variant="outline" className="gap-2 text-muted-foreground border-border/60 shadow-sm">
              <SortAsc className="h-4 w-4" /> Sort
            </Button>
            <Button className="gap-2 shadow-md">
              <Plus className="h-4 w-4" /> New Model
            </Button>
          </div>
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
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {directory}
                </h2>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedFiles[directory]
                  .filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === "")
                  .map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            </motion.div>
          ))}

          {filteredDirectories.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
              <p className="text-muted-foreground">No files found matching your search.</p>
              <Button variant="link" onClick={() => setSearchQuery("")}>Clear Search</Button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
