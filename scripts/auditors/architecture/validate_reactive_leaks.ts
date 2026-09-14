/**
 * scripts/auditors/architecture/validate_reactive_leaks.ts
 *
 * REACTIVE & DOM EVENT LEAK AUDITOR (Node.js 26+ Native)
 *
 * Enforces strict memory leak prevention and listener hygiene across Vue components and composables:
 *   1. Event Listeners: Every window/document/element.addEventListener must either have { once: true },
 *      an explicit removeEventListener, or an unmount lifecycle hook (onUnmounted, onBeforeUnmount, onScopeDispose).
 *   2. Event Bus: Every gameBus.on must have a corresponding gameBus.off or unmount lifecycle hook.
 *   3. Native Timers: Every setInterval must have a clearInterval (though setInterval in src/ is prohibited).
 *
 * Escape Hatch:
 *   // leak-ok: <justification> or // reactive-leak-ok: <justification>
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/architecture/validate_reactive_leaks.ts
 *   npm run validate:reactive-leaks
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import ts from 'typescript';
import { BaseAuditor, FileScanAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type ReactiveLeakRuleId =
  | 'dom-event-leak'
  | 'gamebus-leak'
  | 'interval-leak';

export const REACTIVE_LEAK_RULES: readonly ReactiveLeakRuleId[] = [
  'dom-event-leak',
  'gamebus-leak',
  'interval-leak'
] as const;

export class ReactiveLeaksAuditor extends FileScanAuditor<ReactiveLeakRuleId> {
  constructor(roots: readonly string[] = ['src/components', 'src/views', 'src/composables']) {
    super({
      id: 'validate_reactive_leaks',
      name: 'Reactive & DOM Event Leak Auditor',
      description: 'Detecta posibles fugas de memoria y listeners sin limpiar',
      family: 'architecture',
      ruleIds: REACTIVE_LEAK_RULES,
      ruleDescriptions: {
        'dom-event-leak': 'addEventListener sin desregistro ni hook de desmontaje',
        'gamebus-leak': 'gameBus.on sin desregistro ni hook de ciclo de vida',
        'interval-leak': 'setInterval ejecutado sin clearInterval en el componente'
      },
      roots,
      allowedExtensions: new Set(['.ts', '.vue'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    const { scriptContent, offsetLine } = this.extractScript(content, relPath);
    if (!scriptContent.trim()) return;

    const sourceFile = ts.createSourceFile(
      path.basename(relPath),
      scriptContent,
      ts.ScriptTarget.Latest,
      true,
      relPath.endsWith('.vue') ? ts.ScriptKind.TS : undefined
    );

    const fileLines = scriptContent.split('\n');
    const hasUnmountHook = scriptContent.includes('onUnmounted') || scriptContent.includes('onBeforeUnmount') || scriptContent.includes('onScopeDispose');
    const hasRemoveEventListener = scriptContent.includes('removeEventListener');
    const hasGameBusOff = scriptContent.includes('gameBus.off');
    const hasClearInterval = scriptContent.includes('clearInterval');

    const checkLineEscape = (lineIdx: number): boolean => {
      const lineText = fileLines[lineIdx] || '';
      return lineText.includes('leak-ok') || lineText.includes('reactive-leak-ok');
    };

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const expr = node.expression;

        // 1. addEventListener Check
        if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'addEventListener') {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const actualLine = line + offsetLine + 1;

          if (!checkLineEscape(line)) {
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
              this.addViolation({
                ruleId: 'dom-event-leak',
                severity: 'error',
                file: relPath,
                line: actualLine,
                message: 'addEventListener sin removeEventListener ni ciclo de vida onUnmounted / onScopeDispose (potencial fuga de memoria).',
                context: node.getText(sourceFile)
              });
            }
          }
        }

        // 2. gameBus.on Check
        if (ts.isPropertyAccessExpression(expr) && expr.name.text === 'on') {
          const callerText = expr.expression.getText(sourceFile);
          if (callerText === 'gameBus') {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const actualLine = line + offsetLine + 1;

            if (!checkLineEscape(line)) {
              if (!hasGameBusOff && !hasUnmountHook) {
                this.addViolation({
                  ruleId: 'gamebus-leak',
                  severity: 'error',
                  file: relPath,
                  line: actualLine,
                  message: 'gameBus.on llamado sin gameBus.off ni hook de desmontaje onUnmounted / onScopeDispose.',
                  context: node.getText(sourceFile)
                });
              }
            }
          }
        }

        // 3. setInterval Check
        if (ts.isIdentifier(expr) && expr.text === 'setInterval') {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const actualLine = line + offsetLine + 1;

          if (!checkLineEscape(line) && !hasClearInterval) {
            this.addViolation({
              ruleId: 'interval-leak',
              severity: 'error',
              file: relPath,
              line: actualLine,
              message: 'setInterval ejecutado sin clearInterval en el componente o composable.',
              context: node.getText(sourceFile)
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private extractScript(content: string, filePath: string): { scriptContent: string; offsetLine: number } {
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
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ReactiveLeaksAuditor());
}
