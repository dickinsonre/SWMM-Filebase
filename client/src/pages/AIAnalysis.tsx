import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrainCircuit, Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function AIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<null | any>(null);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Mock analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult({
        score: 85,
        issues: [
          { type: 'warning', message: 'Node 145 continuity error exceeds 5%' },
          { type: 'info', message: 'Subcatchment S-23 width parameter seems low for area' }
        ],
        suggestions: [
          "Consider increasing conduit size for Link L-10 to prevent surcharge.",
          "Check rain gage interval alignment with time step."
        ]
      });
    }, 2000);
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 h-screen flex flex-col">
        <div className="mb-8">
           <h1 className="text-3xl font-bold tracking-tight mb-2">AI Model Inspector</h1>
           <p className="text-muted-foreground">Use our AI engine to audit your .INP files for common errors, stability issues, and optimization opportunities.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
          {/* Input Section */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1 flex flex-col border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                   <Sparkles className="h-5 w-5 text-primary" />
                   Analysis Configuration
                </CardTitle>
                <CardDescription>Select a file and define the scope of the AI audit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target File</label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue placeholder="Select .inp file" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">S1_Residential.inp</SelectItem>
                      <SelectItem value="2">S1_Commercial.inp</SelectItem>
                      <SelectItem value="3">Downtown_Relief.inp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Focus Area</label>
                  <div className="grid grid-cols-2 gap-2">
                     <Button variant="outline" className="justify-start border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary">
                       Full Stability Check
                     </Button>
                     <Button variant="outline" className="justify-start">Hydrology Parameters</Button>
                     <Button variant="outline" className="justify-start">Hydraulic Capacity</Button>
                     <Button variant="outline" className="justify-start">LID Controls</Button>
                  </div>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-sm font-medium">Specific Questions (Optional)</label>
                  <Textarea 
                    placeholder="e.g., 'Why is Node J-22 flooding during the 10-year storm?'" 
                    className="flex-1 resize-none bg-muted/20"
                  />
                </div>

                <Button 
                  className="w-full mt-auto text-lg py-6 shadow-lg shadow-primary/20" 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 animate-pulse" /> Analyzing Model...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Run AI Analysis <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Output Section */}
          <div className="flex flex-col h-full">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col gap-4"
              >
                <Card className="border-border/60 shadow-sm overflow-hidden relative">
                   <div className="absolute top-0 left-0 w-2 h-full bg-green-500" />
                   <CardHeader>
                     <div className="flex justify-between items-center">
                       <CardTitle>Analysis Report</CardTitle>
                       <div className="text-2xl font-bold font-mono text-green-600">{result.score}/100</div>
                     </div>
                   </CardHeader>
                   <CardContent>
                     <p className="text-sm text-muted-foreground mb-4">Model structure is generally sound, but stability could be improved in the North sector.</p>
                     
                     <div className="space-y-3">
                       {result.issues.map((issue: any, i: number) => (
                         <div key={i} className="flex gap-3 p-3 rounded-md bg-muted/30 border border-border/50">
                           {issue.type === 'warning' ? (
                             <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                           ) : (
                             <CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0" />
                           )}
                           <span className="text-sm">{issue.message}</span>
                         </div>
                       ))}
                     </div>
                   </CardContent>
                </Card>

                <Card className="flex-1 border-border/60 shadow-sm bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> 
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {result.suggestions.map((s: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="font-mono text-primary/60 font-bold">0{i+1}</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
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
