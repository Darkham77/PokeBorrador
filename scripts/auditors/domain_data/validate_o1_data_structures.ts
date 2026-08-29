// fallow-ignore-file security-sink
/**
 * scripts/auditors/domain_data/validate_o1_data_structures.ts
 * 
 * O(1) DATA STRUCTURE & LINEAR SEARCH AUDITOR (Node.js 26+ Native)
 * Scans codebase to detect anti-patterns of linear search O(N) and nested loops O(N^2)
 * where an O(1) indexed data structure (Record, ReadonlySet, Map) is available.
 *
 * Rules:
 *   1. o1-catalog-lookup: Linear scan (.find, .filter, .some, .findLast) on static catalogs
 *      (SHOP_ITEMS, FIRE_RED_MAPS, NICK_STYLES, AVATAR_STYLES, CLASS_MISSIONS,
 *       RANKED_REWARD_MILESTONES, GAME_TMS, GYMS).
 *   2. o1-pokemon-lookup: [...team, ...box].find() or .filter() instead of gameStore.getPokemonByUid().
 *   3. o1-linear-membership: Array constant .includes() instead of ReadonlySet.has().
 *   4. o1-object-keys-values-scan: Object.keys() / Object.values() linear search instead of key index.
 *
 * Usage:
 *   node scripts/auditors/domain_data/validate_o1_data_structures.ts
 *   npm run validate:o1
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

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
export const P_STATIC_ARRAY_INCLUDES = /\b([A-Z][A-Z0-9_]+_(?:IDS|LIST|TYPES|CATEGORIES|NAMES|KINDS))\.(?:includes|indexOf)\s*\(/g;
export const P_OBJECT_SCAN_LOOKUP = /\bObject\.(?:keys|values|entries)\s*\([^)]+\)\.(?:find|findLast)\s*\(/g;

// Escape hatch comments
export const ESCAPE_HATCHES = ['// o1-ok', '// linear-search-ok', '// domain-ok'] as const;

export function shouldIgnoreLine(line: string): boolean {
  return ESCAPE_HATCHES.some(hatch => line.includes(hatch));
}

export function scanFileForO1Issues(
  filePath: string,
  content: string
): Array<{ ruleId: string; message: string; line: number; context: string; isWarning: boolean }> {
  const issues: Array<{ ruleId: string; message: string; line: number; context: string; isWarning: boolean }> = [];
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
          isWarning: true
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
        isWarning: true
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
        isWarning: true
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
        isWarning: true
      });
    }
  }

  return issues;
}

// ─── Directory Scanner ────────────────────────────────────────────────────────

const scanDir = (dir: string, fileList: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (
        file !== 'node_modules' && 
        file !== '.git' && 
        file !== 'dist' && 
        file !== 'coverage' && 
        file !== 'external' && 
        file !== '.agents'
      ) {
        scanDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.vue')) {
      // Exclude tests and specs from strict production enforcement
      if (!filePath.includes('.spec.') && !filePath.includes('.test.') && !filePath.includes('tests/')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
};

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  const validator = setupValidation({
    title: 'O(1) DATA STRUCTURE & PERFORMANCE AUDITOR',
    family: 'domain_data',
    id: 'validate_o1_data_structures'
  });

  await validator.checkFiles();

  const filesToScan = scanDir('src');
  let errorCount = 0;
  let warningCount = 0;

  for (const file of filesToScan) {
    const content = fs.readFileSync(file, 'utf-8');
    const issues = scanFileForO1Issues(file, content);

    for (const issue of issues) {
      if (issue.isWarning) {
        warningCount++;
        validator.addWarning(
          issue.message,
          file.replace(/\\/g, '/'),
          issue.line,
          issue.context,
          issue.ruleId
        );
      } else {
        errorCount++;
        validator.addError(
          issue.message,
          file.replace(/\\/g, '/'),
          issue.line,
          issue.context,
          issue.ruleId
        );
      }
    }
  }

  await validator.finish(
    {
      'Archivos escaneados': filesToScan.length,
      'Errores O(1)': errorCount,
      'Advertencias O(1)': warningCount
    },
    [],
    []
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || '')) {
  main().catch(err => {
    console.error(`💥 Fatal error: ${(err as Error).message}`);
    process.exit(1);
  });
}
