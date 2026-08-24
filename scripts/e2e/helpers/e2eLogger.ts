// fallow-ignore-file security-sink
import { type Page, type Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizePath } from '../../lib/safePath.ts';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  MS_TO_SECONDS_DIVISOR,
} from '../simulation_config.ts';

export interface E2EPage extends Page {
  _e2eLogBuffer?: string[];
}

export function flushE2ELogs(
  logBuffer: string[],
  testName: string,
  status: 'passed' | 'failed' | 'skipped' = 'passed',
  durationMs?: number
): void {
  const workerId = process.env.TEST_WORKER_INDEX || '0';
  const logDir = path.resolve('scripts/e2e/results/logs');
  
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, sanitizePath(`worker_${workerId}.log`));
    const timeStr = new Date().toISOString();
    const header = `\n--- [${timeStr}] TEST: ${testName} [STATUS: ${status.toUpperCase()}] (${durationMs ? (durationMs / MS_TO_SECONDS_DIVISOR).toFixed(1) + 's' : '0s'}) ---\n`;
    fs.appendFileSync(logFilePath, header + logBuffer.join('\n') + '\n');
  } catch (err: unknown) {
    console.debug('[E2E-LOGGER-WARN] Failed to write log file:', err instanceof Error ? err.message : String(err));
  }

  const durationStr = durationMs ? ` (${(durationMs / MS_TO_SECONDS_DIVISOR).toFixed(1)}s)` : '';

  if (status === 'passed') {
    console.log(`[E2E-PROGRESS] ✅ ${testName}${durationStr}`);
  } else if (status === 'failed') {
    console.error(`\n==================================================`);
    console.error(`❌ [E2E-FAILURE-TRACE] ${testName}${durationStr}`);
    console.error(`==================================================`);
    if (logBuffer.length > 0) {
      console.error(logBuffer.join('\n'));
    } else {
      console.error(`(No buffered browser logs captured)`);
    }
    console.error(`==================================================\n`);
  }
}

export function logE2EDebug(page: Page | undefined, msg: string): void {
  const e2ePage = page as E2EPage | undefined;
  if (e2ePage?._e2eLogBuffer) {
    e2ePage._e2eLogBuffer.push(`[E2E-TRACE] ${msg}`);
  }
}

export async function clickResilient(locator: Locator, options: { timeout?: number } = {}): Promise<void> {
  const timeout = options.timeout ?? MAX_PER_ACTION_TIMEOUT_MS;
  const fastTimeout = Math.min(timeout, 500);
  try {
    await locator.click({ timeout: fastTimeout });
  } catch (_err) {
    try {
      await locator.click({ force: true, timeout: fastTimeout });
    } catch {
      await locator.evaluate((el: HTMLElement) => el.click());
    }
  }
}
