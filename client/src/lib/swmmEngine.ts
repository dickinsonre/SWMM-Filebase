declare global {
  interface Window {
    Module: {
      onRuntimeInitialized?: () => void;
      calledRun?: boolean;
    };
    FS: {
      createPath: (parent: string, path: string, canRead: boolean, canWrite: boolean) => void;
      createDataFile: (parent: string, name: string, data: string | ArrayBufferView, canRead: boolean, canWrite: boolean) => void;
      readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
      unlink: (path: string) => void;
      findObject: (path: string) => unknown | null;
      ignorePermissions: boolean;
    };
    swmm_run: (inputPath: string, reportPath: string, outputPath: string) => number;
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

function isModuleReady(): boolean {
  return typeof window.FS !== "undefined" && 
         typeof window.FS.createDataFile === "function" &&
         typeof window.swmm_run === "function";
}

async function loadSwmmModule(): Promise<void> {
  if (isModuleReady()) {
    moduleLoaded = true;
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
          resolve();
        }
      }, 50);
      
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
          resolve();
        }
      }, 50);
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

export async function runSwmmSimulation(
  inpContent: string,
  filename: string
): Promise<SimulationResult> {
  try {
    await loadSwmmModule();

    if (!isModuleReady()) {
      return {
        success: false,
        errorCode: -1,
        reportContent: "",
        outputData: null,
        message: "SWMM module not properly initialized - FS or swmm_run not available",
      };
    }

    const timestamp = Date.now();
    const inputFile = `input_${timestamp}.inp`;
    const reportFile = `report_${timestamp}.rpt`;
    const outputFile = `output_${timestamp}.out`;

    try {
      window.FS.ignorePermissions = true;
      
      const existingInput = window.FS.findObject(`/${inputFile}`);
      if (existingInput) {
        window.FS.unlink(`/${inputFile}`);
      }
      
      window.FS.createDataFile("/", inputFile, inpContent, true, true);
    } catch (err) {
      return {
        success: false,
        errorCode: -1,
        reportContent: "",
        outputData: null,
        message: `Failed to write input file: ${err}`,
      };
    }

    let errorCode: number;
    try {
      errorCode = window.swmm_run(`/${inputFile}`, `/${reportFile}`, `/${outputFile}`);
    } catch (err) {
      return {
        success: false,
        errorCode: -2,
        reportContent: "",
        outputData: null,
        message: `Simulation execution error: ${err}`,
      };
    }

    let reportContent = "";
    try {
      reportContent = window.FS.readFile(`/${reportFile}`, {
        encoding: "utf8",
      }) as string;
    } catch {
      reportContent = "Report file not generated";
    }

    let outputData: Uint8Array | null = null;
    try {
      outputData = window.FS.readFile(`/${outputFile}`) as Uint8Array;
    } catch {
      outputData = null;
    }

    try {
      window.FS.unlink(`/${inputFile}`);
    } catch {}
    try {
      window.FS.unlink(`/${reportFile}`);
    } catch {}
    try {
      window.FS.unlink(`/${outputFile}`);
    } catch {}

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
