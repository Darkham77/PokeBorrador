/**
 * tests/node/system/reproduce_official_servers_missing_local.test.ts
 *
 * Systematic Debugging Tier 1 Reproduction Test:
 * Verifies that official_servers module and TypeScript type checking succeed
 * cleanly even on clean clones where servers.local.json has not yet been generated.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { OFFICIAL_SERVERS, DEFAULT_SERVER, OFFICIAL_SERVERS_BY_ID } from '../../../src/data/system/official_servers.ts';

describe('Official Servers Missing Local Reproduction', () => {
  const localJsonPath = path.resolve(process.cwd(), 'src/data/system/servers.local.json');
  const localBakPath = path.resolve(process.cwd(), 'src/data/system/servers.local.json.repro_bak');

  it('exports valid official servers and default server at runtime', () => {
    expect(OFFICIAL_SERVERS.length).toBeGreaterThan(0);
    expect(DEFAULT_SERVER).toBeDefined();
    expect(DEFAULT_SERVER.id).toBeTruthy();
    expect(OFFICIAL_SERVERS_BY_ID[DEFAULT_SERVER.id]).toEqual(DEFAULT_SERVER);
  });

  it('compiles with TypeScript without TS2306 when servers.local.json is absent', () => {
    let moved = false;
    if (fs.existsSync(localJsonPath)) {
      fs.renameSync(localJsonPath, localBakPath);
      moved = true;
    }

    try {
      const configFile = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
      expect(configFile).toBeDefined();
      const readResult = ts.readConfigFile(configFile!, ts.sys.readFile);
      const parsedConfig = ts.parseJsonConfigFileContent(readResult.config, ts.sys, process.cwd());

      const program = ts.createProgram(
        [path.resolve(process.cwd(), 'src/data/system/official_servers.ts')],
        parsedConfig.options
      );

      const sourceFile = program.getSourceFile(path.resolve(process.cwd(), 'src/data/system/official_servers.ts'));
      expect(sourceFile).toBeDefined();

      const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
      const errors = diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error);
      const ts2306 = errors.find(e => e.code === 2306);

      expect(ts2306).toBeUndefined();
      expect(errors).toHaveLength(0);
    } finally {
      if (moved && fs.existsSync(localBakPath)) {
        fs.renameSync(localBakPath, localJsonPath);
      }
    }
  });

  it('correctly parses server profiles from process.env when .env is absent or supplemented', async () => {
    const { readAndParseEnv } = await import('../../../scripts/lib/supabaseClient.ts');
    process.env['SERVER_ci_mock_ID'] = 'ci_mock_server';
    process.env['SERVER_ci_mock_NAME'] = 'CI Mock Server';
    process.env['SERVER_ci_mock_SUPABASE_URL'] = 'https://mock.supabase.co';

    try {
      const parsed = await readAndParseEnv();
      expect(parsed['ci_mock']).toBeDefined();
      expect(parsed['ci_mock']?.ID).toBe('ci_mock_server');
      expect(parsed['ci_mock']?.NAME).toBe('CI Mock Server');
      expect(parsed['ci_mock']?.SUPABASE_URL).toBe('https://mock.supabase.co');
    } finally {
      delete process.env['SERVER_ci_mock_ID'];
      delete process.env['SERVER_ci_mock_NAME'];
      delete process.env['SERVER_ci_mock_SUPABASE_URL'];
    }
  });
});
