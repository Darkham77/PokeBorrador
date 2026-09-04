import { describe, it, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadCheckpointDocument,
  recordMasterSuiteFailure,
  recordSuiteFailure,
  getSuiteCheckpoint,
  getMasterCheckpoint,
  clearSuiteCheckpoint,
  clearAllCheckpoints,
  isCleanRequested,
} from '../../../scripts/e2e/helpers/e2eCheckpointManager.ts';

const CHECKPOINT_FILE_PATH = path.resolve(process.cwd(), 'scratch/e2e_checkpoints.json');

describe('E2E Checkpoint Manager Unit Tests', () => {
  let backupContent: string | null = null;

  beforeEach(() => {
    if (fs.existsSync(CHECKPOINT_FILE_PATH)) {
      backupContent = fs.readFileSync(CHECKPOINT_FILE_PATH, 'utf8');
      fs.unlinkSync(CHECKPOINT_FILE_PATH);
    } else {
      backupContent = null;
    }
  });

  afterEach(() => {
    if (backupContent !== null) {
      fs.writeFileSync(CHECKPOINT_FILE_PATH, backupContent, 'utf8');
    } else if (fs.existsSync(CHECKPOINT_FILE_PATH)) {
      fs.unlinkSync(CHECKPOINT_FILE_PATH);
    }
  });

  it('returns default empty document when no checkpoint file exists', () => {
    const doc = loadCheckpointDocument();
    assert.strictEqual(doc.master, null);
    assert.deepStrictEqual(doc.suites, {});
  });

  it('records and retrieves master suite failure and in-suite checkpoint', () => {
    recordMasterSuiteFailure({
      suiteIndex: 37,
      suiteName: 'battle_fsm_sync.simulation.ts',
      suiteRelativePath: 'scripts/e2e/battle/battle_fsm_sync.simulation.ts',
      driver: 'sqlite',
      failedBatchIndex: 47,
      failedCaseId: 'case-2aa5ab635183',
      errorSnippet: 'Timeout waiting for battle-ready-for-input',
    });

    const master = getMasterCheckpoint();
    assert.ok(master !== null);
    assert.strictEqual(master.suiteIndex, 37);
    assert.strictEqual(master.suiteName, 'battle_fsm_sync.simulation.ts');
    assert.strictEqual(master.driver, 'sqlite');

    const suiteCp = getSuiteCheckpoint('battle_fsm_sync.simulation.ts');
    assert.ok(suiteCp !== null);
    assert.strictEqual(suiteCp.failedBatchIndex, 47);
    assert.strictEqual(suiteCp.failedCaseId, 'case-2aa5ab635183');
  });

  it('clears individual suite checkpoint and updates master', () => {
    recordSuiteFailure('battle_flee_and_teleport.simulation.ts', {
      suiteRelativePath: 'scripts/e2e/battle/battle_flee_and_teleport.simulation.ts',
      driver: 'postgres',
    });

    assert.ok(getSuiteCheckpoint('battle_flee_and_teleport.simulation.ts') !== null);

    clearSuiteCheckpoint('battle_flee_and_teleport.simulation.ts');
    assert.strictEqual(getSuiteCheckpoint('battle_flee_and_teleport.simulation.ts'), null);
  });

  it('detects clean/reset command line arguments', () => {
    assert.strictEqual(isCleanRequested(['node', 'script.ts', 'clean=true']), true);
    assert.strictEqual(isCleanRequested(['node', 'script.ts', 'clean']), true);
    assert.strictEqual(isCleanRequested(['node', 'script.ts', 'reset=true']), true);
    assert.strictEqual(isCleanRequested(['node', 'script.ts', 'reset']), true);
    assert.strictEqual(isCleanRequested(['node', 'script.ts', 'filter=gyms']), false);
  });

  it('clears all checkpoints completely', () => {
    recordMasterSuiteFailure({
      suiteIndex: 5,
      suiteName: 'test.simulation.ts',
      suiteRelativePath: 'scripts/e2e/test.simulation.ts',
      driver: 'sqlite',
    });

    assert.ok(fs.existsSync(CHECKPOINT_FILE_PATH));
    clearAllCheckpoints();
    assert.strictEqual(fs.existsSync(CHECKPOINT_FILE_PATH), false);
  });
});
