/**
 * scripts/auditors/domain_data/validate_spawns_whitelist.ts
 *
 * WORLD SPAWNS & GYM ENCOUNTERS WHITELIST AUDITOR (Node.js 26+ Native)
 *
 * Enforces species whitelist integrity, encounter level bounds, and rate parity across all game maps:
 *   1. Species Whitelist Integrity (`spawns-species-whitelist`):
 *      Every wild encounter species in `FIRE_RED_MAPS` (morning, day, dusk, night, weather visitors,
 *      fishing visitors), gym leader teams in `GYMS`, and rematch teams in `GYM_REMATCHES` MUST
 *      belong to `ENABLED_POKEMON_IDS_SET` (Gen 1 #001-#151 + 8 baby Pokémon + Castform variants).
 *   2. Level Range Integrity (`spawns-level-range-integrity`):
 *      Ensures map wild encounter levels `[min, max]` satisfy `1 <= min <= max <= 100`, and that
 *      gym leader teams have identical lengths for `pokemon` and `levels`.
 *   3. Encounter Rates Parity (`spawns-encounter-rates-parity`):
 *      Ensures wild species array length equals rates array length for every time-of-day slot,
 *      and that total encounter percentage rates sum to 100%.
 *
 * Escape Hatches:
 *   `// domain-ok: <motivo>`, `// spawn-ok: <motivo>`
 *
 * Usage:
 *   npm run validate:spawns
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import {
  BaseAuditor
} from '../../lib/auditorBase.ts';
import { ENABLED_POKEMON_IDS_SET } from '../../../src/data/system/constants.ts';

enableCompileCache();

export type SpawnWhitelistRuleId =
  | 'spawns-species-whitelist'
  | 'spawns-level-range-integrity'
  | 'spawns-encounter-rates-parity';

export const SPAWN_WHITELIST_RULES: readonly SpawnWhitelistRuleId[] = [
  'spawns-species-whitelist',
  'spawns-level-range-integrity',
  'spawns-encounter-rates-parity'
] as const;

const MAPS_FILE_PATH = 'src/data/world/maps.ts';
const GYMS_FILE_PATH = 'src/data/world/gyms.ts';
const GYM_REMATCHES_FILE_PATH = 'src/data/world/gymRematches.ts';

interface RawMapLocation {
  id: string;
  name: string;
  wild?: Record<string, string[]>;
  rates?: Record<string, number[]>;
  lv?: [number, number];
  weather?: Record<string, { visitors?: Record<string, number>; fishingVisitors?: Record<string, number> }>;
}

interface RawGym {
  id: string;
  name: string;
  pokemon: string[];
  levels: number[];
  difficulties?: Record<string, { pokemon: string[]; levels: number[] }>;
}

export class SpawnsWhitelistAuditor extends BaseAuditor<SpawnWhitelistRuleId> {
  constructor() {
    super({
      id: 'validate_spawns_whitelist',
      name: 'World Spawns & Encounters Whitelist Validator',
      description: 'Spawns fuera de whitelist o niveles inválidos',
      family: 'domain_data',
      ruleIds: SPAWN_WHITELIST_RULES,
      ruleDescriptions: {
        'spawns-species-whitelist': 'Pokémon fuera de la whitelist en spawns',
        'spawns-level-range-integrity': 'Rango de niveles inválido en apariciones',
        'spawns-encounter-rates-parity': 'Discrepancia en probabilidades de aparición'
      },
      requiredFiles: [
        path.resolve(process.cwd(), MAPS_FILE_PATH),
        path.resolve(process.cwd(), GYMS_FILE_PATH),
        path.resolve(process.cwd(), GYM_REMATCHES_FILE_PATH)
      ]
    });
  }

  public override runAudit(): void {
    // 1. Audit Maps (FIRE_RED_MAPS)
    const { maps, lineMap } = this.parseMaps();
    this.filesScannedCount++;

    for (const map of maps) {
      const mapLine = lineMap.get(map.id) || 1;

      // Rule 2: spawns-level-range-integrity
      if (!Array.isArray(map.lv) || map.lv.length !== 2) {
        this.addViolation({
          ruleId: 'spawns-level-range-integrity',
          severity: 'error',
          file: MAPS_FILE_PATH,
          line: mapLine,
          message: `Map '${map.id}' has invalid lv array format. Expected [minLevel, maxLevel].`,
          context: `"id": "${map.id}"`
        });
      } else {
        const [minLv, maxLv] = map.lv;
        if (minLv < 1 || maxLv > 100 || minLv > maxLv) {
          this.addViolation({
            ruleId: 'spawns-level-range-integrity',
            severity: 'error',
            file: MAPS_FILE_PATH,
            line: mapLine,
            message: `Map '${map.id}' has invalid level range [${minLv}, ${maxLv}]. Must satisfy 1 <= min <= max <= 100.`,
            context: `"id": "${map.id}", "lv": [${minLv}, ${maxLv}]`
          });
        }
      }

      // Rule 1 & Rule 3: wild species & rates parity
      const times = ['morning', 'day', 'dusk', 'night'] as const;
      for (const time of times) {
        const speciesList = map.wild?.[time] || [];
        const ratesList = map.rates?.[time] || [];

        for (const sp of speciesList) {
          if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
            this.addViolation({
              ruleId: 'spawns-species-whitelist',
              severity: 'error',
              file: MAPS_FILE_PATH,
              line: mapLine,
              message: `Map '${map.id}' (${time}) spawns non-whitelisted Pokémon '${sp}'. Must belong to ENABLED_POKEMON_IDS.`,
              context: `"wild": { "${time}": ["${sp}", ...] }`
            });
          }
        }

        if (speciesList.length !== ratesList.length) {
          this.addViolation({
            ruleId: 'spawns-encounter-rates-parity',
            severity: 'error',
            file: MAPS_FILE_PATH,
            line: mapLine,
            message: `Map '${map.id}' (${time}) has mismatched species count (${speciesList.length}) vs rates count (${ratesList.length}).`,
            context: `"wild.${time}".length !== "rates.${time}".length`
          });
        }

        if (speciesList.length > 0) {
          const sum = ratesList.reduce((acc, r) => acc + r, 0);
          if (sum !== 100) {
            this.addViolation({
              ruleId: 'spawns-encounter-rates-parity',
              severity: 'error',
              file: MAPS_FILE_PATH,
              line: mapLine,
              message: `Map '${map.id}' (${time}) encounter rates sum to ${sum}% instead of 100%.`,
              context: `"rates": { "${time}": [${ratesList.join(', ')}] }`
            });
          }
        }
      }

      // Weather visitors
      if (map.weather) {
        for (const [wName, wConfig] of Object.entries(map.weather)) {
          if (wConfig.visitors) {
            for (const sp of Object.keys(wConfig.visitors)) {
              if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
                this.addViolation({
                  ruleId: 'spawns-species-whitelist',
                  severity: 'error',
                  file: MAPS_FILE_PATH,
                  line: mapLine,
                  message: `Map '${map.id}' weather '${wName}' visitor '${sp}' is not in ENABLED_POKEMON_IDS.`,
                  context: `"weather.${wName}.visitors": "${sp}"`
                });
              }
            }
          }
          if (wConfig.fishingVisitors) {
            for (const sp of Object.keys(wConfig.fishingVisitors)) {
              if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
                this.addViolation({
                  ruleId: 'spawns-species-whitelist',
                  severity: 'error',
                  file: MAPS_FILE_PATH,
                  line: mapLine,
                  message: `Map '${map.id}' weather '${wName}' fishing visitor '${sp}' is not in ENABLED_POKEMON_IDS.`,
                  context: `"weather.${wName}.fishingVisitors": "${sp}"`
                });
              }
            }
          }
        }
      }
    }

    // 2. Audit Gyms (GYMS)
    const gyms = this.parseGyms();
    this.filesScannedCount++;

    for (const gym of gyms) {
      for (const sp of gym.pokemon) {
        if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
          this.addViolation({
            ruleId: 'spawns-species-whitelist',
            severity: 'error',
            file: GYMS_FILE_PATH,
            line: 1,
            message: `Gym '${gym.id}' contains non-whitelisted Pokémon '${sp}'.`,
            context: `id: '${gym.id}', pokemon: ['${sp}']`
          });
        }
      }

      if (gym.pokemon.length !== gym.levels.length) {
        this.addViolation({
          ruleId: 'spawns-level-range-integrity',
          severity: 'error',
          file: GYMS_FILE_PATH,
          line: 1,
          message: `Gym '${gym.id}' has mismatched pokemon count (${gym.pokemon.length}) vs levels count (${gym.levels.length}).`,
          context: `id: '${gym.id}'`
        });
      }

      if (gym.difficulties) {
        for (const [diffName, diff] of Object.entries(gym.difficulties)) {
          for (const sp of diff.pokemon) {
            if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
              this.addViolation({
                ruleId: 'spawns-species-whitelist',
                severity: 'error',
                file: GYMS_FILE_PATH,
                line: 1,
                message: `Gym '${gym.id}' (${diffName}) contains non-whitelisted Pokémon '${sp}'.`,
                context: `id: '${gym.id}', difficulty: '${diffName}'`
              });
            }
          }

          if (diff.pokemon.length !== diff.levels.length) {
            this.addViolation({
              ruleId: 'spawns-level-range-integrity',
              severity: 'error',
              file: GYMS_FILE_PATH,
              line: 1,
              message: `Gym '${gym.id}' (${diffName}) has mismatched pokemon count (${diff.pokemon.length}) vs levels count (${diff.levels.length}).`,
              context: `id: '${gym.id}', difficulty: '${diffName}'`
            });
          }
        }
      }
    }

    // 3. Audit Gym Rematches (GYM_REMATCHES)
    const rematchFullPath = path.resolve(this.projectRoot, GYM_REMATCHES_FILE_PATH);
    const rematchContent = fs.readFileSync(rematchFullPath, 'utf-8');
    this.filesScannedCount++;

    const rematchPokemonRegex = /pokemon:\s*\[([^\]]+)\]/g;
    let rMatch: RegExpExecArray | null;

    while ((rMatch = rematchPokemonRegex.exec(rematchContent)) !== null) {
      const rawList = rMatch[1];
      if (!rawList) continue;
      const list = rawList.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
      const line = rematchContent.slice(0, rMatch.index).split('\n').length;
      for (const sp of list) {
        if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
          this.addViolation({
            ruleId: 'spawns-species-whitelist',
            severity: 'error',
            file: GYM_REMATCHES_FILE_PATH,
            line,
            message: `Gym rematch team contains non-whitelisted Pokémon '${sp}'.`,
            context: rMatch[0]
          });
        }
      }
    }

    this.context.setMetric('Maps Scanned', maps.length);
    this.context.setMetric('Gyms Scanned', gyms.length);
  }

  private parseMaps(): { maps: RawMapLocation[]; lineMap: Map<string, number> } {
    const fullPath = path.resolve(this.projectRoot, MAPS_FILE_PATH);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const startToken = 'export const MAP_LOCATIONS: MapLocation[] = [';
    const startIndex = content.indexOf(startToken);
    if (startIndex === -1) return { maps: [], lineMap: new Map() };

    const arrayStart = startIndex + startToken.length - 1;
    const arrayEnd = content.lastIndexOf('];');
    if (arrayEnd === -1) return { maps: [], lineMap: new Map() };

    const jsStr = content.substring(arrayStart, arrayEnd + 1);

    const maps = new Function('return ' + jsStr)() as RawMapLocation[];
    const lines = content.split('\n');
    const lineMap = new Map<string, number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const match = line.match(/"id":\s*"([^"]+)"/);
      if (match?.[1] && !lineMap.has(match[1])) {
        lineMap.set(match[1], i + 1);
      }
    }

    return { maps, lineMap };
  }

  private parseGyms(): RawGym[] {
    const fullPath = path.resolve(this.projectRoot, GYMS_FILE_PATH);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const startToken = 'export const GYMS = [';
    const start = content.indexOf(startToken) + 'export const GYMS = '.length;
    const end = content.indexOf('] as const satisfies', start);
    const jsStr = content.slice(start, end + 1);

    return new Function('return ' + jsStr)() as RawGym[];
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SpawnsWhitelistAuditor());
}
