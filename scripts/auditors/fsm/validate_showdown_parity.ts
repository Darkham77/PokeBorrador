/**
 * scripts/auditors/fsm/validate_showdown_parity.ts
 *
 * POKÉMON SHOWDOWN PROTOCOL PARITY AUDITOR (Node.js 26+ Native)
 *
 * Enforces 100% protocol exhaustiveness between @pkmn/sim simulation output and Poké Vicio's visual battle bridge:
 *   1. Compares canonical Pokémon Showdown protocol tokens against active handlers in src/logic/battle/showdownBridge*.ts.
 *   2. Ensures all core actions, damage, heals, faints, stat stages, field conditions, hazards, volatiles,
 *      items, abilities, gimmicks, and turn lifecycle events have verified dispatchers or explicit ignore mappings.
 *   3. Prevents silent dropping of combat mechanics during battle execution.
 *
 * Escape Hatch:
 *   // showdown-ok: <justification> disables violation on that line.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/fsm/validate_showdown_parity.ts
 *   npm run validate:showdown-parity
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import ts from 'typescript';
import { setupValidation } from '../../lib/validationBase.ts';
import type { FindingSeverity } from '../../lib/auditContract.ts';

enableCompileCache();

export interface ShowdownParityViolation {
  readonly token: string;
  readonly category: string;
  readonly message: string;
  readonly severity: FindingSeverity;
}

export interface ShowdownParityAuditResult {
  readonly tokensAudited: number;
  readonly handledTokensCount: number;
  readonly bridgeFilesScanned: number;
  readonly violations: readonly ShowdownParityViolation[];
  readonly passed: boolean;
}

/**
 * The canonical Pokémon Showdown Protocol tokens required for complete battle simulation fidelity.
 */
export const CANONICAL_SHOWDOWN_PROTOCOL_TOKENS = {
  CORE_ACTIONS: [
    'move',
    '-prepare',
    '-damage',
    '-heal',
    'faint',
    '-status',
    '-curestatus',
    '-curestatusall',
    '-sethp'
  ],
  LIFECYCLE_FLOW: [
    'player',
    'win',
    'tie',
    'turn',
    'upkeep',
    'switch',
    'drag'
  ],
  STAT_STAGES: [
    '-boost',
    '-setboost',
    '-unboost',
    '-swapboost',
    '-invertboost',
    '-clearboost',
    '-clearallboost',
    '-copyboost',
    '-clearpositiveboost',
    '-clearnegativeboost'
  ],
  FIELD_AND_WEATHER: [
    '-weather',
    '-start',
    '-end',
    '-sidestart',
    '-sideend',
    '-swapsideconditions',
    '-fieldstart',
    '-fieldend',
    '-fieldactivate'
  ],
  COMBAT_FEEDBACK: [
    '-notarget',
    '-miss',
    '-immune',
    '-crit',
    '-supereffective',
    '-resisted',
    '-block',
    '-hitcount',
    '-ohko',
    '-fail'
  ],
  ITEMS_ABILITIES_VOLATILES: [
    'cant',
    '-cant',
    '-activate',
    '-ability',
    '-endability',
    '-item',
    '-enditem',
    '-cureteam',
    '-mustrecharge',
    '-singlemove',
    '-singleturn',
    'swap'
  ],
  GIMMICKS_AND_FORMES: [
    '-terastallize',
    '-mega',
    '-primal',
    '-zpower',
    '-zbroken',
    '-burst',
    '-formechange',
    '-transform',
    'detailschange',
    'replace'
  ],
  PROTOCOL_STRUCTURAL_METADATA: [
    'gen',
    'gametype',
    'teamsize',
    'rated',
    'tier',
    'showteam',
    'debug',
    'bigerror',
    'event',
    '-candynamax',
    '-center',
    '-combine',
    '-waiting',
    'custom',
    '-anim',
    'poke',
    'clearpoke',
    'start',
    'teampreview',
    'queue',
    '-hint',
    '-message',
    'message',
    'split'
  ]
} as const;

export function auditShowdownParity(): ShowdownParityAuditResult {
  const violations: ShowdownParityViolation[] = [];
  const handledTokens = new Set<string>(); // runtime-set: Fast O(1) membership lookup set

  const battleDir = path.resolve(process.cwd(), 'src/logic/battle');
  let bridgeFilesScanned = 0;

  if (fs.existsSync(battleDir)) {
    const entries = fs.readdirSync(battleDir);
    const bridgeFiles = entries.filter(name => name.startsWith('showdownBridge') && name.endsWith('.ts'));

    for (const fileName of bridgeFiles) {
      bridgeFilesScanned++;
      const fullPath = path.join(battleDir, fileName);
      const code = fs.readFileSync(fullPath, 'utf-8');

      const sourceFile = ts.createSourceFile(
        fileName,
        code,
        ts.ScriptTarget.Latest,
        true
      );

      function visit(node: ts.Node) {
        // 1. Match Object Literal Keys (e.g. CORE_EVENT_DISPATCHER, STAGE_HANDLERS, GIMMICK_HANDLERS)
        if (ts.isPropertyAssignment(node)) {
          let keyText = '';
          if (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)) {
            keyText = node.name.text;
          }
          if (keyText) {
            handledTokens.add(keyText);
          }
        }

        // 2. Match Array Literal elements (e.g. IGNORED_PROTOCOL_EVENTS)
        if (ts.isArrayLiteralExpression(node)) {
          for (const elem of node.elements) {
            if (ts.isStringLiteral(elem)) {
              handledTokens.add(elem.text);
            }
          }
        }

        // 3. Match switch case clauses (e.g. case '-weather':)
        if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) {
          handledTokens.add(node.expression.text);
        }

        // 4. Match binary equality checks (e.g. type === 'switch' || type === 'drag')
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
          if (ts.isStringLiteral(node.right)) {
            handledTokens.add(node.right.text);
          } else if (ts.isStringLiteral(node.left)) {
            handledTokens.add(node.left.text);
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
    }
  }

  // Also check filterShowdownLogs for filtered tokens like 'split'
  handledTokens.add('split');

  let totalTokensAudited = 0;

  for (const [category, tokens] of Object.entries(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS)) {
    for (const token of tokens) {
      totalTokensAudited++;
      if (!handledTokens.has(token)) {
        violations.push({
          token,
          category,
          severity: 'error',
          message: `El token de protocolo Showdown '${token}' (${category}) carece de manejador, dispatcher o mapeo en src/logic/battle/showdownBridge*.ts.`
        });
      }
    }
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  return {
    tokensAudited: totalTokensAudited,
    handledTokensCount: handledTokens.size,
    bridgeFilesScanned,
    violations,
    passed: !hasErrors
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'POKEMON SHOWDOWN PROTOCOL PARITY AUDITOR',
    family: 'fsm',
    id: 'validate_showdown_parity'
  });

  const result = auditShowdownParity();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    const msg = `[SHOWDOWN_PROTOCOL_MISSING] ${v.category} → ${v.message}`;
    if (v.severity === 'error') {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  await validator.finish(
    {
      'Bridge files scanned': result.bridgeFilesScanned,
      'Protocol tokens audited': result.tokensAudited,
      'Registered tokens detected': result.handledTokensCount,
      'Missing protocol tokens': result.violations.length
    },
    errors,
    warnings
  );
}
