declare global {
  interface Window {
    Module: {
      onRuntimeInitialized?: () => void;
      calledRun?: boolean;
    };
    FS: {
      writeFile: (path: string, data: string | Uint8Array) => void;
      readFile: (path: string, opts?: { encoding?: string }) => string | Uint8Array;
      unlink: (path: string) => void;
      createPath: (parent: string, path: string, canRead: boolean, canWrite: boolean) => void;
      createDataFile: (parent: string, name: string, data: string | Uint8Array, canRead: boolean, canWrite: boolean) => void;
      findObject: (path: string) => unknown;
      ignorePermissions: boolean;
    };
    swmm_run: (inpFile: string, rptFile: string, outFile: string) => number;
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

async function loadSwmmModule(): Promise<void> {
  if (moduleLoaded) {
    return;
  }

  if (moduleLoading) {
    return moduleLoading;
  }

  moduleLoading = new Promise<void>((resolve, reject) => {
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
      delete (window as { Module?: unknown }).Module;
      reject(new Error("Failed to load SWMM WebAssembly module"));
    };

    timeout = setTimeout(() => {
      if (!moduleLoaded) {
        moduleLoading = null;
        reject(new Error("SWMM WebAssembly module load timeout"));
      }
    }, 30000);

    const originalCallback = window.Module.onRuntimeInitialized;
    window.Module.onRuntimeInitialized = () => {
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
    await loadSwmmModule();

    const timestamp = Date.now();
    const inputPath = `/input_${timestamp}.inp`;
    const reportPath = `/report_${timestamp}.rpt`;
    const outputPath = `/output_${timestamp}.out`;

    try {
      window.FS.ignorePermissions = true;
      const existingFile = window.FS.findObject(inputPath.slice(1));
      if (existingFile) {
        window.FS.unlink(inputPath);
      }
      window.FS.createDataFile("/", inputPath.slice(1), inpContent, true, true);
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
      errorCode = window.swmm_run(inputPath, reportPath, outputPath);
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
      reportContent = window.FS.readFile(reportPath, {
        encoding: "utf8",
      }) as string;
    } catch {
      reportContent = "Report file not generated";
    }

    let outputData: Uint8Array | null = null;
    try {
      outputData = window.FS.readFile(outputPath) as Uint8Array;
    } catch {
      outputData = null;
    }

    try {
      window.FS.unlink(inputPath);
    } catch {}
    try {
      window.FS.unlink(reportPath);
    } catch {}
    try {
      window.FS.unlink(outputPath);
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
