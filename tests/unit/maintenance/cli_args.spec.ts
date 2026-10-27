import { parseArgs } from 'node:util';

import { defineCommand, runCommand } from 'citty';
import { describe, it, expect } from 'vite-plus/test';

import { parseUnmatchedArgs } from '@/../scripts/lib/cliHelpers.ts';
import {
  parseServerArguments,
  resolveServerProfiles,
  serverCliArgs,
  type ServerCliArgs
} from '@/../scripts/lib/supabaseClient.ts';

describe('CLI Argument Parsing & Standardization', () => {
  const baseProfiles = ['server_franco', 'cloud'];
  const allAvailable = ['server_franco', 'cloud', 'local-docker', 'official_prod'];

  describe('parseServerArguments', () => {
    it('correctly extracts server from --server=<profile>', () => {
      const args = ['--server=server_franco'];
      const result = parseServerArguments(args, baseProfiles, allAvailable);
      expect(result).toEqual(['server_franco']);
    });

    it('correctly extracts server from -s=<profile>', () => {
      const args = ['-s=cloud'];
      const result = parseServerArguments(args, baseProfiles, allAvailable);
      expect(result).toEqual(['cloud']);
    });

    it('correctly extracts server from separated --server <profile>', () => {
      const args = ['--server', 'server_franco'];
      const result = parseServerArguments(args, baseProfiles, allAvailable);
      expect(result).toEqual(['server_franco']);
    });

    it('correctly returns all profiles when --all is passed', () => {
      const args = ['--all'];
      const result = parseServerArguments(args, baseProfiles, allAvailable);
      expect(result).toEqual(baseProfiles);
    });

    it('correctly returns all profiles when positional all is passed', () => {
      const args = ['all'];
      const result = parseServerArguments(args, baseProfiles, allAvailable);
      expect(result).toEqual(baseProfiles);
    });
  });

  describe('Citty Native serverCliArgs & resolveServerProfiles', () => {
    it('defines serverCliArgs SSoT with positional target, server flag, and all flag', () => {
      expect(serverCliArgs).toBeDefined();
      expect(serverCliArgs.server.type).toBe('string');
      expect(serverCliArgs.server.alias).toBe('s');
      expect(serverCliArgs.target.type).toBe('positional');
      expect(serverCliArgs.target.required).toBe(false);
      expect(serverCliArgs.all.type).toBe('boolean');
      expect(serverCliArgs.all.alias).toBe('a');
    });

    it('resolves server from named server option', () => {
      const args: ServerCliArgs = { server: 'server_franco' };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(['server_franco']);
    });

    it('resolves server from positional target', () => {
      const args: ServerCliArgs = { target: 'server_franco' };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(['server_franco']);
    });

    it('tolerates key=value syntax in positional target (server=server_franco)', () => {
      const args: ServerCliArgs = { target: 'server=server_franco' };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(['server_franco']);
    });

    it('tolerates alias prefix in positional target (s=cloud)', () => {
      const args: ServerCliArgs = { target: 's=cloud' };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(['cloud']);
    });

    it('resolves all when target is "all"', () => {
      const args: ServerCliArgs = { target: 'all' };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(baseProfiles);
    });

    it('resolves all when all flag is true', () => {
      const args: ServerCliArgs = { all: true };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(baseProfiles);
    });

    it('resolves all when server is "all"', () => {
      const args: ServerCliArgs = { server: 'all' };
      const result = resolveServerProfiles(args, baseProfiles, allAvailable);
      expect(result).toEqual(baseProfiles);
    });

    it('integrates natively with Citty runCommand across various input formats', async () => {
      let resolved: string[] = [];
      const testCmd = defineCommand({
        args: serverCliArgs,
        run({ args }) {
          resolved = resolveServerProfiles(args, baseProfiles, allAvailable);
        }
      });

      // 1. Positional server name: `npm run database:update server_franco`
      await runCommand(testCmd, { rawArgs: ['server_franco'] });
      expect(resolved).toEqual(['server_franco']);

      // 2. npm style key=value: `npm run database:update server=server_franco`
      await runCommand(testCmd, { rawArgs: ['server=server_franco'] });
      expect(resolved).toEqual(['server_franco']);

      // 3. Positional all: `npm run database:update all`
      await runCommand(testCmd, { rawArgs: ['all'] });
      expect(resolved).toEqual(baseProfiles);

      // 4. Boolean flag: `npm run database:update --all`
      await runCommand(testCmd, { rawArgs: ['--all'] });
      expect(resolved).toEqual(baseProfiles);

      // 5. Short flag: `npm run database:update -a`
      await runCommand(testCmd, { rawArgs: ['-a'] });
      expect(resolved).toEqual(baseProfiles);

      // 6. Explicit flag: `npm run database:update --server server_franco`
      await runCommand(testCmd, { rawArgs: ['--server', 'server_franco'] });
      expect(resolved).toEqual(['server_franco']);

      // 7. Short option: `npm run database:update -s cloud`
      await runCommand(testCmd, { rawArgs: ['-s', 'cloud'] });
      expect(resolved).toEqual(['cloud']);
    });
  });

  describe('Citty Positional & Environment Fallback Patterns', () => {
    it('supports positional target in asset downloader', async () => {
      let downloadedTarget = '';
      const downloadCmd = defineCommand({
        args: {
          target: {
            type: 'positional',
            description: 'Target asset type',
            default: 'all',
            required: false
          }
        },
        run({ args }) {
          downloadedTarget = args.target;
        }
      });

      await runCommand(downloadCmd, { rawArgs: ['items'] });
      expect(downloadedTarget).toBe('items');

      await runCommand(downloadCmd, { rawArgs: [] });
      expect(downloadedTarget).toBe('all');
    });

    it('supports positional caseId with environment variable fallback in trace replayer', async () => {
      let executedCaseId = '';
      const replayerCmd = defineCommand({
        args: {
          caseId: {
            type: 'positional',
            required: false,
            default: process.env.TEST_CASE_ID
          }
        },
        run({ args }) {
          executedCaseId = args.caseId || process.env.TEST_CASE_ID || '';
        }
      });

      // 1. Passed positionally
      await runCommand(replayerCmd, { rawArgs: ['case-explicit-123'] });
      expect(executedCaseId).toBe('case-explicit-123');

      // 2. Fallback to process.env
      process.env.TEST_CASE_ID = 'case-env-456';
      try {
        await runCommand(replayerCmd, { rawArgs: [] });
        expect(executedCaseId).toBe('case-env-456');
      } finally {
        delete process.env.TEST_CASE_ID;
      }
    });

    it('supports Citty subCommands natively', async () => {
      let executedAction = '';
      const listSub = defineCommand({
        run() {
          executedAction = 'list';
        }
      });
      const buildSub = defineCommand({
        run() {
          executedAction = 'build';
        }
      });
      const rootManageCmd = defineCommand({
        subCommands: {
          list: listSub,
          build: buildSub
        }
      });

      await runCommand(rootManageCmd, { rawArgs: ['list'] });
      expect(executedAction).toBe('list');

      await runCommand(rootManageCmd, { rawArgs: ['build'] });
      expect(executedAction).toBe('build');
    });
  });

  describe('admin_supabase_users parseArgs schema', () => {
    const parseAdminArgs = (args: string[]) => {
      return parseArgs({
        args,
        options: {
          server: { type: 'string', short: 's' },
          action: { type: 'string', short: 'a' },
          email: { type: 'string', short: 'e' },
          password: { type: 'string', short: 'p' },
          'new-email': { type: 'string' },
          username: { type: 'string', short: 'u' },
          help: { type: 'boolean', short: 'h' }
        },
        allowPositionals: true,
        strict: false
      });
    };

    it('correctly parses all explicit flags for set-password', () => {
      const args = [
        '--server=server_franco',
        '--action=set-password',
        '--email=usuario@ejemplo.com',
        '--password=poke312'
      ];
      const { values } = parseAdminArgs(args);
      expect(values.server).toBe('server_franco');
      expect(values.action).toBe('set-password');
      expect(values.email).toBe('usuario@ejemplo.com');
      expect(values.password).toBe('poke312');
    });

    it('correctly parses unban and promote actions with email', () => {
      const unbanArgs = ['--server=cloud', '--action=unban', '--email=banned@ejemplo.com'];
      const { values: unbanValues } = parseAdminArgs(unbanArgs);
      expect(unbanValues.server).toBe('cloud');
      expect(unbanValues.action).toBe('unban');
      expect(unbanValues.email).toBe('banned@ejemplo.com');

      const promoteArgs = ['--server=cloud', '--action=promote', '--email=admin@ejemplo.com'];
      const { values: promoteValues } = parseAdminArgs(promoteArgs);
      expect(promoteValues.server).toBe('cloud');
      expect(promoteValues.action).toBe('promote');
      expect(promoteValues.email).toBe('admin@ejemplo.com');
    });

    it('correctly parses set-email with new-email flag', () => {
      const args = [
        '--server=server_franco',
        '--action=set-email',
        '--email=old@test.com',
        '--new-email=new@test.com'
      ];
      const { values } = parseAdminArgs(args);
      expect(values.server).toBe('server_franco');
      expect(values.action).toBe('set-email');
      expect(values.email).toBe('old@test.com');
      expect(values['new-email']).toBe('new@test.com');
    });
  });

  describe('parseUnmatchedArgs shared helper', () => {
    it('extracts key=value parameters cleanly', () => {
      const parsed = parseUnmatchedArgs(['user=Ash', 'server=server_franco', 'clean=true']);
      expect(parsed.getParam('user')).toBe('Ash');
      expect(parsed.getParam('server')).toBe('server_franco');
      expect(parsed.hasFlag('clean')).toBe(true);
      expect(parsed.barePositionals).toHaveLength(0);
    });

    it('extracts bare positionals and flags', () => {
      const parsed = parseUnmatchedArgs(['server_franco', 'all', 'clean']);
      expect(parsed.barePositionals).toEqual(['server_franco', 'all', 'clean']);
      expect(parsed.hasFlag('all')).toBe(true);
      expect(parsed.hasFlag('clean')).toBe(true);
      expect(parsed.hasFlag('missing')).toBe(false);
    });

    it('supports alias fallbacks for parameters', () => {
      const parsed = parseUnmatchedArgs(['u=Ash', 's=cloud']);
      expect(parsed.getParam('user', 'u')).toBe('Ash');
      expect(parsed.getParam('server', 's')).toBe('cloud');
      expect(parsed.getParam('unknown', 'x')).toBeUndefined();
    });

    it('handles empty or non-array inputs gracefully', () => {
      const parsedNull = parseUnmatchedArgs(null);
      expect(parsedNull.barePositionals).toHaveLength(0);
      expect(parsedNull.getParam('user')).toBeUndefined();

      const parsedSingle = parseUnmatchedArgs('user=Ash');
      expect(parsedSingle.getParam('user')).toBe('Ash');
    });
  });
});
