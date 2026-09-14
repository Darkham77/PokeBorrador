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
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/fsm/validate_showdown_parity.ts
 *   npm run validate:showdown-parity
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import ts from 'typescript';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type ShowdownParityRuleId = 'missing-protocol-token';

export const SHOWDOWN_PARITY_RULES: readonly ShowdownParityRuleId[] = [
  'missing-protocol-token'
] as const;

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

export class ShowdownParityAuditor extends BaseAuditor<ShowdownParityRuleId> {
  constructor() {
    super({
      id: 'validate_showdown_parity',
      name: 'Pokemon Showdown Protocol Parity Auditor',
      description: 'Verifica paridad del protocolo Pokémon Showdown',
      family: 'fsm',
      ruleIds: SHOWDOWN_PARITY_RULES,
      ruleDescriptions: {
        'missing-protocol-token': 'Token de protocolo Showdown sin manejador ni dispatcher'
      }
    });
  }

  public override async runAudit(): Promise<void> {
    const battleFiles = await this.context.collectFiles(['src/logic/battle'], new Set(['.ts']));
    const bridgeFiles = battleFiles.filter(f => {
      const base = path.basename(f);
      return base.startsWith('showdownBridge') && base.endsWith('.ts');
    });

    const handledTokens = new Set<string>();

    this.context.logStep(1, 2, `Parsing handlers in ${bridgeFiles.length} showdownBridge files...`);

    for (const relPath of bridgeFiles) {
      this.filesScannedCount++;
      const fullPath = path.resolve(this.projectRoot, relPath);
      const code = fs.readFileSync(fullPath, 'utf-8');

      const sourceFile = ts.createSourceFile(
        path.basename(relPath),
        code,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        // 1. Match Object Literal Keys (CORE_EVENT_DISPATCHER, etc.)
        if (ts.isPropertyAssignment(node)) {
          let keyText = '';
          if (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name)) {
            keyText = node.name.text;
          }
          if (keyText) {
            handledTokens.add(keyText);
          }
        }

        // 2. Match Array Literal elements (IGNORED_PROTOCOL_EVENTS)
        if (ts.isArrayLiteralExpression(node)) {
          for (const elem of node.elements) {
            if (ts.isStringLiteral(elem)) {
              handledTokens.add(elem.text);
            }
          }
        }

        // 3. Match switch case clauses (case '-weather':)
        if (ts.isCaseClause(node) && ts.isStringLiteral(node.expression)) {
          handledTokens.add(node.expression.text);
        }

        // 4. Match binary equality checks (type === 'switch')
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
          if (ts.isStringLiteral(node.right)) {
            handledTokens.add(node.right.text);
          } else if (ts.isStringLiteral(node.left)) {
            handledTokens.add(node.left.text);
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    // Filtered tokens like 'split'
    handledTokens.add('split');

    this.context.logStep(2, 2, 'Checking canonical protocol token coverage...');

    let totalTokensAudited = 0;
    for (const [category, tokens] of Object.entries(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS)) {
      for (const token of tokens) {
        totalTokensAudited++;
        if (!handledTokens.has(token)) {
          this.addViolation({
            ruleId: 'missing-protocol-token',
            severity: 'error',
            file: bridgeFiles[0] || 'src/logic/battle/showdownBridge.ts',
            line: 1,
            message: `El token de protocolo Showdown '${token}' (${category}) carece de manejador, dispatcher o mapeo en src/logic/battle/showdownBridge*.ts.`,
            context: token
          });
        }
      }
    }

    this.context.setMetric('Bridge Files Scanned', this.filesScannedCount);
    this.context.setMetric('Tokens Audited', totalTokensAudited);
    this.context.setMetric('Tokens Registered', handledTokens.size);
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ShowdownParityAuditor());
}
