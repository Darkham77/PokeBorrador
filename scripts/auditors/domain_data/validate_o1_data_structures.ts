/**
 * scripts/auditors/domain_data/validate_o1_data_structures.ts
 * 
 * O(1) DATA STRUCTURE & LINEAR SEARCH AUDITOR (Node.js 26+ Native)
 * Scans codebase to detect anti-patterns of linear search O(N) and nested loops O(N^2)
 * where an O(1) indexed data structure (Record, ReadonlySet, Map) is available.
 *
 * Rules:
 *   1. o1-catalog-lookup: Linear scan (.find, .filter, .some, .findLast) on static catalogs
 *   2. o1-pokemon-lookup: [...team, ...box].find() or .filter() instead of gameStore.getPokemonByUid().
 *   3. o1-linear-membership: Array constant .includes() instead of ReadonlySet.has().
 *   4. o1-object-scan: Object.keys() / Object.values() linear search instead of key index.
 *   5. o1-json-clone: JSON.parse(JSON.stringify(...)) anti-pattern instead of structuredClone or factory.
 *   6. o1-redundant-spread-return: Redundant 'return [...arr]' instead of directly returning 'readonly T[]'.
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, FileScanAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

// ─── Pattern Definitions ──────────────────────────────────────────────────────

export const O1_CATALOG_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  alternative: string;
  definingFile: string;
}> = [
  {
    name: 'SHOP_ITEMS',
    pattern: /\bSHOP_ITEMS\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'ITEMS_BY_ID[itemId] or getItemById(itemIdOrName)',
    definingFile: 'src/data/inventory/items.ts'
  },
  {
    name: 'FIRE_RED_MAPS',
    pattern: /\bFIRE_RED_MAPS\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'MAPS_BY_ROUTE_ID[routeId] or getMapLocationById(routeId)',
    definingFile: 'src/data/world/maps.ts'
  },
  {
    name: 'NICK_STYLES',
    pattern: /\bNICK_STYLES\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'NICK_STYLES_BY_ID[styleId]',
    definingFile: 'src/data/player/cosmeticsData.ts'
  },
  {
    name: 'AVATAR_STYLES',
    pattern: /\bAVATAR_STYLES\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'AVATAR_STYLES_BY_ID[styleId]',
    definingFile: 'src/data/player/cosmeticsData.ts'
  },
  {
    name: 'CLASS_MISSIONS',
    pattern: /\bCLASS_MISSIONS\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'CLASS_MISSIONS_BY_ID[missionId]',
    definingFile: 'src/data/player/playerClasses.ts'
  },
  {
    name: 'RANKED_REWARD_MILESTONES',
    pattern: /\bRANKED_REWARD_MILESTONES\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'RANKED_REWARD_MILESTONES_BY_ID[milestoneId]',
    definingFile: 'src/data/system/rankedData.ts'
  },
  {
    name: 'GAME_TMS',
    pattern: /\bGAME_TMS\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'GAME_TMS_BY_ID[tmId]',
    definingFile: 'src/data/pokemon/pokedex.ts'
  },
  {
    name: 'GYMS',
    pattern: /\bGYMS\.(?:find|filter|some|findLast)\s*\(/g,
    alternative: 'GYMS_BY_ID[gymId] or getGymById(gymId)',
    definingFile: 'src/data/world/gyms.ts'
  }
];

export const P_POKEMON_SPREAD_LOOKUP = /\[\s*\.\.\.[a-zA-Z0-9_.]*(?:team|box)[^,\]]*,\s*\.\.\.[a-zA-Z0-9_.]*(?:team|box)[^\]]*\]\.(?:find|filter|some)\s*\(/g;
export const P_STATIC_ARRAY_INCLUDES = /(?:\(\s*)?\b([A-Z][A-Z0-9_]+_(?:IDS|LIST|TYPES|CATEGORIES|NAMES|KINDS|ORDER))\b(?:\s+as\s+[^)]+)?(?:\s*\))?\.(?:includes|indexOf)\s*\(/g;
export const P_OBJECT_SCAN_LOOKUP = /\bObject\.(?:keys|values|entries)\s*\([^)]+\)\.(?:find|findLast)\s*\(/g;
export const P_JSON_CLONE = /\bJSON\.parse\s*\(\s*JSON\.stringify\s*\(/g;
export const P_REDUNDANT_SPREAD_RETURN = /return\s*\[\s*\.\.\.([a-zA-Z0-9_$.]+(?:\([^)]*\))?)\s*\]\s*;/g;

// Escape hatch comments (strictly o1-specific, domain-ok is forbidden here)
export const ESCAPE_HATCHES = ['// o1-ok:', '// linear-search-ok:'] as const;

export function shouldIgnoreLine(line: string): boolean {
  return ESCAPE_HATCHES.some(hatch => line.includes(hatch));
}

export type O1RuleId =
  | 'o1-catalog-lookup'
  | 'o1-pokemon-lookup'
  | 'o1-linear-membership'
  | 'o1-object-scan'
  | 'o1-json-clone'
  | 'o1-redundant-spread-return';

export const O1_RULES: readonly O1RuleId[] = [
  'o1-catalog-lookup',
  'o1-pokemon-lookup',
  'o1-linear-membership',
  'o1-object-scan',
  'o1-json-clone',
  'o1-redundant-spread-return'
] as const;

export function scanFileForO1Issues(
  filePath: string,
  content: string
): Array<{ ruleId: O1RuleId; message: string; line: number; context: string; isWarning: boolean }> {
  const issues: Array<{ ruleId: O1RuleId; message: string; line: number; context: string; isWarning: boolean }> = [];
  const lines = content.split('\n');
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (let index = 0; index < lines.length; index++) {
    const lineText = lines[index]!;
    const lineNumber = index + 1;

    if (shouldIgnoreLine(lineText)) {
      continue;
    }

    // 1. Static Catalog Lookups
    for (const catalog of O1_CATALOG_PATTERNS) {
      if (normalizedPath.endsWith(catalog.definingFile)) {
        continue; // Skip the catalog's own definition file
      }

      catalog.pattern.lastIndex = 0;
      if (catalog.pattern.test(lineText)) {
        issues.push({
          ruleId: 'o1-catalog-lookup',
          message: `Linear O(N) search on '${catalog.name}'. Use O(1) alternative: ${catalog.alternative}`,
          line: lineNumber,
          context: lineText.trim(),
          isWarning: false
        });
      }
    }

    // 2. Team + Box Spread Lookup
    P_POKEMON_SPREAD_LOOKUP.lastIndex = 0;
    if (P_POKEMON_SPREAD_LOOKUP.test(lineText)) {
      issues.push({
        ruleId: 'o1-pokemon-lookup',
        message: "Redundant array copying `[...team, ...box]` in linear search. Use O(1) `gameStore.getPokemonByUid(uid)`",
        line: lineNumber,
        context: lineText.trim(),
        isWarning: false
      });
    }

    // 3. Static Array .includes()
    P_STATIC_ARRAY_INCLUDES.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = P_STATIC_ARRAY_INCLUDES.exec(lineText)) !== null) {
      const arrayName = match[1];
      issues.push({
        ruleId: 'o1-linear-membership',
        message: `Linear membership check on '${arrayName}'. Convert to 'ReadonlySet' and use '.has()' for O(1) lookup`,
        line: lineNumber,
        context: lineText.trim(),
        isWarning: false
      });
    }

    // 4. Object.keys / Object.values linear find
    P_OBJECT_SCAN_LOOKUP.lastIndex = 0;
    if (P_OBJECT_SCAN_LOOKUP.test(lineText)) {
      issues.push({
        ruleId: 'o1-object-scan',
        message: "Linear scan on Object.keys()/values(). Use direct property access `obj[key]` or an inverted lookup Record",
        line: lineNumber,
        context: lineText.trim(),
        isWarning: false
      });
    }

    // 5. JSON.parse(JSON.stringify(...)) Deep Clone Anti-Pattern
    P_JSON_CLONE.lastIndex = 0;
    if (P_JSON_CLONE.test(lineText)) {
      issues.push({
        ruleId: 'o1-json-clone',
        message: "Anti-pattern 'JSON.parse(JSON.stringify(...))' detected. Use native 'structuredClone(obj)' or an object factory function instead.",
        line: lineNumber,
        context: lineText.trim(),
        isWarning: false
      });
    }

    // 6. Redundant Spread Return Allocation Anti-Pattern
    P_REDUNDANT_SPREAD_RETURN.lastIndex = 0;
    let spreadMatch: RegExpExecArray | null;
    while ((spreadMatch = P_REDUNDANT_SPREAD_RETURN.exec(lineText)) !== null) {
      const target = spreadMatch[1];
      issues.push({
        ruleId: 'o1-redundant-spread-return',
        message: `Redundant array spread 'return [...${target}]'. Return the collection directly typed as 'readonly T[]' to prevent unnecessary heap allocations and GC churn.`,
        line: lineNumber,
        context: lineText.trim(),
        isWarning: false
      });
    }
  }

  return issues;
}

export class O1DataStructuresAuditor extends FileScanAuditor<O1RuleId> {
  constructor(roots: readonly string[] = ['src']) {
    super({
      id: 'validate_o1_data_structures',
      name: 'O(1) Data Structure & Performance Auditor',
      description: 'Búsqueda lineal O(N) o clonado con JSON.parse',
      family: 'domain_data',
      ruleIds: O1_RULES,
      ruleDescriptions: {
        'o1-catalog-lookup': 'Búsqueda lineal en catálogo estático',
        'o1-pokemon-lookup': 'Búsqueda lineal en equipo o caja Pokémon',
        'o1-linear-membership': 'Búsqueda .includes() en array estático',
        'o1-object-scan': 'Escaneo lineal sobre Object.keys/values',
        'o1-json-clone': 'Clonado con JSON.parse(JSON.stringify)',
        'o1-redundant-spread-return': 'Retorno redundante con spread [...arr]'
      },
      roots,
      allowedExtensions: new Set(['.ts', '.vue'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    if (relPath.includes('.spec.') || relPath.includes('.test.') || relPath.startsWith('tests/')) {
      return;
    }

    const issues = scanFileForO1Issues(relPath, content);
    for (const issue of issues) {
      this.addViolation({
        ruleId: issue.ruleId,
        severity: issue.isWarning ? 'warning' : 'error',
        file: relPath,
        line: issue.line,
        message: issue.message,
        context: issue.context
      });
    }
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new O1DataStructuresAuditor());
}
