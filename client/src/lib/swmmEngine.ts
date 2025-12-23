declare global {
  interface Window {
    Module: {
      onRuntimeInitialized?: () => void;
      calledRun?: boolean;
      _swmm_run?: (inputPath: number, reportPath: number, outputPath: number) => number;
      cwrap?: (name: string, returnType: string, argTypes: string[]) => (...args: unknown[]) => unknown;
      FS_createPath?: (parent: string, path: string, canRead: boolean, canWrite: boolean) => void;
      FS_createDataFile?: (parent: string, name: string, data: string | ArrayBufferView, canRead: boolean, canWrite: boolean, canOwn?: boolean) => void;
      FS_unlink?: (path: string) => void;
      FS?: {
        readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
        writeFile: (path: string, data: string | ArrayBufferView) => void;
        unlink: (path: string) => void;
        mkdir: (path: string) => void;
      };
      allocateUTF8?: (str: string) => number;
      _free?: (ptr: number) => void;
      stringToUTF8?: (str: string, outPtr: number, maxBytesToWrite: number) => void;
      _malloc?: (size: number) => number;
    };
  }
}

interface SimulationResult {
  success: boolean;
  errorCode: number;
  reportContent: string;
  outputData: Uint8Array | null;
  message: string;
}

let moduleLoaded = false;
let moduleLoading: Promise<void> | null = null;
let swmmRunWrapped: ((input: string, report: string, output: string) => number) | null = null;

function isModuleReady(): boolean {
  const m = window.Module;
  if (!m) return false;
  
  const hasSwmmRun = typeof m._swmm_run === "function" || typeof m.cwrap === "function";
  const hasFS = typeof m.FS_createDataFile === "function" || Boolean(m.FS && typeof m.FS.writeFile === "function");
  
  return hasSwmmRun && hasFS;
}

async function loadSwmmModule(): Promise<void> {
  if (isModuleReady()) {
    moduleLoaded = true;
    initSwmmRun();
    return;
  }

  if (moduleLoading) {
    return moduleLoading;
  }

  moduleLoading = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector('script[src="/swmm/js.js"]');
    
    if (existingScript) {
      const checkReady = setInterval(() => {
        if (isModuleReady()) {
          clearInterval(checkReady);
          moduleLoaded = true;
          initSwmmRun();
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkReady);
        if (!moduleLoaded) {
          reject(new Error("SWMM WebAssembly module load timeout"));
        }
      }, 30000);
      return;
    }

    window.Module = {
      onRuntimeInitialized: () => {
        moduleLoaded = true;
        initSwmmRun();
        resolve();
      }
    };

    const script = document.createElement("script");
    script.src = "/swmm/js.js";
    script.async = true;

    let timeout: ReturnType<typeof setTimeout>;

    script.onerror = () => {
      clearTimeout(timeout);
      moduleLoading = null;
      reject(new Error("Failed to load SWMM WebAssembly module"));
    };

    script.onload = () => {
      const checkReady = setInterval(() => {
        if (isModuleReady()) {
          clearInterval(checkReady);
          clearTimeout(timeout);
          moduleLoaded = true;
          initSwmmRun();
          resolve();
        }
      }, 100);
    };

    timeout = setTimeout(() => {
      if (!moduleLoaded) {
        moduleLoading = null;
        reject(new Error("SWMM WebAssembly module load timeout"));
      }
    }, 30000);

    document.head.appendChild(script);
  });

  return moduleLoading;
}

function initSwmmRun(): void {
  const m = window.Module;
  if (!m) return;
  
  if (m.cwrap && !swmmRunWrapped) {
    try {
      swmmRunWrapped = m.cwrap("swmm_run", "number", ["string", "string", "string"]) as (input: string, report: string, output: string) => number;
    } catch {
      swmmRunWrapped = null;
    }
  }
}

function writeFile(path: string, content: string): boolean {
  const m = window.Module;
  if (!m) return false;
  
  try {
    const dir = path.substring(0, path.lastIndexOf("/")) || "/";
    const filename = path.substring(path.lastIndexOf("/") + 1);
    
    if (m.FS && m.FS.writeFile) {
      m.FS.writeFile(path, content);
      return true;
    }
    
    if (m.FS_createDataFile) {
      try {
        if (m.FS_unlink) {
          m.FS_unlink(path);
        }
      } catch {}
      m.FS_createDataFile(dir, filename, content, true, true);
      return true;
    }
  } catch (err) {
    console.error("writeFile error:", err);
  }
  return false;
}

