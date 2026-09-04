import { BaseRunnerLogger, type LoggerOptions } from './base_runner_logger.ts';

export class SimulationRunnerLogger extends BaseRunnerLogger {
  constructor(options?: Partial<LoggerOptions>) {
    super({ logName: options?.logName || 'simulation', reportDir: options?.reportDir });
  }

  protected isProgressLog(message: string): boolean {
    const progressPatterns = [ // no-domain: Non-domain utility collection or data structure
      '🚀',
      '▶️',
      '✅',
      '❌',
      '🎉',
      '✨',
      '⚔️',
      '⚠️',
      '⏭️',
      '[WORKER',
      'Completado:',
      'FALLÓ:',
      '[SIM:',
      '[REPLAY:',
      'RUNNING',
      '[E2E-PROGRESS]',
      '[E2E-TEST]',
      '[PROGRESS]'
    ];
    return progressPatterns.some((pattern) => message.includes(pattern));
  }
}
