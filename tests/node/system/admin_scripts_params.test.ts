import { execSync } from 'node:child_process';

import { describe, it, expect } from 'vite-plus/test';

describe('Admin & Maintenance Scripts CLI Parameters & Help', () => {
  it('admin_supabase_users.ts outputs clear usage and options on --help', () => {
    const output = execSync(
      'node --permission --experimental-strip-types --allow-fs-read=. scripts/maintenance/admin_supabase_users.ts --help',
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    expect(output).toContain('--server=<server>');
    expect(output).toContain('--action=<action>');
    expect(output).toContain('--email=<email>');
    expect(output).toContain('set-password');
  });

  it('backup_supabase_db.ts outputs clear usage on --help', () => {
    const output = execSync(
      'node --permission --experimental-strip-types --allow-fs-read=. scripts/database/backup_supabase_db.ts --help',
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    expect(output).toContain('--server=<server>');
    expect(output).toContain('all');
  });

  it('admin_rename.ts outputs clear usage on --help', () => {
    const output = execSync(
      'node --permission --experimental-strip-types --allow-fs-read=. scripts/maintenance/admin_rename.ts --help',
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    expect(output).toContain('--user=<user>');
    expect(output).toContain('--name=<name>');
  });

  it('repair_account_legality.ts outputs clear usage on --help', () => {
    const output = execSync(
      'node --permission --allow-worker --allow-fs-read=* --allow-fs-write=* --import tsx scripts/maintenance/repair_account_legality.ts --help',
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    expect(output).toContain('--user=<user>');
    expect(output).toContain('--server=<server>');
    expect(output).toContain('all');
  });

  it('setup_supabase.ts outputs clear usage on --help', () => {
    const output = execSync(
      'node --permission --experimental-strip-types --allow-fs-read=. --allow-child-process supabase/setup_supabase.ts --help',
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    expect(output).toContain('USAGE setup-supabase');
    expect(output).toContain('list');
    expect(output).toContain('generate');
  });

  it('run_sequential_simulations.ts outputs clear usage on --help', () => {
    const output = execSync(
      'node --permission --experimental-strip-types --allow-fs-read=. scripts/e2e/run_sequential_simulations.ts --help',
      {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    expect(output).toContain('table');
    expect(output).toContain('list');
    expect(output).toContain('json');
    expect(output).toContain('--filter=<filter>');
  });
});
