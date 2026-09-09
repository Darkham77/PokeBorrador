import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Validate Asset Usage Auditor Test', () => {
  const auditorPath = path.resolve(process.cwd(), 'scripts/auditors/assets/validate_asset_usage.ts');
  const doxPath = path.resolve(process.cwd(), 'scripts/auditors/assets/AGENTS.md');

  it('exists and is registered in scripts/auditors/assets/AGENTS.md', () => {
    expect(fs.existsSync(auditorPath)).toBe(true);
    const doxContent = fs.readFileSync(doxPath, 'utf-8');
    expect(doxContent).toContain('validate_asset_usage.ts');
  });

  it('is discoverable by auditScanner under assets family', async () => {
    const { discoverAuditors } = await import('../../../scripts/maintenance/auditScanner.ts');
    const tasks = await discoverAuditors({ family: 'assets' });
    const taskIds = tasks.map(t => t.id);
    expect(taskIds).toContain('validate_asset_usage');
  });
});
