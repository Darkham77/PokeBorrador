import { readFileSync, existsSync } from 'node:fs';

/**
 * Script Parser de Logs de Desincronización de Replay / Fuzzer / E2E
 * Identifica el turno exacto, comando y discrepancia de estado
 * entre la simulación de Showdown y la UI / FSM del cliente.
 */
export interface DesyncAnalysis {
  failedTurn: number | null;
  seatId: string | null;
  mismatchReason: string;
  divergingLogLine: string;
}

export function parseReplayLogDesync(logFilePath: string): DesyncAnalysis {
  if (!existsSync(logFilePath)) {
    return {
      failedTurn: null,
      seatId: null,
      mismatchReason: 'Log file not found',
      divergingLogLine: '',
    };
  }

  const logContent = readFileSync(logFilePath, 'utf-8');
  const lines = logContent.split('\n');

  let currentTurn: number | null = null;
  let seatId: string | null = null;

  for (const line of lines) {
    const turnMatch = line.match(/\|turn\|(\d+)/);
    if (turnMatch && turnMatch[1]) {
      currentTurn = parseInt(turnMatch[1], 10);
    }
    const seatMatch = line.match(/(p[1-4])/);
    if (seatMatch && seatMatch[1]) {
      seatId = seatMatch[1];
    }
    if (line.includes('DESYNC') || line.includes('INVALID_CHOICE') || line.includes('FSM_DESYNC')) {
      return {
        failedTurn: currentTurn,
        seatId,
        mismatchReason: line.trim(),
        divergingLogLine: line,
      };
    }
  }

  return {
    failedTurn: currentTurn,
    seatId,
    mismatchReason: 'No explicit desync token found in log',
    divergingLogLine: '',
  };
}
