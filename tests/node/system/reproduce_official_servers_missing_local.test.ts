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

  it('compiles servers strictly from environment profiles and preserves official_prod as default', async () => {
    const { configureOfficialServers } = await import('../../../scripts/maintenance/configure_official_servers.ts');
    process.env['SERVER_ci_extra_ID'] = 'ci_extra_server';
    process.env['SERVER_ci_extra_NAME'] = 'CI Extra Server';
    process.env['SERVER_ci_extra_SUPABASE_PUBLIC_URL'] = 'https://extra.supabase.co';
    process.env['SERVER_ci_extra_ANON_KEY'] = 'test-extra-anon-key';

    try {
      await configureOfficialServers();
      const generated = JSON.parse(fs.readFileSync(localJsonPath, 'utf-8')) as Array<{ id: string; isDefault?: boolean }>;
      const officialProd = generated.find(s => s.id === 'official_prod');
      const ciExtra = generated.find(s => s.id === 'ci_extra_server');
      
      expect(officialProd).toBeDefined();
      expect(officialProd?.isDefault).toBe(true);
      expect(ciExtra).toBeDefined();
      expect(ciExtra?.isDefault).toBeFalsy();
    } finally {
      delete process.env['SERVER_ci_extra_ID'];
      delete process.env['SERVER_ci_extra_NAME'];
      delete process.env['SERVER_ci_extra_SUPABASE_PUBLIC_URL'];
      delete process.env['SERVER_ci_extra_ANON_KEY'];
      // Restore clean local configuration from local environment
      await configureOfficialServers();
    }
  });

  it('throws a loud critical error when no profiles exist in env or process.env', async () => {
    const { configureOfficialServers } = await import('../../../scripts/maintenance/configure_official_servers.ts');
    const savedEnv: Record<string, string | undefined> = {};
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SERVER_')) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    }
    const envPath = path.resolve(process.cwd(), '.env');
    const envBakPath = path.resolve(process.cwd(), '.env.repro_bak');
    let envMoved = false;
    if (fs.existsSync(envPath)) {
      fs.renameSync(envPath, envBakPath);
      envMoved = true;
    }

    try {
      await expect(configureOfficialServers()).rejects.toThrow(/ERROR CRÍTICO/);
    } finally {
      if (envMoved && fs.existsSync(envBakPath)) {
        fs.renameSync(envBakPath, envPath);
      }
      for (const [k, v] of Object.entries(savedEnv)) {
        if (v !== undefined) process.env[k] = v;
      }
      await configureOfficialServers();
    }
  });

  it('throws loud critical error at module load when servers.local.json is empty', () => {
    const originalContent = fs.readFileSync(localJsonPath, 'utf-8');
    try {
      fs.writeFileSync(localJsonPath, '[]', 'utf-8');
      let errorThrown = false;
      try {
        const { execSync } = require('node:child_process');
        execSync('node --experimental-strip-types -e "import(\'./src/data/system/official_servers.ts\')"', {
          cwd: process.cwd(),
          stdio: 'pipe'
        });
      } catch (err: unknown) {
        errorThrown = true;
        const stderr = String((err as { stderr?: Buffer }).stderr ?? '');
        expect(stderr).toContain('ERROR CRÍTICO: No se encontraron servidores configurados');
      }
      expect(errorThrown).toBe(true);
    } finally {
      fs.writeFileSync(localJsonPath, originalContent, 'utf-8');
    }
  });
});
