import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('Audit System Integrity & Dual-Mode Formatting', () => {
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  const testMdFile = path.resolve(scratchDir, 'test_integrity_audit.md');
  const testJsonFile = path.resolve(scratchDir, 'test_integrity_audit.json');

  afterAll(() => {
    try {
      if (fs.existsSync(testMdFile)) fs.unlinkSync(testMdFile);
      if (fs.existsSync(testJsonFile)) fs.unlinkSync(testJsonFile);
    } catch {
      // Ignore cleanup error
    }
  });

  it('should output 100% parseable JSON on stdout by default for audit_project.ts', () => {
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --path=src/data/inventory --top=5', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'] // ignore stderr progress logs
    });

    expect(() => JSON.parse(stdout)).not.toThrow();
    const data = JSON.parse(stdout);

    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('totalViolations');
    expect(data.summary).toHaveProperty('errors');
    expect(data.summary).toHaveProperty('warnings');
    expect(data.summary).toHaveProperty('byCategory');
    expect(data).toHaveProperty('topFiles');
    expect(data).toHaveProperty('files');
    expect(Array.isArray(data.topFiles)).toBe(true);
    expect(typeof data.files).toBe('object');
  });

  it('should render grouped tree and sanitized context when --human is passed to audit_project.ts', () => {
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --path=src/data/inventory --human --top=5', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(stdout).toContain('POKE VICIO - REGLAS DE CÓDIGO');
    expect(stdout).toContain('TOTAL:');
  });

  it('should export valid Markdown and JSON reports when --output is provided', () => {
    execSync(`node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --path=src/data/inventory --output=scratch/test_integrity_audit.md`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(fs.existsSync(testMdFile)).toBe(true);
    const mdContent = fs.readFileSync(testMdFile, 'utf-8');
    expect(mdContent).toContain('# Reporte de Auditoría del Proyecto');
    expect(mdContent).toContain('## 📊 Desglose por Categoría');

    execSync(`node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --path=src/data/inventory --output=scratch/test_integrity_audit.json`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(fs.existsSync(testJsonFile)).toBe(true);
    const jsonContent = fs.readFileSync(testJsonFile, 'utf-8');
    expect(() => JSON.parse(jsonContent)).not.toThrow();
  });

  it('should support errors-only filtering on a scoped path', () => {
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --path=src/data/inventory --errors-only', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(() => JSON.parse(stdout)).not.toThrow();
    const data = JSON.parse(stdout);
    expect(data).toHaveProperty('status');
    expect(data.summary).toHaveProperty('errors');
    expect(data.summary.errors).toBe(0);
  });

  it('should render a sample list of up to 5 error findings in the consolidated footer', async () => {
    const { renderConsolidatedFooter } = await import('../../../scripts/lib/unifiedTheme.ts');
    const mockErrors = [
      { severity: 'error' as const, file: 'src/logic/pokemon/pokemonFieldAbilities.ts', line: 363, message: 'FALLBACK SILENCIOSO DETECTADO', ruleId: 'noDomainIdFallbacks', context: 'name || pokemon.ability' },
      { severity: 'error' as const, file: 'src/components/MyComp.vue', line: 10, message: 'Elemento interactivo sin ID', ruleId: 'missingInteractiveId', context: '<button>' }
    ];

    const footer = renderConsolidatedFooter(18, 17, 2, 10, 5000, mockErrors);
    expect(footer).toContain('AUDITORÍA GLOBAL CON ERRORES CRÍTICOS');
    expect(footer).toContain('Muestra de errores detectados (primeros 2):');
    expect(footer).toContain('src/logic/pokemon/pokemonFieldAbilities.ts:363');
    expect(footer).toContain('FALLBACK SILENCIOSO DETECTADO');
  });
});
