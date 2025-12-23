interface SwmmModule {
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
    unlink: (path: string) => void;
    mkdir: (path: string) => void;
  };
  cwrap: (
    name: string,
    returnType: string,
    argTypes: string[]
  ) => (...args: string[]) => number;
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
}

interface SimulationResult {
  success: boolean;
  errorCode: number;
  reportContent: string;
  outputData: Uint8Array | null;
  message: string;
}

let moduleInstance: SwmmModule | null = null;
let moduleLoading: Promise<SwmmModule> | null = null;

async function loadSwmmModule(): Promise<SwmmModule> {
  if (moduleInstance) {
    return moduleInstance;
  }

  if (moduleLoading) {
    return moduleLoading;
  }

  moduleLoading = new Promise<SwmmModule>((resolve, reject) => {
    const win = window as unknown as { Module?: Partial<SwmmModule> };
    
    win.Module = {
      onRuntimeInitialized: () => {
        moduleInstance = win.Module as SwmmModule;
        resolve(moduleInstance);
      }
    };

    const script = document.createElement("script");
    script.src = "/swmm/js.js";
    script.async = true;

    let timeout: ReturnType<typeof setTimeout>;

    script.onerror = () => {
      clearTimeout(timeout);
      moduleLoading = null;
      delete win.Module;
      reject(new Error("Failed to load SWMM WebAssembly module"));
    };

    timeout = setTimeout(() => {
      if (!moduleInstance) {
        moduleLoading = null;
        reject(new Error("SWMM WebAssembly module load timeout"));
      }
    }, 30000);

    const originalCallback = win.Module.onRuntimeInitialized;
    win.Module.onRuntimeInitialized = () => {
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

    const baseName = filename.replace(/\.inp$/i, "");
    const inputPath = `/input_${Date.now()}.inp`;
    const reportPath = `/report_${Date.now()}.rpt`;
    const outputPath = `/output_${Date.now()}.out`;

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

    const swmm_run = Module.cwrap("swmm_run", "number", [
      "string",
      "string",
      "string",
    ]);

    let errorCode: number;
    try {
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
  return moduleInstance !== null;
}

export async function preloadSwmmEngine(): Promise<boolean> {
  try {
    await loadSwmmModule();
    return true;
  } catch {
    return false;
  }
}
