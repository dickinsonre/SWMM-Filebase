interface SwmmModule {
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
  ccall: (name: string, returnType: string, argTypes: string[], args: (string | number)[]) => number;
  FS_createDataFile: (parent: string, name: string, data: string | ArrayBufferView, canRead: boolean, canWrite: boolean, canOwn?: boolean) => void;
  FS_unlink: (path: string) => void;
  FS: {
    readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
    unlink: (path: string) => void;
  };
}

declare global {
  interface Window {
    Module: SwmmModule;
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
let moduleLoading: Promise<SwmmModule> | null = null;

async function loadSwmmModule(): Promise<SwmmModule> {
  if (moduleLoaded && window.Module && window.Module.ccall) {
    return window.Module;
  }

  if (moduleLoading) {
    return moduleLoading;
  }

  moduleLoading = new Promise<SwmmModule>((resolve, reject) => {
    const existingModule = window.Module || {};
    
    (window as { Module: Partial<SwmmModule> }).Module = {
      ...existingModule,
      onRuntimeInitialized: () => {
        moduleLoaded = true;
        resolve(window.Module);
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

    timeout = setTimeout(() => {
      if (!moduleLoaded) {
        moduleLoading = null;
        reject(new Error("SWMM WebAssembly module load timeout"));
      }
    }, 30000);

    script.onload = () => {
      if (!moduleLoaded) {
        const checkReady = setInterval(() => {
          if (window.Module && window.Module.ccall) {
            clearInterval(checkReady);
            clearTimeout(timeout);
            moduleLoaded = true;
            resolve(window.Module);
          }
        }, 100);
      }
    };

    document.head.appendChild(script);
  });

  return moduleLoading;
}

export async function runSwmmSimulation(
  inpContent: string,
  filename: string
): Promise<SimulationResult> {
  try {
    const Module = await loadSwmmModule();

    if (!Module.ccall) {
      return {
        success: false,
        errorCode: -1,
        reportContent: "",
        outputData: null,
        message: "SWMM module not properly initialized - ccall not available",
      };
    }

    const timestamp = Date.now();
    const inputFile = `input_${timestamp}.inp`;
    const reportFile = `report_${timestamp}.rpt`;
    const outputFile = `output_${timestamp}.out`;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(inpContent);
      Module.FS_createDataFile("/", inputFile, data, true, true, true);
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
      errorCode = Module.ccall(
        "swmm_run",
        "number",
        ["string", "string", "string"],
        [`/${inputFile}`, `/${reportFile}`, `/${outputFile}`]
      );
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
      if (Module.FS && Module.FS.readFile) {
        reportContent = Module.FS.readFile(`/${reportFile}`, {
          encoding: "utf8",
        }) as string;
      }
    } catch {
      reportContent = "Report file not generated";
    }

    let outputData: Uint8Array | null = null;
    try {
      if (Module.FS && Module.FS.readFile) {
        outputData = Module.FS.readFile(`/${outputFile}`) as Uint8Array;
      }
    } catch {
      outputData = null;
    }

    try {
      Module.FS_unlink(`/${inputFile}`);
    } catch {}
    try {
      Module.FS_unlink(`/${reportFile}`);
    } catch {}
    try {
      Module.FS_unlink(`/${outputFile}`);
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
