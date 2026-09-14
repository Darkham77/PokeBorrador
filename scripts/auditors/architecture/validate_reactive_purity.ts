/**
 * scripts/auditors/architecture/validate_reactive_purity.ts
 *
 * REACTIVE COMPUTED PURITY AUDITOR (Node.js 26+ Native)
 *
 * Enforces pure getters in Vue 3 / Pinia computed properties across src/stores/ and src/composables/:
 *   1. Prohibits state mutation (.value =, state.x =, this.x =) inside computed callbacks.
 *   2. Prohibits persistence or side-effect calls (.scheduleSave(), .save(), .persist(), etc.) inside computed.
 *
 * Escape Hatch:
 *   // purity-ok: <justification> disables the violation on the specific line.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/architecture/validate_reactive_purity.ts
 *   npm run validate:reactive-purity
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import ts from 'typescript';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

export interface ReactivePurityViolation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly message: string;
  readonly context: string;
}

export interface ReactivePurityResult {
  readonly filesScanned: number;
  readonly computedsAudited: number;
  readonly violations: readonly ReactivePurityViolation[];
  readonly passed: boolean;
}

const TARGET_DIRECTORIES = ['src/stores', 'src/composables'] as const;
const IGNORE_PATTERNS = [
  '.spec.',
  '.test.',
  '.simulation.',
  'node_modules',
  'external',
  'dist',
  'scratch'
] as const;

const IMPURE_CALL_PATTERNS = [
  'scheduleSave',
  'scheduleLocalSave',
  '.save(',
  '.persist(',
  '.saveLocal(',
  'authStore.logout',
  'window.location'
] as const;

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

function hasPuritySuppression(content: string, lineIndex: number): boolean {
  const lines = content.split('\n');
  const targetLine = lines[lineIndex] || '';
  const prevLine = lineIndex > 0 ? (lines[lineIndex - 1] || '') : '';
  const suppressionRegex = /\/\/\s*purity-ok:\s*\S+/i;
  return suppressionRegex.test(targetLine) || suppressionRegex.test(prevLine);
}

export function auditReactivePurity(): ReactivePurityResult {
  const violations: ReactivePurityViolation[] = [];
  let filesScanned = 0;
  let computedsAudited = 0;

  function scanDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && isTargetFile(fullPath)) {
        auditSingleFile(fullPath);
      }
    }
  }

  function auditSingleFile(filePath: string) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    if (!rawContent.includes('computed')) return;

    filesScanned++;
    const { scriptContent, offsetLine } = extractScriptContent(rawContent, filePath);
    if (!scriptContent) return;

    const sf = ts.createSourceFile(filePath, scriptContent, ts.ScriptTarget.Latest, true);

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const calleeText = node.expression.getText(sf);
        if (calleeText === 'computed' && node.arguments.length > 0) {
          computedsAudited++;
          const firstArg = node.arguments[0];
          if (!firstArg) return;

          let getterBody: ts.Node | null = null;
          if (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg)) {
            getterBody = firstArg.body;
          } else if (ts.isObjectLiteralExpression(firstArg)) {
            for (const prop of firstArg.properties) {
              if (ts.isPropertyAssignment(prop) && prop.name.getText(sf) === 'get') {
                if (ts.isArrowFunction(prop.initializer) || ts.isFunctionExpression(prop.initializer)) {
                  getterBody = prop.initializer.body;
                }
              }
            }
          }

          if (getterBody) {
            inspectGetterBody(getterBody, sf, filePath, rawContent, offsetLine);
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    function inspectGetterBody(
      bodyNode: ts.Node,
      sourceFile: ts.SourceFile,
      currentFile: string,
      fullRawContent: string,
      lineOffset: number
    ) {
      function walk(child: ts.Node) {
        // Check for state mutations (=, +=, -=, etc.)
        if (ts.isBinaryExpression(child)) {
          const op = child.operatorToken.kind;
          const isAssignment = op >= ts.SyntaxKind.FirstAssignment && op <= ts.SyntaxKind.LastAssignment;
          if (isAssignment) {
            const leftText = child.left.getText(sourceFile);
            const isReactiveMutation =
              leftText.includes('.value') ||
              leftText.startsWith('state.') ||
              leftText.startsWith('this.') ||
              leftText.includes('Store.');

            if (isReactiveMutation) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile));
              const realLine = line + lineOffset + 1;
              if (!hasPuritySuppression(fullRawContent, realLine - 1)) {
                violations.push({
                  file: path.resolve(process.cwd(), currentFile),
                  line: realLine,
                  column: character + 1,
                  message: `Mutación impura dentro de 'computed()': '${child.getText(sourceFile)}'. Los computed deben ser funciones puras sin efectos secundarios sobre el estado reactivo. Usa watchers o actions para mutaciones.`,
                  context: child.getText(sourceFile)
                });
              }
            }
          }
        }

        // Check for impure side-effect calls (.scheduleSave(), etc.)
        if (ts.isCallExpression(child)) {
          const callText = child.expression.getText(sourceFile);
          const isImpureCall = IMPURE_CALL_PATTERNS.some(pat => callText.includes(pat));
          if (isImpureCall) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile));
            const realLine = line + lineOffset + 1;
            if (!hasPuritySuppression(fullRawContent, realLine - 1)) {
              violations.push({
                file: path.resolve(process.cwd(), currentFile),
                line: realLine,
                column: character + 1,
                message: `Llamada con efectos secundarios dentro de 'computed()': '${child.getText(sourceFile)}'. Queda estrictamente prohibido disparar persistencia o deslogueos dentro de un getter reactivo.`,
                context: child.getText(sourceFile)
              });
            }
          }
        }

        ts.forEachChild(child, walk);
      }

      ts.forEachChild(bodyNode, walk);
    }

    visit(sf);
  }

  for (const dir of TARGET_DIRECTORIES) {
    scanDir(path.resolve(process.cwd(), dir));
  }

  return {
    filesScanned,
    computedsAudited,
    violations,
    passed: violations.length === 0
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'REACTIVE COMPUTED PURITY AUDITOR',
    family: 'architecture',
    id: 'validate_reactive_purity'
  });

  const result = auditReactivePurity();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    errors.push(`[REACTIVE_IMPURITY] ${v.file}:${v.line}:${v.column} → ${v.message}`);
  }

  await validator.finish(
    {
      'Files scanned': result.filesScanned,
      'Computed getters audited': result.computedsAudited,
      'Impure computed violations': result.violations.length
    },
    errors,
    warnings
  );
}
