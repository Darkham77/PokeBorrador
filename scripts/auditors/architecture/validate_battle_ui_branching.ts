/**
 * scripts/auditors/architecture/validate_battle_ui_branching.ts
 *
 * BATTLE ARENA UI CONFIG BRANCHING AUDITOR (Node.js 26+ Native)
 *
 * Enforces declarative UI configuration across battle components in src/components/battle/:
 *   1. Prohibits direct inspection of raw combat flags (cannotEscape, state.isTrainer,
 *      state.isGym, state.isPvP, battleStore.isTrainer) in template directives (:disabled, v-if, v-show).
 *   2. Enforces checking battleStore.uiConfig (uiConfig.allowFlee, uiConfig.allowItems, etc.)
 *      for enabling or disabling combat actions, guaranteeing canonical session strategy polymorphism.
 *
 * Escape Hatch:
 *   <!-- ui-branching-ok: <justification> --> disables the check on that line or block.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/architecture/validate_battle_ui_branching.ts
 *   npm run validate:battle-ui
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, FileScanAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type BattleUiBranchingRuleId =
  | 'ui-branching-raw-flag'
  | 'ui-branching-escape';

export const BATTLE_UI_BRANCHING_RULES: readonly BattleUiBranchingRuleId[] = [
  'ui-branching-raw-flag',
  'ui-branching-escape'
] as const;

const DIRECTIVE_REGEX = /(?:^|\s)(v-if|v-else-if|v-show|:disabled|v-bind:disabled)="([^"]*)"/g;

const FORBIDDEN_STATE_PATTERNS = [
  {
    ruleId: 'ui-branching-escape' as const,
    regex: /\bcannotEscape\b/,
    message: "Queda ESTRICTAMENTE PROHIBIDO usar 'cannotEscape' en la UI de combate para deshabilitar o esconder botones. El botón Huir solo se debe bloquear contra entrenadores/PvP y estar SIEMPRE habilitado contra salvajes a través de 'uiConfig.allowFlee'."
  },
  {
    ruleId: 'ui-branching-raw-flag' as const,
    regex: /\b(?:battleStore\.|state\.)?(?:isTrainer|isGym|isPvP|isWild)\b/,
    message: "Queda PROHIBIDO ramificar botones de combate usando flags primitivos (isTrainer, isGym, isPvP, isWild) directamente. Usa la configuración declarativa centralizada 'battleStore.uiConfig' (allowFlee, allowItems, etc.)."
  }
] as const;

export class BattleUiBranchingAuditor extends FileScanAuditor<BattleUiBranchingRuleId> {
  constructor(roots: readonly string[] = ['src/components/battle']) {
    super({
      id: 'validate_battle_ui_branching',
      name: 'Battle Arena UI Config Branching Auditor',
      description: 'Valida uso de uiConfig declarativo en UI de combate',
      family: 'architecture',
      ruleIds: BATTLE_UI_BRANCHING_RULES,
      ruleDescriptions: {
        'ui-branching-raw-flag': 'Ramificación de botones de combate mediante flags primitivos',
        'ui-branching-escape': 'Uso de cannotEscape para condicionar la UI de combate'
      },
      roots,
      allowedExtensions: new Set(['.vue'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    const templateMatch = /<template>([\s\S]*?)<\/template>/i.exec(content);
    if (!templateMatch) return;

    const templateContent = templateMatch[1] || '';
    const templateStartIndex = templateMatch.index;
    const fullLines = content.split('\n');

    let match: RegExpExecArray | null;
    const directiveRegex = new RegExp(DIRECTIVE_REGEX.source, 'g');

    while ((match = directiveRegex.exec(templateContent)) !== null) {
      const directive = match[1] || '';
      const expression = match[2] || '';

      // Skip expressions already consuming uiConfig
      if (expression.includes('uiConfig.')) continue;

      for (const pattern of FORBIDDEN_STATE_PATTERNS) {
        if (pattern.regex.test(expression)) {
          const matchOffsetInTemplate = match.index;
          const matchOffsetInFull = templateStartIndex + matchOffsetInTemplate;
          const lineInFull = content.substring(0, matchOffsetInFull).split('\n').length;

          // Check for suppression
          if (!this.hasSuppression(fullLines, lineInFull - 1)) {
            this.addViolation({
              ruleId: pattern.ruleId,
              severity: 'error',
              file: relPath,
              line: lineInFull,
              message: `[${directive}="${expression}"] ${pattern.message}`,
              context: expression
            });
          }
        }
      }
    }
  }

  private hasSuppression(lines: readonly string[], lineIndex: number): boolean {
    const currentLine = lines[lineIndex] || '';
    const prevLine = lineIndex > 0 ? (lines[lineIndex - 1] || '') : '';
    const suppressionRegex = /<!--\s*ui-branching-ok:\s*\S+.*-->/i;
    return suppressionRegex.test(currentLine) || suppressionRegex.test(prevLine);
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new BattleUiBranchingAuditor());
}
