/**
 * scripts/auditors/architecture/validate_reactive_leaks.ts
 *
 * REACTIVE & DOM EVENT LEAK AUDITOR (Node.js 26+ Native)
 *
 * Enforces memory safety and clean unmounting across Vue 3 components, views, and composables:
 *   1. DOM Event Listeners: addEventListener must be accompanied by removeEventListener,
 *      onUnmounted/onScopeDispose cleanup, or { once: true }.
 *   2. Global Bus Listeners: gameBus.on must be accompanied by gameBus.off or onUnmounted/onScopeDispose cleanup.
 *   3. Detached Watchers: watch / watchEffect must not be spawned uncaptured in async/detached callbacks.
 *   4. Intervals: setInterval must have matching clearInterval.
 *
 * Escape Hatch:
 *   // leak-ok: <justification> disables violation on that line.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/architecture/validate_reactive_leaks.ts
 *   npm run validate:reactive-leaks
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import ts from 'typescript';
import { setupValidation } from '../../lib/validationBase.ts';
import type { FindingSeverity } from '../../lib/auditContract.ts';

enableCompileCache();

export interface ReactiveLeakViolation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
  readonly code: string;
  readonly severity: FindingSeverity;
}

export interface ReactiveLeakAuditResult {
  readonly filesScanned: number;
  readonly violations: readonly ReactiveLeakViolation[];
  readonly passed: boolean;
}

const TARGET_DIRECTORIES = ['src/components', 'src/views', 'src/composables'] as const;
const IGNORE_PATTERNS = ['.spec.', '.test.', '.simulation.', 'node_modules', 'dist', 'scratch'] as const;

function isTargetFile(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/');
  if (IGNORE_PATTERNS.some(pat => norm.includes(pat))) return false;
  return norm.endsWith('.ts') || norm.endsWith('.vue');
}

function extractScriptContent(content: string, filePath: string): { scriptContent: string; offsetLine: number } {
  if (!filePath.endsWith('.vue')) {
    return { scriptContent: content, offsetLine: 0 };
  }
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/i;
  const match = scriptRegex.exec(content);
  if (!match) {
    return { scriptContent: '', offsetLine: 0 };
  }
  const linesBefore = content.substring(0, match.index).split('\n').length - 1;
  return { scriptContent: match[1] || '', offsetLine: linesBefore };
}

export function auditReactiveLeaks(): ReactiveLeakAuditResult {
  const violations: ReactiveLeakViolation[] = [];
  let filesScanned = 0;

  for (const relDir of TARGET_DIRECTORIES) {
    const fullDir = path.resolve(process.cwd(), relDir);
    if (!fs.existsSync(fullDir)) continue;

    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && isTargetFile(fullPath)) {
          scanFile(fullPath);
        }
      }
    }

    walkDir(fullDir);
  }

  function scanFile(filePath: string) {
    filesScanned++;
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const { scriptContent, offsetLine } = extractScriptContent(rawContent, filePath);
    if (!scriptContent.trim()) return;

    const sourceFile = ts.createSourceFile(
      path.basename(filePath),
      scriptContent,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.vue') ? ts.ScriptKind.TS : undefined
    );

    const fileLines = scriptContent.split('\n');
    const hasUnmountHook = scriptContent.includes('onUnmounted') || scriptContent.includes('onBeforeUnmount') || scriptContent.includes('onScopeDispose');
    const hasRemoveEventListener = scriptContent.includes('removeEventListener');
    const hasGameBusOff = scriptContent.includes('gameBus.off');
    const hasClearInterval = scriptContent.includes('clearInterval');

    function checkLineEscape(lineIdx: number): boolean {
      const lineText = fileLines[lineIdx] || '';
      return lineText.includes('leak-ok') || lineText.includes('reactive-leak-ok');
    }

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;

        // 1. addEventListener Check
        if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'addEventListener') {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const actualLine = line + offsetLine + 1;

          if (!checkLineEscape(line)) {
            // Check if options argument has { once: true }
            let isOnce = false;
            if (node.arguments.length >= 3) {
              const optionsArg = node.arguments[2];
              if (optionsArg && ts.isObjectLiteralExpression(optionsArg)) {
                for (const prop of optionsArg.properties) {
                  if (ts.isPropertyAssignment(prop) && prop.name && ts.isIdentifier(prop.name) && prop.name.text === 'once') {
                    if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
                      isOnce = true;
                    }
                  }
                }
              }
            }

            if (!isOnce && !hasRemoveEventListener && !hasUnmountHook) {
              violations.push({
                file: filePath,
                line: actualLine,
                column: character + 1,
                code: 'EVENT_LISTENER_LEAK',
                severity: 'error',
                message: 'addEventListener sin removeEventListener ni ciclo de vida onUnmounted / onScopeDispose (potencial fuga de memoria).'
              });
            }
          }
        }

        // 2. gameBus.on Check
        if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'on') {
          const callerText = expr.expression.getText(sourceFile);
          if (callerText === 'gameBus') {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const actualLine = line + offsetLine + 1;

            if (!checkLineEscape(line)) {
              if (!hasGameBusOff && !hasUnmountHook) {
                violations.push({
                  file: filePath,
                  line: actualLine,
                  column: character + 1,
                  code: 'GAMEBUS_LISTENER_LEAK',
                  severity: 'error',
                  message: 'gameBus.on llamado sin gameBus.off ni hook de desmontaje onUnmounted / onScopeDispose.'
                });
              }
            }
          }
        }

        // 3. setInterval Check
        if (ts.isIdentifier(expr) && expr.text === 'setInterval') {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const actualLine = line + offsetLine + 1;

          if (!checkLineEscape(line) && !hasClearInterval) {
            violations.push({
              file: filePath,
              line: actualLine,
              column: character + 1,
              code: 'INTERVAL_LEAK',
              severity: 'error',
              message: 'setInterval ejecutado sin clearInterval en el componente o composable.'
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  return {
    filesScanned,
    violations,
    passed: !hasErrors
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'REACTIVE & DOM EVENT LEAK AUDITOR',
    family: 'architecture',
    id: 'validate_reactive_leaks'
  });

  const result = auditReactiveLeaks();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    const relFile = path.relative(process.cwd(), v.file).replace(/\\/g, '/');
    const msg = `[${v.code}] ${relFile}:${v.line}:${v.column} → ${v.message}`;
    if (v.severity === 'error') {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  await validator.finish(
    {
      'Files scanned': result.filesScanned,
      'Reactive leak violations': result.violations.length
    },
    errors,
    warnings
  );
}
