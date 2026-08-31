import { BaseRunnerLogger, type LoggerOptions } from './base_runner_logger.ts';

export class FuzzerRunnerLogger extends BaseRunnerLogger {
  constructor(options?: Partial<LoggerOptions>) {
    super({ logName: options?.logName || 'fuzzer', reportDir: options?.reportDir });
  }

  protected isProgressLog(message: string): boolean {
    const progressPatterns = [ // no-domain
      '🚀 [FUZZER]',
      '✨ [FUZZER]',
      '[WORKER-',
      'Completado Lote',
      'Suite completa',
      'Iniciando Suite',
      '===',
      '━━━',
      '[PROGRESS]'
    ];
    return progressPatterns.some((pattern) => message.includes(pattern));
  }
}
