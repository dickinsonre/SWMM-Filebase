interface SwmmModule {
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
    unlink: (path: string) => void;
  };
  cwrap: (name: string, returnType: string, argTypes: string[]) => (...args: string[]) => number;
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
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
  if (moduleLoaded && window.Module) {
    return window.Module;
  }

  if (moduleLoading) {
    return moduleLoading;
  }

  moduleLoading = new Promise<SwmmModule>((resolve, reject) => {
    const existingModule = (window as { Module?: Partial<SwmmModule> }).Module;
    
    const moduleConfig: Partial<SwmmModule> = {
      ...existingModule,
      onRuntimeInitialized: () => {
        moduleLoaded = true;
        resolve(window.Module);
      }
    };
    
    (window as { Module: Partial<SwmmModule> }).Module = moduleConfig as SwmmModule;

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

    const originalCallback = moduleConfig.onRuntimeInitialized;
    moduleConfig.onRuntimeInitialized = () => {
      clearTimeout(timeout);
      if (originalCallback) originalCallback();
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

    const timestamp = Date.now();
    const inputPath = `/input_${timestamp}.inp`;
    const reportPath = `/report_${timestamp}.rpt`;
    const outputPath = `/output_${timestamp}.out`;

    try {
      Module.FS.writeFile(inputPath, inpContent);
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
      const swmm_run = Module.cwrap("swmm_run", "number", ["string", "string", "string"]);
      errorCode = swmm_run(inputPath, reportPath, outputPath);
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
      reportContent = Module.FS.readFile(reportPath, {
        encoding: "utf8",
      }) as string;
    } catch {
      reportContent = "Report file not generated";
    }

    let outputData: Uint8Array | null = null;
    try {
      outputData = Module.FS.readFile(outputPath) as Uint8Array;
    } catch {
      outputData = null;
    }

    try {
      Module.FS.unlink(inputPath);
    } catch {}
    try {
      Module.FS.unlink(reportPath);
    } catch {}
    try {
      Module.FS.unlink(outputPath);
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
