import { describe, it, expect } from 'vitest';
import {
  scanFileForNativePathViolations,
  auditNativePaths,
  isPathIgnored
} from '@/../scripts/auditors/architecture/validate_native_paths.ts';

describe('validate_native_paths (Security & Path Integrity Auditor)', () => {
  describe('scanFileForNativePathViolations', () => {
    it('returns empty violations for clean, compliant code using node:path and safe URL fetching', () => {
      const cleanCode = [
        "import fs from 'node:fs';",
        "import path from 'node:path';",
        "",
        "export function readConfig(rootDir: string, fileName: string): string {",
        "  const targetPath = path.join(rootDir, 'config', fileName);",
        "  return fs.readFileSync(targetPath, 'utf-8');",
        "}",
        "",
        "export async function fetchRemoteData(rawUrl: string): Promise<Response> {",
        "  const parsed = new URL(rawUrl);",
        "  if (parsed.protocol !== 'https:' || parsed.hostname !== 'play.pokemonshowdown.com') {",
        "    throw new Error('Forbidden host');",
        "  }",
        "  return fetch(parsed.href);",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('src/logic/config.ts', cleanCode);
      expect(violations).toEqual([]);
    });

    it('detects unsafe-path-concat in fs calls with template literals or binary + slashes', () => {
      const badCode = [
        "import fs from 'node:fs';",
        "",
        "export function load(dir: string, file: string) {",
        "  const data1 = " + "fs." + "readFileSync(`" + "${dir}/${file}`" + ", 'utf-8');",
        "  const exists = " + "fs." + "existsSync(dir + " + "'/' + " + "file);",
        "  return { data1, exists };",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/loader.ts', badCode);
      expect(violations.length).toBe(2);
      expect(violations[0]?.ruleId).toBe('unsafe-path-concat');
      expect(violations[0]?.line).toBe(4);
      expect(violations[1]?.ruleId).toBe('unsafe-path-concat');
      expect(violations[1]?.line).toBe(5);
    });

    it('detects unsafe-path-concat on redundant path.join with internal template slashes', () => {
      const badCode = [
        "import path from 'node:path';",
        "",
        "export function getDir(a: string, b: string) {",
        "  return " + "path." + "join(`" + "${a}/${b}`" + ");",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/paths.ts', badCode);
      expect(violations.length).toBe(1);
      expect(violations[0]?.ruleId).toBe('unsafe-path-concat');
      expect(violations[0]?.line).toBe(4);
    });

    it('detects unsafe-path-concat on path variable assignments using template literals', () => {
      const badCode = [
        "export function resolveOut(baseDir: string, name: string) {",
        "  const full" + "Path = " + "`" + "${baseDir}/${name}.json" + "`;",
        "  return full" + "Path;",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/target.ts', badCode);
      expect(violations.length).toBe(1);
      expect(violations[0]?.ruleId).toBe('unsafe-path-concat');
      expect(violations[0]?.line).toBe(2);
    });

    it('does not produce false positives on ratios, turn counts, and URL string templates', () => {
      const validCode = [
        "console.log(`[Progreso] ${progress}/${total} completados`);",
        "console.debug(`Turn ${turn} | Player ${pHp}/${pMaxHp}`);",
        "const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/${id}.png`;",
        "const endpoint = `/api/dev-export-db`;"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/logs.ts', validCode);
      expect(violations).toEqual([]);
    });

    it('detects unsanitized-env-argv-path when passing raw env/argv into fs/path sinks', () => {
      const badCode = [
        "import fs from 'node:fs';",
        "import path from 'node:path';",
        "",
        "export function run() {",
        "  const content = " + "fs." + "readFileSync(process" + ".argv[2], 'utf-8');",
        "  const target = " + "path." + "resolve(process" + ".env.APP_DIR);",
        "  return { content, target };",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/envSink.ts', badCode);
      expect(violations.length).toBe(2);
      expect(violations[0]?.ruleId).toBe('unsanitized-env-argv-path');
      expect(violations[0]?.line).toBe(5);
      expect(violations[1]?.ruleId).toBe('unsanitized-env-argv-path');
      expect(violations[1]?.line).toBe(6);
    });

    it('allows sanitized env/argv with sanitizePath, assertSafePathComponent, or traversal check', () => {
      const safeCode = [
        "import fs from 'node:fs';",
        "import path from 'node:path';",
        "",
        "export function run() {",
        "  const cleanAppData = process.env.APPDATA.replace(/[^a-zA-Z0-9_:\\\\-\\s.]/g, '');",
        "  const p1 = path.join(cleanAppData, 'test');",
        "  const p2 = path.resolve(sanitizePath(process.argv[2]));",
        "  return { p1, p2 };",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/safeEnv.ts', safeCode);
      expect(violations).toEqual([]);
    });

    it('detects untrusted-url-fetch when fetch is called with dynamic raw variable without URL validation', () => {
      const badCode = [
        "export async function download(url: string) {",
        "  const res = await " + "fetch" + "(url);",
        "  return res.json();",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/downloader.ts', badCode);
      expect(violations.length).toBe(1);
      expect(violations[0]?.ruleId).toBe('untrusted-url-fetch');
      expect(violations[0]?.line).toBe(2);
    });

    it('allows fetch on string literals, URL object properties, and safeFetch calls', () => {
      const safeCode = [
        "import { safeFetch } from '@/../scripts/lib/safePath';",
        "",
        "export async function fetchExamples() {",
        "  const r1 = await fetch('https://play.pokemonshowdown.com/data.json');",
        "  const r2 = await fetch('/api/dev-clean-db');",
        "  const urlObj = new URL('https://example.com');",
        "  const r3 = await fetch(urlObj.href);",
        "  const r4 = await safeFetch('https://bulbapedia.bulbagarden.net/wiki/Main_Page');",
        "  return { r1, r2, r3, r4 };",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/safeFetch.ts', safeCode);
      expect(violations).toEqual([]);
    });

    it('detects hardcoded-slash-path on manual backslash search and Windows drive letters', () => {
      const badCode = [
        "export function getDir(execPath: string) {",
        "  const idx = execPath" + ".lastIndexOf(" + "'\\\\" + "');",
        "  const drive = " + "'C:" + "\\\\Program Files" + "'; // test-unannotated",
        "  return { idx, drive };",
        "}"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/slash.ts', badCode);
      expect(violations.length).toBe(2);
      expect(violations[0]?.ruleId).toBe('hardcoded-slash-path');
      expect(violations[0]?.line).toBe(2);
      expect(violations[1]?.ruleId).toBe('hardcoded-slash-path');
      expect(violations[1]?.line).toBe(3);
    });

    it('respects inline escape hatches', () => {
      const escapedCode = [
        "const file = process.argv[2]; // env-ok",
        "const res = await fetch(file); // url-ok",
        "const customDrive = 'C:\\\\Custom'; // cross-platform-ok",
        "const legacyPath = dir + '/' + name; // path-ok"
      ].join('\n');

      const violations = scanFileForNativePathViolations('scripts/test/escaped.ts', escapedCode);
      expect(violations).toEqual([]);
    });
  });

  describe('Directory Ignore Governance (isPathIgnored)', () => {
    it('correctly ignores canonical directories', () => {
      expect(isPathIgnored('node_modules/vitest/index.js')).toBe(true);
      expect(isPathIgnored('external/pokemon-showdown-code/sim/index.ts')).toBe(true);
      expect(isPathIgnored('dist/assets/index.js')).toBe(true);
      expect(isPathIgnored('scratch/audits/report.json')).toBe(true);
      expect(isPathIgnored('.git/config')).toBe(true);
    });

    it('allows scanning canonical source directories', () => {
      expect(isPathIgnored('src/logic/battle.ts')).toBe(false);
      expect(isPathIgnored('scripts/auditors/architecture/validate_native_paths.ts')).toBe(false);
      expect(isPathIgnored('database/migrations/001_initial.sql')).toBe(false);
      expect(isPathIgnored('tests/node/battle/test.ts')).toBe(false);
    });
  });

  describe('Full Codebase Audit (auditNativePaths)', () => {
    it('validates the entire repository with 0 violations and passed status', () => {
      const result = auditNativePaths();
      expect(result.filesScanned).toBeGreaterThan(1000);
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
      expect(result.countsByRule['unsafe-path-concat']).toBe(0);
      expect(result.countsByRule['unsanitized-env-argv-path']).toBe(0);
      expect(result.countsByRule['untrusted-url-fetch']).toBe(0);
      expect(result.countsByRule['hardcoded-slash-path']).toBe(0);
    });
  });
});
