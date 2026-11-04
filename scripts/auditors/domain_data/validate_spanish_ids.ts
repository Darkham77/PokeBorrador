import fs from 'node:fs';
/**
 * scripts/auditors/domain_data/validate_spanish_ids.ts
 *
 * SPANISH LOGIC STRINGS & LEAKS AUDITOR (Node.js 26+ Native)
 * Scans code files for potential hardcoded Spanish names used as logic IDs.
 */
import { enableCompileCache } from 'node:module';

import type { DisplayText, FileScanRootsOptions } from '@francogp/auditor';
import {
  BaseAuditor,
  FileScanAuditor,
  createRuleCapabilities,
  resolveFileScanRoots
} from '@francogp/auditor';

enableCompileCache();

// Load translation names
const abilitiesJson = JSON.parse(
  fs.readFileSync('src/data/battle/abilities.json', 'utf-8')
) as Record<DisplayText, { name?: string }>;
const movesJson = JSON.parse(fs.readFileSync('src/data/battle/moves.json', 'utf-8')) as Record<
  DisplayText,
  { name?: string }
>;
const itemsJson = JSON.parse(fs.readFileSync('src/data/inventory/items.json', 'utf-8')) as {
  SHOP_ITEMS?: Array<{ name?: string }>;
};

const spanishNames = new Set<string>();

const addName = (name?: string): void => {
  if (name && name.trim()) {
    spanishNames.add(name.trim().toLowerCase());
  }
};

Object.values(abilitiesJson).forEach((a) => addName(a.name));
Object.values(movesJson).forEach((m) => addName(m.name));
if (itemsJson.SHOP_ITEMS) {
  itemsJson.SHOP_ITEMS.forEach((i) => addName(i.name));
}

const natureNames = [
  'Firme',
  'Tímido',
  'Osado',
  'Audaz',
  'Sereno',
  'Cauto',
  'Dócil',
  'Amable',
  'Fuerte',
  'Activa',
  'Agitada',
  'Alegre',
  'Floja',
  'Huraña',
  'Afable',
  'Modesta',
  'Ingenua',
  'Pícara',
  'Mansa',
  'Rara',
  'Alocada',
  'Plácida',
  'Grosera',
  'Seria',
  'Miedosa'
];
natureNames.forEach(addName);

export type SpanishIdRuleId = 'spanish-logic-id';

export const SPANISH_ID_RULES: readonly SpanishIdRuleId[] = ['spanish-logic-id'] as const;

export class SpanishIdAuditor extends FileScanAuditor<SpanishIdRuleId> {
  private readonly criticalPatterns: readonly RegExp[];

  public constructor(options: FileScanRootsOptions = {}) {
    const defaultRoots = [
      'src/logic',
      'src/stores',
      'src/composables',
      'src/components',
      'src/views',
      'database'
    ];
    const { effectiveRoot, targetRoots } = resolveFileScanRoots(options, defaultRoots);

    super({
      projectRoot: effectiveRoot,
      roots: targetRoots,
      ruleCapabilities: createRuleCapabilities(SPANISH_ID_RULES, {
        speed: 'light',
        phase: 'normal',
        md: false,
        ast: false,
        changedOnly: false,
        critical: false
      }),
      ruleFixers: {},
      id: 'validate_spanish_ids',
      configKey: 'domain.spanishIds',
      defaultConfig: {
        enabled: true
      },
      criticalConfig: {},
      name: 'Spanish Logic Strings & Leaks Auditor',
      description: 'Garantiza IDs en inglés y traducciones en español',
      icon: '🇪🇸',
      family: 'domain_data',
      ruleIds: SPANISH_ID_RULES,
      packageName: 'Dominio',
      usesThirdPartyTool: false,
      requiredPermissions: [],
      ruleDescriptions: {
        'spanish-logic-id': 'ID en español en vez del inglés'
      },
      ruleRemediations: {
        'spanish-logic-id':
          'Use English canonical IDs in code logic, keeping Spanish text strictly for UI display'
      },
      remediationPhase: 'contracts',
      allowedExtensions: new Set(['.ts', '.vue'])
    });

    this.criticalPatterns = [
      // Nature assignments: nature: 'Serio' / 'Firme'
      /\bnature\s*:\s*['"]([A-Za-zñÑáéíóúÁÉÍÓÚ]+)['"]/g,
      // Direct domain helper calls with Spanish literal: getMoveData('Mordisco')
      /\b(?:getMoveData|getItemById|toNatureId|requirePokemonSpeciesId|requirePokemonMoveId|requireItemId)\s*\(\s*['"]([^'"`]+)['"]\s*\)/g,
      // Inventory lookups by Spanish name or legacy keys: inventory['Poción'] or inventory['move_relearner']
      /\binventory\s*\[\s*['"]([^'"`]+)['"]\s*\]/g,
      // Logic comparisons: === 'Serio' or == 'Poción'
      /[!=]==?\s*['"]([A-Za-zñÑáéíóúÁÉÍÓÚ\s]+)['"]/g
    ];
  }

  protected override scanFile(relPath: string, content: string): void {
    this.runSubAuditorSync('spanish-logic-id', () => {
      const lines = content.split('\n');

      for (let index = 0; index < lines.length; index++) {
        const lineText = lines[index]!;
        if (/\/\/\s*(?:spanish-ok|text-ok)\b/.test(lineText)) continue;

        for (const pattern of this.criticalPatterns) {
          pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(lineText)) !== null) {
            const word = match[1]?.trim().toLowerCase();
            if (!word || (!spanishNames.has(word) && word !== 'move_relearner')) {
              continue;
            }
            if (
              lineText.includes('toThrow') ||
              lineText.includes('expect(') ||
              lineText.includes('name:') ||
              lineText.includes('MOVE_TRANSLATIONS_ES') ||
              lineText.includes('ABILITY_TRANSLATIONS_ES')
            ) {
              continue;
            }

            this.addViolation({
              ruleId: 'spanish-logic-id',
              severity: 'error',
              file: relPath,
              line: index + 1,
              message: `Uso de nombre en español en contexto de lógica: '${match[1]}'`,
              context: lineText.trim()
            });
          }
        }
      }
    });
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
await BaseAuditor.runCliIfMain(import.meta.url, new SpanishIdAuditor());
