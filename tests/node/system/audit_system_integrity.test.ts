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
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --top=5', {
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
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --human --top=5', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(stdout).toContain('POKE VICIO - REGLAS DE CÓDIGO');
    expect(stdout).toContain('TOTAL:');
  });

  it('should export valid Markdown and JSON reports when --output is provided', () => {
    execSync(`node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --output=scratch/test_integrity_audit.md`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(fs.existsSync(testMdFile)).toBe(true);
    const mdContent = fs.readFileSync(testMdFile, 'utf-8');
    expect(mdContent).toContain('# Reporte de Auditoría del Proyecto');
    expect(mdContent).toContain('## 📊 Desglose por Categoría');

    execSync(`node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_project.ts --output=scratch/test_integrity_audit.json`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(fs.existsSync(testJsonFile)).toBe(true);
    const jsonContent = fs.readFileSync(testJsonFile, 'utf-8');
    expect(() => JSON.parse(jsonContent)).not.toThrow();
  });

  it('should execute audit_full.ts in fast mode and emit consolidated JSON by default', () => {
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_full.ts --fast', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(() => JSON.parse(stdout)).not.toThrow();
    const data = JSON.parse(stdout);

    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('suitesTotal');
    expect(data.summary).toHaveProperty('suitesPassed');
    expect(data).toHaveProperty('suites');
    expect(Array.isArray(data.suites)).toBe(true);
    expect(data.suites.length).toBeGreaterThanOrEqual(1);
  });

  it('should render human banners when --human is passed to audit_full.ts', () => {
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_full.ts --fast --human', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(stdout).toContain('SUITE DE AUDITORÍA GLOBAL Y VALIDACIÓN COMPLETA');
    expect(stdout).toContain('RESUMEN FINAL DE LA AUDITORÍA COMPLETA');
  });

  it('should execute audit_warnings_diff.ts and generate valid JSON/TXT reports without executing unit tests', () => {
    const stdout = execSync('node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-child-process scripts/maintenance/audit_warnings_diff.ts', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });

    expect(stdout).toContain('REPORTE DE ANÁLISIS GLOBAL: ERRORES DEL PROYECTO Y WARNINGS LOCALES');
    expect(stdout).toContain('Cero errores detectados en todo el proyecto');

    const jsonReportPath = path.resolve(scratchDir, 'warnings_diff_report.json');
    const txtReportPath = path.resolve(scratchDir, 'warnings_diff_report.txt');

    expect(fs.existsSync(jsonReportPath)).toBe(true);
    expect(fs.existsSync(txtReportPath)).toBe(true);

    const jsonContent = fs.readFileSync(jsonReportPath, 'utf-8');
    const parsed = JSON.parse(jsonContent);
    expect(parsed).toHaveProperty('errors');
    expect(parsed).toHaveProperty('warnings');
    expect(Array.isArray(parsed.errors)).toBe(true);
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });
});
