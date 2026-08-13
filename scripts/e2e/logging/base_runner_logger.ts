// fallow-ignore-file security-sink
import fs from 'node:fs';
import path from 'node:path';

export interface LoggerOptions {
  readonly logName: string;
  readonly reportDir?: string;
}

export abstract class BaseRunnerLogger {
  protected readonly logName: string;
  protected readonly reportDir: string;
  protected readonly debugFilePath: string;
  protected memoryBuffer: string[] = [];
  protected originalConsoleDebug: typeof console.debug;
  protected originalConsoleLog: typeof console.log;
  protected originalConsoleWarn: typeof console.warn;
  protected originalConsoleError: typeof console.error;
  protected isIntercepting = false;

  constructor(options: LoggerOptions) {
    this.logName = options.logName;
    this.reportDir = options.reportDir || path.resolve(process.cwd(), 'scripts/e2e/results/reports');
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    this.debugFilePath = path.join(this.reportDir, `${this.logName}_debug.log`);
    if (!fs.existsSync(this.debugFilePath)) {
      fs.writeFileSync(this.debugFilePath, '', { encoding: 'utf-8' });
    }

    this.originalConsoleDebug = console.debug;
    this.originalConsoleLog = console.log;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleError = console.error;
  }

  public getDebugFilePath(): string {
    return this.debugFilePath;
  }

  /** Escribe logs de progreso de alto nivel en consola y almacena en el buffer en memoria */
  public progress(message: string): void {
    const formatted = `[${new Date().toISOString()}] [PROGRESS] ${message}`;
    this.originalConsoleLog.call(console, message);
    this.writeToFile(formatted);
  }

  /** Formatea y emite un mensaje de progreso con porcentaje calculado (ej. [ 25%] (1/4) ...) */
  public progressPercent(current: number, total: number, message: string): void {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const paddedPercent = `${percent}`.padStart(3, ' ');
    const formattedMsg = `[${paddedPercent}%] (${current}/${total}) ${message}`;
    this.progress(formattedMsg);
  }

  /** Escribe logs ruidosos de depuración exclusivamente en el buffer en memoria */
  public debug(message: string): void {
    const formatted = `[${new Date().toISOString()}] [DEBUG] ${message}`;
    this.writeToFile(formatted);
  }

  /** Escribe advertencias en consola y almacena en buffer en memoria */
  public warn(message: string): void {
    const formatted = `[${new Date().toISOString()}] [WARN] ${message}`;
    this.originalConsoleWarn.call(console, message);
    this.writeToFile(formatted);
  }

  /** Escribe errores en consola y almacena en buffer en memoria */
  public error(message: string): void {
    const formatted = `[${new Date().toISOString()}] [ERROR] ${message}`;
    this.originalConsoleError.call(console, message);
    this.writeToFile(formatted);
  }

  protected writeToFile(line: string): void {
    this.memoryBuffer.push(line);
  }

  /**
   * Vuelca en disco de forma atómica todo el bloque de logs acumulado en memoria
   * garantizando que las líneas de un hilo o lote no se mezclen con otros hilos.
   */
  public flushBlock(blockHeader?: string): void {
    if (this.memoryBuffer.length === 0) return;

    const blockLines: string[] = [];
    if (blockHeader) {
      blockLines.push(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      blockLines.push(`[${new Date().toISOString()}] LOG BLOCK: ${blockHeader}`);
      blockLines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
    for (const line of this.memoryBuffer) {
      blockLines.push(line);
    }
    blockLines.push(`--------------------------------------------------------------------------------\n`);

    const blockContent = blockLines.join('\n') + '\n';
    
    // Escritura síncrona atómica en el archivo de reporte maestro
    fs.appendFileSync(this.debugFilePath, blockContent, { encoding: 'utf-8' });
    this.memoryBuffer = [];
  }

  /** Método abstracto que determina si una línea de log califica como progreso */
  protected abstract isProgressLog(message: string): boolean;

  /** Intercepta llamadas globales a console */
  public startIntercepting(): void {
    if (this.isIntercepting) return;
    this.isIntercepting = true;

    console.debug = (...args: unknown[]) => {
      const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      this.debug(line);
    };

    console.log = (...args: unknown[]) => {
      const line = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (this.isProgressLog(line)) {
        this.originalConsoleLog.apply(console, args);
      } else {
        this.debug(line);
      }
    };
  }

  /** Restaura la consola original y realiza el flush del bloque de memoria a disco */
  public close(blockHeader?: string): void {
    if (this.isIntercepting) {
      console.debug = this.originalConsoleDebug;
      console.log = this.originalConsoleLog;
      console.warn = this.originalConsoleWarn;
      console.error = this.originalConsoleError;
      this.isIntercepting = false;
    }
    this.flushBlock(blockHeader);
  }

  public stopIntercepting(blockHeader?: string): void {
    this.close(blockHeader);
  }
}
