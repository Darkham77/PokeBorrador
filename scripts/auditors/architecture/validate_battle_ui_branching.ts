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
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/architecture/validate_battle_ui_branching.ts
 *   npm run validate:battle-ui
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

export interface BattleUiBranchingViolation {
  readonly file: string;
  readonly line: number;
  readonly directive: string;
  readonly expression: string;
  readonly message: string;
}

export interface BattleUiBranchingResult {
  readonly filesScanned: number;
  readonly templatesAudited: number;
  readonly violations: readonly BattleUiBranchingViolation[];
  readonly passed: boolean;
}

const TARGET_DIR = 'src/components/battle';
const IGNORE_PATTERNS = ['.spec.', '.test.', '.simulation.', 'node_modules'] as const;

// Directives to inspect for control branching
const DIRECTIVE_REGEX = /(?:^|\s)(v-if|v-else-if|v-show|:disabled|v-bind:disabled)="([^"]*)"/g;

// Prohibited raw state flags in combat action/control templates
const FORBIDDEN_STATE_PATTERNS = [
  {
    regex: /\bcannotEscape\b/,
    message: "Queda ESTRICTAMENTE PROHIBIDO usar 'cannotEscape' en la UI de combate para deshabilitar o esconder botones. El botón Huir solo se debe bloquear contra entrenadores/PvP y estar SIEMPRE habilitado contra salvajes a través de 'uiConfig.allowFlee'."
  },
  {
    regex: /\b(?:battleStore\.|state\.)?(?:isTrainer|isGym|isPvP|isWild)\b/,
    message: "Queda PROHIBIDO ramificar botones de combate usando flags primitivos (isTrainer, isGym, isPvP, isWild) directamente. Usa la configuración declarativa centralizada 'battleStore.uiConfig' (allowFlee, allowItems, etc.)."
  }
];

function hasSuppression(lines: string[], lineIndex: number): boolean {
  const currentLine = lines[lineIndex] || '';
  const prevLine = lineIndex > 0 ? (lines[lineIndex - 1] || '') : '';
  const suppressionRegex = /<!--\s*ui-branching-ok:\s*\S+.*-->/i;
  return suppressionRegex.test(currentLine) || suppressionRegex.test(prevLine);
}

export function auditBattleUiBranching(): BattleUiBranchingResult {
  const violations: BattleUiBranchingViolation[] = [];
  let filesScanned = 0;
  let templatesAudited = 0;

  const targetPath = path.resolve(process.cwd(), TARGET_DIR);
  if (!fs.existsSync(targetPath)) {
    return { filesScanned: 0, templatesAudited: 0, violations: [], passed: true };
  }

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDir(full);
        }
      } else if (entry.isFile() && entry.name.endsWith('.vue') && !IGNORE_PATTERNS.some(p => full.includes(p))) {
        auditVueFile(full);
      }
    }
  }

  function auditVueFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    filesScanned++;

    const templateMatch = /<template>([\s\S]*?)<\/template>/i.exec(content);
    if (!templateMatch) return;
    templatesAudited++;

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
          if (!hasSuppression(fullLines, lineInFull - 1)) {
            violations.push({
              file: path.resolve(process.cwd(), filePath),
              line: lineInFull,
              directive,
              expression,
              message: pattern.message
            });
          }
        }
      }
    }
  }

  scanDir(targetPath);

  return {
    filesScanned,
    templatesAudited,
    violations,
    passed: violations.length === 0
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'BATTLE ARENA UI CONFIG BRANCHING AUDITOR',
    family: 'architecture',
    id: 'validate_battle_ui_branching'
  });

  const result = auditBattleUiBranching();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    errors.push(`[UI_BRANCHING] ${v.file}:${v.line} [${v.directive}="${v.expression}"] → ${v.message}`);
  }

  await validator.finish(
    {
      'Battle files scanned': result.filesScanned,
      'Templates audited': result.templatesAudited,
      'Direct state branching violations': result.violations.length
    },
    errors,
    warnings
  );
}
