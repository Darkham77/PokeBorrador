import fs from 'node:fs';
import path from 'node:path';

export type SimDriver = 'sqlite' | 'postgres';

export interface E2ESuiteFailureCheckpoint {
  suiteName: string;
  suiteRelativePath: string;
  driver: SimDriver;
  failedTestTitle?: string;
  failedBatchIndex?: number;
  failedCaseId?: string;
  timestamp: string;
  errorSnippet?: string;
}

export interface E2EMasterCheckpoint {
  suiteIndex: number;
  suiteName: string;
  suiteRelativePath: string;
  driver: SimDriver;
  timestamp: string;
}

export interface E2ECheckpointDocument {
  master?: E2EMasterCheckpoint | null;
  passedSuites?: string[];
  suites: Record<string, E2ESuiteFailureCheckpoint>;
}

const CHECKPOINT_FILE_PATH = path.resolve(process.cwd(), 'scratch/e2e_checkpoints.json');

export function loadCheckpointDocument(): E2ECheckpointDocument {
  try {
    if (fs.existsSync(CHECKPOINT_FILE_PATH)) {
      const raw = fs.readFileSync(CHECKPOINT_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as E2ECheckpointDocument;
      return {
        master: parsed.master ?? null,
        passedSuites: Array.isArray(parsed.passedSuites) ? parsed.passedSuites : [],
        suites: parsed.suites && typeof parsed.suites === 'object' ? parsed.suites : {},
      };
    }
  } catch {
    // Ignore corrupt checkpoint and return empty default
  }
  return {
    master: null,
    passedSuites: [],
    suites: {},
  };
}

export function saveCheckpointDocument(doc: E2ECheckpointDocument): void {
  try {
    const dir = path.dirname(CHECKPOINT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE_PATH, JSON.stringify(doc, null, 2), 'utf8');
  } catch {
    // Non-fatal if checkpoint write fails
  }
}

export function recordMasterSuiteFailure(params: {
  suiteIndex: number;
  suiteName: string;
  suiteRelativePath: string;
  driver: SimDriver;
  failedTestTitle?: string;
  failedBatchIndex?: number;
  failedCaseId?: string;
  errorSnippet?: string;
}): void {
  const doc = loadCheckpointDocument();
  const timestamp = new Date().toISOString();

  doc.master = {
    suiteIndex: params.suiteIndex,
    suiteName: params.suiteName,
    suiteRelativePath: params.suiteRelativePath,
    driver: params.driver,
    timestamp,
  };

  const suiteKey = params.suiteName.toLowerCase();
  const existingSuite = doc.suites[suiteKey];
  doc.suites[suiteKey] = {
    suiteName: params.suiteName,
    suiteRelativePath: params.suiteRelativePath,
    driver: params.driver,
    failedTestTitle: params.failedTestTitle ?? existingSuite?.failedTestTitle,
    failedBatchIndex: params.failedBatchIndex ?? existingSuite?.failedBatchIndex,
    failedCaseId: params.failedCaseId ?? existingSuite?.failedCaseId,
    errorSnippet: params.errorSnippet ?? existingSuite?.errorSnippet,
    timestamp,
  };

  saveCheckpointDocument(doc);
}

export function recordMasterSuiteProgress(params: {
  suiteIndex: number;
  suiteName: string;
  suiteRelativePath: string;
  driver: SimDriver;
  completedSuiteName?: string;
}): void {
  const doc = loadCheckpointDocument();
  doc.master = {
    suiteIndex: params.suiteIndex,
    suiteName: params.suiteName,
    suiteRelativePath: params.suiteRelativePath,
    driver: params.driver,
    timestamp: new Date().toISOString(),
  };
  if (params.completedSuiteName) {
    if (!doc.passedSuites) {
      doc.passedSuites = [];
    }
    if (!doc.passedSuites.includes(params.completedSuiteName)) {
      doc.passedSuites.push(params.completedSuiteName);
    }
  }
  saveCheckpointDocument(doc);
}

export function recordSuiteFailure(
  suiteName: string,
  params: {
    suiteRelativePath: string;
    driver: SimDriver;
    failedTestTitle?: string;
    failedBatchIndex?: number;
    failedCaseId?: string;
    errorSnippet?: string;
  }
): void {
  // Never record or overwrite checkpoints with interruption artifacts from worker cancellation
  if (
    params.errorSnippet?.includes('Test ended') ||
    params.errorSnippet?.includes('Target page, context or browser has been closed')
  ) {
    return;
  }

  const doc = loadCheckpointDocument();
  const suiteKey = suiteName.toLowerCase();
  const existing = doc.suites[suiteKey];

  // If a failure was already recorded for this suite, do not overwrite with a higher batch index
  if (
    existing?.failedBatchIndex != null &&
    params.failedBatchIndex != null &&
    params.failedBatchIndex > existing.failedBatchIndex
  ) {
    return;
  }

  doc.suites[suiteKey] = {
    suiteName,
    suiteRelativePath: params.suiteRelativePath,
    driver: params.driver,
    failedTestTitle: params.failedTestTitle,
    failedBatchIndex: params.failedBatchIndex,
    failedCaseId: params.failedCaseId,
    errorSnippet: params.errorSnippet,
    timestamp: new Date().toISOString(),
  };
  saveCheckpointDocument(doc);
}

export function getSuiteCheckpoint(suiteName: string): E2ESuiteFailureCheckpoint | null {
  const doc = loadCheckpointDocument();
  const suiteKey = suiteName.toLowerCase();
  return doc.suites[suiteKey] || null;
}

export function getMasterCheckpoint(): E2EMasterCheckpoint | null {
  const doc = loadCheckpointDocument();
  return doc.master || null;
}

export function clearSuiteCheckpoint(suiteName: string): void {
  const doc = loadCheckpointDocument();
  const suiteKey = suiteName.toLowerCase();
  if (doc.suites[suiteKey]) {
    delete doc.suites[suiteKey];
  }
  saveCheckpointDocument(doc);

  if (suiteKey.includes('fsm')) {
    const progressDir = path.resolve(process.cwd(), 'scratch/e2e_progress');
    if (fs.existsSync(progressDir)) {
      try {
        fs.rmSync(progressDir, { recursive: true, force: true });
      } catch {
        // Ignore error
      }
    }
  }
}

export function clearAllCheckpoints(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE_PATH)) {
      fs.unlinkSync(CHECKPOINT_FILE_PATH);
    }
    const progressDir = path.resolve(process.cwd(), 'scratch/e2e_progress');
    if (fs.existsSync(progressDir)) {
      fs.rmSync(progressDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore error
  }
}

export function isCleanRequested(args: string[] = process.argv): boolean {
  if (process.env.SIM_CLEAN === 'true' || process.env.npm_config_clean === 'true') {
    return true;
  }
  return args.some((arg) => {
    const lower = arg.toLowerCase().trim();
    return (
      lower === 'clean' ||
      lower === 'clean=true' ||
      lower === 'reset' ||
      lower === 'reset=true' ||
      lower === '--clean' ||
      lower === '--reset'
    );
  });
}
