interface SWMMModule {
  ccall: (name: string, returnType: string, argTypes: string[], args: unknown[]) => unknown;
  cwrap: (name: string, returnType: string, argTypes: string[]) => (...args: unknown[]) => unknown;
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts?: { encoding?: string }) => Uint8Array | string;
    unlink: (path: string) => void;
    mkdir: (path: string) => void;
  };
  allocateUTF8: (str: string) => number;
  UTF8ToString: (ptr: number) => string;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
}

export interface SimulationProgress {
  elapsedTime: number;
  progress: number;
  currentDate: string;
}

export interface SimulationResult {
  success: boolean;
  errorCode: number;
  errorMessage: string;
  reportContent: string;
  outputContent: Uint8Array | null;
}

export type ProgressCallback = (progress: SimulationProgress) => void;

declare global {
  interface Window {
    Module: Partial<SWMMModule> & { onRuntimeInitialized?: () => void };
  }
}

class SWMMEngine {
  private module: SWMMModule | null = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private scriptLoaded = false;

  async init(): Promise<void> {
    if (this.module) return;
    if (this.loadPromise) return this.loadPromise;
    
    this.isLoading = true;
    this.loadPromise = this.loadModule();
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
    }
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded && window.Module) {
        resolve();
        return;
      }
      
      const existingScript = document.querySelector('script[src="/swmm/js.js"]');
      if (existingScript && window.Module && window.Module.ccall) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      window.Module = {
        onRuntimeInitialized: () => {
          this.scriptLoaded = true;
          resolve();
        }
      } as SWMMModule;
      
      const script = document.createElement('script');
      script.src = '/swmm/js.js';
      script.onerror = () => reject(new Error('Failed to load SWMM script'));
      document.head.appendChild(script);

      setTimeout(() => {
        if (!this.scriptLoaded) {
          if (window.Module && window.Module.ccall) {
            this.scriptLoaded = true;
            resolve();
          } else {
            reject(new Error('SWMM module load timeout'));
          }
        }
      }, 30000);
    });
  }

  private async loadModule(): Promise<void> {
    await this.loadScript();
    
    const m = window.Module;
    if (!m || !m.ccall || !m.FS || !m.allocateUTF8 || !m._free) {
      throw new Error('SWMM module not available');
    }
    
    this.module = m as SWMMModule;
    
    try {
      this.module.FS.mkdir('/work');
    } catch {
      // Directory may already exist
    }
  }

  isReady(): boolean {
    return this.module !== null;
  }

  async run(
    inputContent: string,
    onProgress?: ProgressCallback
  ): Promise<SimulationResult> {
    await this.init();
    
    if (!this.module) {
      throw new Error('SWMM module not initialized');
    }

    const inputPath = '/work/input.inp';
    const reportPath = '/work/report.rpt';
    const outputPath = '/work/output.out';

    try {
      this.module.FS.writeFile(inputPath, inputContent);
    } catch {
      try {
        this.module.FS.mkdir('/work');
      } catch {}
      this.module.FS.writeFile(inputPath, inputContent);
    }

    const inputPtr = this.module.allocateUTF8(inputPath);
    const reportPtr = this.module.allocateUTF8(reportPath);
    const outputPtr = this.module.allocateUTF8(outputPath);

    let errorCode = 0;
    let reportContent = '';
    let outputContent: Uint8Array | null = null;

    try {
      errorCode = this.module.ccall('swmm_run', 'number', ['number', 'number', 'number'], [inputPtr, reportPtr, outputPtr]) as number;

      if (onProgress) {
        onProgress({
          elapsedTime: 100,
          progress: 1.0,
          currentDate: new Date().toISOString()
        });
      }

      try {
        reportContent = this.module.FS.readFile(reportPath, { encoding: 'utf8' }) as string;
      } catch {
        reportContent = '';
      }

      try {
        outputContent = this.module.FS.readFile(outputPath) as Uint8Array;
      } catch {
        outputContent = null;
      }

      try {
        this.module.FS.unlink(inputPath);
        this.module.FS.unlink(reportPath);
        this.module.FS.unlink(outputPath);
      } catch {}

      return {
        success: errorCode === 0,
        errorCode,
        errorMessage: this.getErrorMessage(errorCode),
        reportContent,
        outputContent
      };
    } finally {
      this.module._free(inputPtr);
      this.module._free(reportPtr);
      this.module._free(outputPtr);
    }
  }

  private getErrorMessage(code: number): string {
    const errors: Record<number, string> = {
      0: 'No error',
      1: 'System error - memory allocation failure',
      2: 'Input file error - check your .inp file syntax',
      3: 'Runoff simulation error',
      4: 'Routing simulation error',
      5: 'Output file error',
      101: 'Memory allocation error',
      103: 'No input data',
      111: 'Cannot open input file',
      113: 'Cannot open report file',
      117: 'Cannot open output file',
      191: 'Invalid date/time value',
      193: 'Option keyword undefined',
      195: 'Invalid option value',
      200: 'Too many items defined',
      201: 'Undefined node',
      203: 'Undefined link',
      205: 'Undefined time series',
      207: 'Undefined curve',
      301: 'Subcatchment outlet is another subcatchment',
      303: 'Node outlet is the same as its inlet',
      305: 'Divider outlet link must be part of connected network'
    };
    return errors[code] || `Unknown error (code: ${code})`;
  }
}

export const swmmEngine = new SWMMEngine();

export async function runSwmmSimulation(
  inpContent: string,
  filename: string
): Promise<{
  success: boolean;
  errorCode: number;
  reportContent: string;
  outputData: Uint8Array | null;
  message: string;
}> {
  try {
    const result = await swmmEngine.run(inpContent);
    return {
      success: result.success,
      errorCode: result.errorCode,
      reportContent: result.reportContent,
      outputData: result.outputContent,
      message: result.success 
        ? `Simulation completed successfully for ${filename}` 
        : result.errorMessage
    };
  } catch (err) {
    return {
      success: false,
      errorCode: -1,
      reportContent: '',
      outputData: null,
      message: `Failed to run simulation: ${err}`
    };
  }
}

export function isSwmmEngineAvailable(): boolean {
  return swmmEngine.isReady();
}

export async function preloadSwmmEngine(): Promise<boolean> {
  try {
    await swmmEngine.init();
    return true;
  } catch {
    return false;
  }
}
