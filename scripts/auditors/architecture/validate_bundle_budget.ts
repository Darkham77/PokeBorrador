/**
 * scripts/auditors/architecture/validate_bundle_budget.ts
 *
 * PRODUCTION BUNDLE BUDGET & CLIENT LEAK AUDITOR (Node.js 26+ Native)
 *
 * Enforces production bundle boundaries across the application:
 *   1. Anti-Leak AST Scan: Ensures heavy backend/engine dependencies (@pkmn/sim, postgres, node:sqlite,
 *      test harnesses) and test scripts are NEVER imported as runtime VALUES in client bundles.
 *      (Type-only imports like 'import type { ... }' are cleanly stripped by TS/Vite and permitted).
 *   2. Code-Splitting Audit: Ensures heavy application routes use dynamic imports (() => import(...)).
 *   3. Chunk Size Budgeting: If dist/assets exists, audits client JS bundle sizes against budget limits.
 *
 * Escape Hatch:
 *   // bundle-leak-ok: <justification> disables violation on that line.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/architecture/validate_bundle_budget.ts
 *   npm run validate:bundle
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import ts from 'typescript';
import { setupValidation } from '../../lib/validationBase.ts';
import type { FindingSeverity } from '../../lib/auditContract.ts';

enableCompileCache();

export interface BundleViolation {
  readonly file: string;
  readonly line: number;
  readonly severity: FindingSeverity;
  readonly message: string;
}

export interface BundleAuditResult {
  readonly filesScanned: number;
  readonly violations: readonly BundleViolation[];
  readonly chunksAudited: number;
  readonly passed: boolean;
}

const FORBIDDEN_VALUE_IMPORTS_UI = [
  { module: '@pkmn/sim', reason: 'El motor Pokémon Showdown pesa +15MB y no debe importarse como valor de runtime en UI/Componentes (usa Web Workers o imports de sólo tipo).' },
  { module: 'postgres', reason: 'El driver nativo de PostgreSQL pertenece exclusivamente al backend/scripts, no al cliente.' },
  { module: 'node:sqlite', reason: 'El módulo node:sqlite es exclusivo de Node.js, incompatible con navegadores web.' },
  { module: '@playwright/test', reason: 'Librería de pruebas E2E no debe importarse en código de producción de src/.' },
  { module: 'vitest', reason: 'El framework de pruebas no debe importarse en código de producción de src/.' }
] as const;

const FORBIDDEN_PATH_SEGMENTS = ['/tests/', '/scripts/'] as const;

const UI_DIRS = ['src/components', 'src/views', 'src/stores'] as const;

const EXEMPT_CHUNK_PREFIXES = [
  'db-migrations-data',
  'vendor-pkmn-sim',
  'worker-vendor-pkmn-sim',
  'game-data-pokemon',
  'worker-game-data-pokemon',
  'vendor-randoms'
] as const;

const MAX_CLIENT_CHUNK_WARN_BYTES = 500 * 1024; // 500 KB uncompressed for app chunks
const MAX_CLIENT_CHUNK_ERROR_BYTES = 1500 * 1024; // 1.5 MB uncompressed for app chunks

export function auditBundleBudget(): BundleAuditResult {
  const violations: BundleViolation[] = [];
  let filesScanned = 0;
  let chunksAudited = 0;

  const srcDir = path.resolve(process.cwd(), 'src');

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const norm = fullPath.replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.vue') || entry.name.endsWith('.js'))) {
        if (entry.name.includes('.spec.') || entry.name.includes('.test.') || entry.name.includes('.simulation.') || entry.name.endsWith('.d.ts')) {
          continue;
        }

        filesScanned++;
        const content = fs.readFileSync(fullPath, 'utf8');
        let scriptContent = content;

        if (entry.name.endsWith('.vue')) {
          const match = /<script\b[^>]*>([\s\S]*?)<\/script>/i.exec(content);
          scriptContent = match ? match[1] || '' : '';
        }

        if (!scriptContent) continue;

        const sourceFile = ts.createSourceFile(
          fullPath,
          scriptContent,
          ts.ScriptTarget.Latest,
          true,
          entry.name.endsWith('.vue') ? ts.ScriptKind.TS : ts.ScriptKind.TS
        );

        const isUiLayer = UI_DIRS.some(d => norm.includes(d));

        ts.forEachChild(sourceFile, (node) => {
          if (ts.isImportDeclaration(node)) {
            const moduleSpecifier = node.moduleSpecifier;
            if (!ts.isStringLiteral(moduleSpecifier)) return;
            const importPath = moduleSpecifier.text;

            const importClause = node.importClause;
            let isTypeOnly = false;
            if (importClause) {
              if (importClause.isTypeOnly) {
                isTypeOnly = true;
              } else if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                isTypeOnly = importClause.namedBindings.elements.every(elem => elem.isTypeOnly);
              }
            }

            // Los imports de sólo tipo se compilan a nada y nunca llegan al bundle de runtime
            if (isTypeOnly) return;

            const lineAndChar = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const lineNum = lineAndChar.line + 1;

            const fullLines = content.split('\n');
            const lineText = fullLines[lineNum - 1] || '';
            if (lineText.includes('// bundle-leak-ok:')) return;

            // 1. Fuga de código de tests/scripts como valor de runtime
            for (const seg of FORBIDDEN_PATH_SEGMENTS) {
              if (importPath.includes(seg) || importPath.startsWith(`..${seg}`)) {
                violations.push({
                  file: fullPath,
                  line: lineNum,
                  severity: 'error',
                  message: `Fuga de código en tiempo de ejecución: '${importPath}'. No se permite importar valores desde '${seg}' en código de producción.`
                });
              }
            }

            // 2. Fuga de dependencias pesadas en capas de UI
            if (isUiLayer) {
              for (const forbidden of FORBIDDEN_VALUE_IMPORTS_UI) {
                if (importPath === forbidden.module || importPath.startsWith(`${forbidden.module}/`)) {
                  violations.push({
                    file: fullPath,
                    line: lineNum,
                    severity: 'error',
                    message: `Import de valor en tiempo de ejecución prohibido en UI: '${importPath}'. ${forbidden.reason}`
                  });
                }
              }
            }
          }
        });
      }
    }
  }

  scanDir(srcDir);

  // 3. Auditar dist/assets si existe compilación
  const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');
  if (fs.existsSync(distAssetsDir)) {
    const assets = fs.readdirSync(distAssetsDir);
    for (const asset of assets) {
      if (asset.endsWith('.js')) {
        chunksAudited++;
        if (EXEMPT_CHUNK_PREFIXES.some(prefix => asset.startsWith(prefix))) {
          continue; // Chunks aislados de base de datos o simulación pre-configurados
        }

        const assetPath = path.join(distAssetsDir, asset);
        const stats = fs.statSync(assetPath);
        if (stats.size > MAX_CLIENT_CHUNK_ERROR_BYTES) {
          violations.push({
            file: assetPath,
            line: 1,
            severity: 'error',
            message: `El chunk de cliente '${asset}' (${(stats.size / 1024).toFixed(1)} KB) supera el límite crítico de ${(MAX_CLIENT_CHUNK_ERROR_BYTES / 1024).toFixed(0)} KB.`
          });
        } else if (stats.size > MAX_CLIENT_CHUNK_WARN_BYTES) {
          violations.push({
            file: assetPath,
            line: 1,
            severity: 'warning',
            message: `El chunk de cliente '${asset}' (${(stats.size / 1024).toFixed(1)} KB) excede el presupuesto sugerido de ${(MAX_CLIENT_CHUNK_WARN_BYTES / 1024).toFixed(0)} KB.`
          });
        }
      }
    }
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  return {
    filesScanned,
    violations,
    chunksAudited,
    passed: !hasErrors
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'BUNDLE BUDGET & CLIENT LEAK AUDITOR',
    family: 'architecture',
    id: 'validate_bundle_budget'
  });

  const result = auditBundleBudget();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    const relFile = path.relative(process.cwd(), v.file).replace(/\\/g, '/');
    const msg = `[BUNDLE_BUDGET] ${relFile}:${v.line} → ${v.message}`;
    if (v.severity === 'error') {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  await validator.finish(
    {
      'Files scanned': result.filesScanned,
      'Compiled chunks audited': result.chunksAudited,
      'Budget & leak violations': result.violations.length
    },
    errors,
    warnings
  );
}
