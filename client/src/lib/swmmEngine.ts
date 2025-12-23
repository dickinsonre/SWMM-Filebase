interface SWMMModulePartial {
  cwrap?: (name: string, returnType: string, argTypes: string[]) => (...args: unknown[]) => unknown;
  FS_createDataFile?: (parent: string, name: string, data: string | ArrayBufferView, canRead: boolean, canWrite: boolean, canOwn?: boolean) => void;
  FS_unlink?: (path: string) => void;
  FS_createPath?: (parent: string, path: string, canRead: boolean, canWrite: boolean) => void;
  FS?: {
    readFile: (path: string, opts?: { encoding?: string }) => Uint8Array | string;
    writeFile: (path: string, data: string | Uint8Array) => void;
    unlink: (path: string) => void;
    mkdir: (path: string) => void;
  };
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
}

export interface SimulationResult {
  success: boolean;
  errorCode: number;
  errorMessage: string;
  reportContent: string;
  outputContent: Uint8Array | null;
}

declare global {
  interface Window {
    Module: SWMMModulePartial;
    FS?: {
      readFile: (path: string, opts?: { encoding?: string }) => Uint8Array | string;
      writeFile: (path: string, data: string | Uint8Array) => void;
      unlink: (path: string) => void;
      mkdir: (path: string) => void;
    };
    swmm_run?: (input: string, report: string, output: string) => number;
  }
}

class SWMMEngine {
  private swmmRunFn: ((input: string, report: string, output: string) => number) | null = null;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;
  private scriptLoaded = false;

  async init(): Promise<void> {
    if (this.swmmRunFn) return;
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
      if (this.scriptLoaded) {
        resolve();
        return;
      }
      
      const existingScript = document.querySelector('script[src="/swmm/js.js"]');
      if (existingScript) {
        const checkReady = setInterval(() => {
          if (this.isModuleReady()) {
            clearInterval(checkReady);
            this.scriptLoaded = true;
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkReady);
          if (!this.scriptLoaded && this.isModuleReady()) {
            this.scriptLoaded = true;
            resolve();
          } else if (!this.scriptLoaded) {
            reject(new Error('SWMM module load timeout'));
          }
        }, 30000);
        return;
      }

      window.Module = {
        onRuntimeInitialized: () => {
          this.scriptLoaded = true;
          resolve();
        }
      };
      
      const script = document.createElement('script');
      script.src = '/swmm/js.js';
      script.onerror = () => reject(new Error('Failed to load SWMM script'));
      document.head.appendChild(script);

      setTimeout(() => {
        if (!this.scriptLoaded) {
          if (this.isModuleReady()) {
            this.scriptLoaded = true;
            resolve();
          } else {
            reject(new Error('SWMM module load timeout'));
          }
        }
      }, 30000);
    });
  }

  private isModuleReady(): boolean {
    const m = window.Module;
    if (!m) return false;
    
    const hasCwrap = typeof m.cwrap === 'function';
    const hasModuleFS = typeof m.FS_createDataFile === 'function' || Boolean(m.FS && typeof m.FS.writeFile === 'function');
    const hasGlobalFS = Boolean(window.FS && typeof window.FS.readFile === 'function');
    
    return hasCwrap && (hasModuleFS || hasGlobalFS);
  }

  private async loadModule(): Promise<void> {
    await this.loadScript();
    
    const m = window.Module;
    if (!m || !m.cwrap) {
      throw new Error('SWMM module cwrap not available');
    }
    
    try {
      this.swmmRunFn = m.cwrap('swmm_run', 'number', ['string', 'string', 'string']) as (input: string, report: string, output: string) => number;
    } catch (e) {
      throw new Error(`Failed to wrap swmm_run: ${e}`);
    }
    
    try {
      if (m.FS_createPath) {
        m.FS_createPath('/', 'work', true, true);
      } else if (m.FS) {
        m.FS.mkdir('/work');
      } else if (window.FS) {
        window.FS.mkdir('/work');
      }
    } catch {
      // Directory may already exist
    }
  }

  isReady(): boolean {
    return this.swmmRunFn !== null;
  }

  async run(inputContent: string): Promise<SimulationResult> {
    await this.init();
    
    if (!this.swmmRunFn) {
      throw new Error('SWMM module not initialized');
    }

    const timestamp = Date.now();
    const inputPath = `/work/input_${timestamp}.inp`;
    const reportPath = `/work/report_${timestamp}.rpt`;
    const outputPath = `/work/output_${timestamp}.out`;

    const m = window.Module;
    
    try {
      const filename = `input_${timestamp}.inp`;
      if (m.FS_createDataFile) {
        try { if (m.FS_unlink) m.FS_unlink(inputPath); } catch {}
        m.FS_createDataFile('/work', filename, inputContent, true, true);
      } else if (m.FS) {
        m.FS.writeFile(inputPath, inputContent);
      } else if (window.FS) {
        window.FS.writeFile(inputPath, inputContent);
      } else {
        throw new Error('No file system available');
      }
    } catch (e) {
      throw new Error(`Failed to write input file: ${e}`);
    }

    let errorCode = 0;
    let reportContent = '';
    let outputContent: Uint8Array | null = null;

    try {
      errorCode = this.swmmRunFn(inputPath, reportPath, outputPath);

      const fs = m.FS || window.FS;
      if (fs) {
        try {
          reportContent = fs.readFile(reportPath, { encoding: 'utf8' }) as string;
        } catch {
          reportContent = '';
        }

        try {
          outputContent = fs.readFile(outputPath) as Uint8Array;
        } catch {
          outputContent = null;
        }

        try { fs.unlink(inputPath); } catch {}
        try { fs.unlink(reportPath); } catch {}
        try { fs.unlink(outputPath); } catch {}
      }

      return {
        success: errorCode === 0,
        errorCode,
        errorMessage: this.getErrorMessage(errorCode),
        reportContent,
        outputContent
      };
    } catch (e) {
      return {
        success: false,
        errorCode: -1,
        errorMessage: `Simulation execution error: ${e}`,
        reportContent: '',
        outputContent: null
      };
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
      117: 'Cannot open output file'
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