function readFile(path: string): string | null {
  const m = window.Module;
  if (!m || !m.FS) return null;
  
  try {
    const result = m.FS.readFile(path, { encoding: "utf8" });
    return result as string;
  } catch {
    return null;
  }
}

function readFileBinary(path: string): Uint8Array | null {
  const m = window.Module;
  if (!m || !m.FS) return null;
  
  try {
    const result = m.FS.readFile(path);
    return result as Uint8Array;
  } catch {
    return null;
  }
}

function unlinkFile(path: string): void {
  const m = window.Module;
  if (!m) return;
  
  try {
    if (m.FS && m.FS.unlink) {
      m.FS.unlink(path);
    } else if (m.FS_unlink) {
      m.FS_unlink(path);
    }
  } catch {}
}

export async function runSwmmSimulation(
  inpContent: string,
  filename: string
): Promise<SimulationResult> {
  try {
    await loadSwmmModule();

    const m = window.Module;
    if (!m) {
      return {
        success: false,
        errorCode: -1,
        reportContent: "",
        outputData: null,
        message: "SWMM module not available",
      };
    }

    if (!swmmRunWrapped && !m._swmm_run) {
      return {
        success: false,
        errorCode: -1,
        reportContent: "",
        outputData: null,
        message: "SWMM module not properly initialized - swmm_run not available",
      };
    }

    const timestamp = Date.now();
    const inputPath = `/input_${timestamp}.inp`;
    const reportPath = `/report_${timestamp}.rpt`;
    const outputPath = `/output_${timestamp}.out`;

    if (!writeFile(inputPath, inpContent)) {
      return {
        success: false,
        errorCode: -1,
        reportContent: "",
        outputData: null,
        message: "Failed to write input file to virtual filesystem",
      };
    }

    let errorCode: number;
    try {
      if (swmmRunWrapped) {
        errorCode = swmmRunWrapped(inputPath, reportPath, outputPath);
      } else if (m._swmm_run && m.allocateUTF8 && m._free) {
        const inputPtr = m.allocateUTF8(inputPath);
        const reportPtr = m.allocateUTF8(reportPath);
        const outputPtr = m.allocateUTF8(outputPath);
        
        errorCode = m._swmm_run(inputPtr, reportPtr, outputPtr);
        
        m._free(inputPtr);
        m._free(reportPtr);
        m._free(outputPtr);
      } else {
        return {
          success: false,
          errorCode: -1,
          reportContent: "",
          outputData: null,
          message: "SWMM module missing required functions for execution",
        };
      }
    } catch (err) {
      return {
        success: false,
        errorCode: -2,
        reportContent: "",
        outputData: null,
        message: `Simulation execution error: ${err}`,
      };
    }

    const reportContent = readFile(reportPath) || "Report file not generated";
    const outputData = readFileBinary(outputPath);

    unlinkFile(inputPath);
    unlinkFile(reportPath);
    unlinkFile(outputPath);

    const success = errorCode === 0;
    let message = "";

    if (success) {
      message = `Simulation completed successfully for ${filename}`;
    } else {
      const errorMessages: Record<number, string> = {
        1: "System error - memory allocation failure",
        2: "Input file error - check your .inp file syntax",
        3: "Runoff simulation error",
        4: "Routing simulation error",
        5: "Output file error",
      };
      message =
        errorMessages[errorCode] || `Simulation failed with error code ${errorCode}`;
    }

    return {
      success,
      errorCode,
      reportContent,
      outputData,
      message,
    };
  } catch (err) {
    return {
      success: false,
      errorCode: -3,
      reportContent: "",
      outputData: null,
      message: `Failed to initialize SWMM engine: ${err}`,
    };
  }
}

export function isSwmmEngineAvailable(): boolean {
  return moduleLoaded;
}

export async function preloadSwmmEngine(): Promise<boolean> {
  try {
    await loadSwmmModule();
    return true;
  } catch {
    return false;
  }
}
