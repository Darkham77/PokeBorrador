import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { runBatteryOfDiagnostics, testInMemoryMigrations } from '../../../scripts/maintenance/diagnose_account.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describe('Diagnose Account Tool', () => {
  it('should diagnose kenviota account from recent backup and verify migration fix', () => {
    const backupRelPath = 'database/backups/server_franco/server_franco_backup_2026-08-30T06-51-08-280250977Z.json';
    const backupPath = path.resolve(backupRelPath);
    assert.ok(fs.existsSync(backupPath), `Backup file must exist at ${backupRelPath}`);

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    const profiles = backupData.data.profiles || [];
    const gameSaves = backupData.data.game_saves || [];

    const kenProfile = profiles.find((p: { email?: string }) => p.email === 'kenviota@gmail.com');
    assert.ok(kenProfile, 'Must find kenviota profile');

    const kenSaveRow = gameSaves.find((s: { user_id?: string }) => s.user_id === kenProfile.id);
    assert.ok(kenSaveRow, 'Must find kenviota save row');

    const rawSave: GameState = typeof kenSaveRow.save_data === 'string' ? JSON.parse(kenSaveRow.save_data) : kenSaveRow.save_data;

    // 1. Initial diagnostics must detect exactly the expNeeded errors on Lv 100 pokemon
    const initialFindings = runBatteryOfDiagnostics(rawSave);
    const errors = initialFindings.filter(f => f.severity === 'error');
    assert.strictEqual(errors.length, 6, 'Must find 6 critical errors (3 Valibot + 3 Pokemon expNeeded)');

    // 2. In-memory migration simulation must completely fix all errors
    const migSim = testInMemoryMigrations(rawSave, kenProfile.id);
    assert.strictEqual(migSim.success, true, 'Migration simulation must successfully resolve all critical errors');
    assert.strictEqual(migSim.fixedCount, 6, 'Must fix all 6 errors');
    assert.strictEqual(migSim.remainingFindings.filter(f => f.severity === 'error').length, 0, 'Must have 0 remaining critical errors');
  });

  it('should diagnose oucae account and verify egg IDs and negative inventory fix', () => {
    const backupRelPath = 'database/backups/server_franco/server_franco_backup_2026-08-30T06-51-08-280250977Z.json';
    const backupPath = path.resolve(backupRelPath);
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    const profiles = backupData.data.profiles || [];
    const gameSaves = backupData.data.game_saves || [];

    const oucaeProfile = profiles.find((p: { username?: string }) => p.username === 'oucae');
    assert.ok(oucaeProfile, 'Must find oucae profile');

    const oucaeSaveRow = gameSaves.find((s: { user_id?: string }) => s.user_id === oucaeProfile.id);
    assert.ok(oucaeSaveRow, 'Must find oucae save row');

    const rawSave: GameState = typeof oucaeSaveRow.save_data === 'string' ? JSON.parse(oucaeSaveRow.save_data) : oucaeSaveRow.save_data;

    // 1. Initial diagnostics must detect egg id and negative inventory errors
    const initialFindings = runBatteryOfDiagnostics(rawSave);
    const errors = initialFindings.filter(f => f.severity === 'error');
    assert.strictEqual(errors.length, 5, 'Must find 5 critical errors in oucae save');

    // 2. In-memory migration simulation must completely fix all errors
    const migSim = testInMemoryMigrations(rawSave, oucaeProfile.id);
    assert.strictEqual(migSim.success, true, 'Migration simulation must successfully resolve all critical errors for oucae');
    assert.strictEqual(migSim.remainingFindings.filter(f => f.severity === 'error').length, 0, 'Must have 0 remaining critical errors');
  });
});

