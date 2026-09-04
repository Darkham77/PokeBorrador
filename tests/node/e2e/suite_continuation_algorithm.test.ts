import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { FullConfig, Suite, TestCase, TestResult, FullResult } from "@playwright/test/reporter";
import PlaywrightFuzzerReporter from "../../../scripts/e2e/logging/playwright_fuzzer_reporter.ts";
import {
  loadCheckpointDocument,
  recordMasterSuiteFailure,
  recordSuiteFailure,
  getSuiteCheckpoint,
  getMasterCheckpoint,
  clearAllCheckpoints,
  isCleanRequested,
} from "../../../scripts/e2e/helpers/e2eCheckpointManager.ts";

const CHECKPOINT_FILE_PATH = path.resolve(process.cwd(), "scratch/e2e_checkpoints.json");

describe("Suite Continuation Algorithm & Clean Zero Pass Unit Tests", () => {
  let backupContent: string | null = null;

  beforeEach(() => {
    if (fs.existsSync(CHECKPOINT_FILE_PATH)) {
      backupContent = fs.readFileSync(CHECKPOINT_FILE_PATH, "utf8");
      fs.unlinkSync(CHECKPOINT_FILE_PATH);
    } else {
      backupContent = null;
    }
  });

  afterEach(() => {
    if (backupContent !== null) {
      fs.writeFileSync(CHECKPOINT_FILE_PATH, backupContent, "utf8");
    } else if (fs.existsSync(CHECKPOINT_FILE_PATH)) {
      fs.unlinkSync(CHECKPOINT_FILE_PATH);
    }
  });

  it("PlaywrightFuzzerReporter automatically records checkpoint on test failure", () => {
    const reporter = new PlaywrightFuzzerReporter();
    const mockFile = path.resolve(process.cwd(), "scripts/e2e/gyms/gym_progression.simulation.ts");

    const mockTest: Partial<TestCase> = {
      title: "debería ejecutar el lote de fuzzer #42 (1 Pokémon) de forma determinista",
      location: { file: mockFile, line: 10, column: 5 },
    };

    const mockResult: Partial<TestResult> = {
      status: "failed",
      duration: 1500,
      workerIndex: 1,
      error: { message: "TimeoutError: Action exceeded 5000ms" },
    };

    process.env.SIM_DB_DRIVER = "sqlite";
    reporter.onTestEnd(mockTest as TestCase, mockResult as TestResult);

    const cp = getSuiteCheckpoint("gym_progression.simulation.ts");
    assert.ok(cp !== null, "Checkpoint should be recorded for failing suite");
    assert.strictEqual(cp.suiteName, "gym_progression.simulation.ts");
    assert.strictEqual(cp.driver, "sqlite");
    assert.strictEqual(cp.failedBatchIndex, 42);
    assert.ok(cp.failedTestTitle?.includes("#42"));
    assert.ok(cp.errorSnippet?.includes("TimeoutError"));
  });

  it("PlaywrightFuzzerReporter clears suite checkpoint on successful completion", () => {
    recordSuiteFailure("gym_progression.simulation.ts", {
      suiteRelativePath: "scripts/e2e/gyms/gym_progression.simulation.ts",
      driver: "sqlite",
      failedBatchIndex: 42,
    });
    assert.ok(getSuiteCheckpoint("gym_progression.simulation.ts") !== null);

    const reporter = new PlaywrightFuzzerReporter();
    const mockFile = path.resolve(process.cwd(), "scripts/e2e/gyms/gym_progression.simulation.ts");
    const mockTest: Partial<TestCase> = {
      title: "dummy",
      location: { file: mockFile, line: 1, column: 1 },
    };
    const mockSuite: Partial<Suite> = {
      allTests: () => [mockTest as TestCase],
    };
    const mockConfig: Partial<FullConfig> = { workers: 1 };

    reporter.onBegin(mockConfig as FullConfig, mockSuite as Suite);

    const mockResult: Partial<FullResult> = { status: "passed" };
    reporter.onEnd(mockResult as FullResult);

    const cpAfter = getSuiteCheckpoint("gym_progression.simulation.ts");
    assert.strictEqual(cpAfter, null, "Checkpoint should be cleared when suite passes");
  });

  it("correctly calculates skipSqlite when resuming a suite that failed on PostgreSQL", () => {
    recordMasterSuiteFailure({
      suiteIndex: 5,
      suiteName: "gts_lifecycle.simulation.ts",
      suiteRelativePath: "scripts/e2e/gts/gts_lifecycle.simulation.ts",
      driver: "postgres",
    });

    const masterCp = getMasterCheckpoint();
    assert.ok(masterCp !== null);
    assert.strictEqual(masterCp.driver, "postgres");

    const selectedDriver = "dual";
    const isFirstSuite = true;
    const startingDriverForFirstSuite = masterCp.driver;
    const skipSqlite = isFirstSuite && selectedDriver === "dual" && startingDriverForFirstSuite === "postgres";

    assert.strictEqual(skipSqlite, true, "Should skip SQLite if previously passed and failed in Postgres");
  });

  it("correctly requires wasResumed and Step 6B Clean Zero Pass when resuming from checkpoint", () => {
    recordSuiteFailure("battle_fsm_sync.simulation.ts", {
      suiteRelativePath: "scripts/e2e/battle/battle_fsm_sync.simulation.ts",
      driver: "sqlite",
      failedBatchIndex: 121,
    });

    const targetName = "battle_fsm_sync.simulation.ts";
    const isFirstSuite = true;
    const startingDriverForFirstSuite = null;
    const initialCp = getSuiteCheckpoint(targetName);

    const wasResumed = Boolean(
      (isFirstSuite && startingDriverForFirstSuite !== null) ||
      (initialCp && (initialCp.driver === "postgres" || initialCp.failedBatchIndex || initialCp.failedTestTitle))
    );

    assert.strictEqual(wasResumed, true, "Resumed suite must trigger wasResumed flag");
  });

  it("clean=true overrides checkpoint and starts fresh from zero without wasResumed", () => {
    recordSuiteFailure("battle_fsm_sync.simulation.ts", {
      suiteRelativePath: "scripts/e2e/battle/battle_fsm_sync.simulation.ts",
      driver: "sqlite",
      failedBatchIndex: 121,
    });

    const argvClean = ["node", "scripts/e2e/run_sequential_simulations.ts", "clean=true"];
    assert.strictEqual(isCleanRequested(argvClean), true);

    if (isCleanRequested(argvClean)) {
      clearAllCheckpoints();
    }

    const doc = loadCheckpointDocument();
    assert.strictEqual(doc.master, null);
    assert.deepStrictEqual(doc.suites, {});

    const targetName = "battle_fsm_sync.simulation.ts";
    const isFirstSuite = true;
    const startingDriverForFirstSuite = null;
    const initialCp = getSuiteCheckpoint(targetName);

    const wasResumed = Boolean(
      (isFirstSuite && startingDriverForFirstSuite !== null) ||
      (initialCp && (initialCp.driver === "postgres" || initialCp.failedBatchIndex || initialCp.failedTestTitle))
    );

    assert.strictEqual(wasResumed, false, "Clean run must NOT be flagged as wasResumed");
  });
});
