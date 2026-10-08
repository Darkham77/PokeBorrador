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
import { BaseAuditor } from '@francogp/auditor';
import { ENABLED_POKEMON_IDS_SET } from '../../../src/data/system/constants.ts';
import { FIRE_RED_MAPS } from '../../../src/data/world/maps.ts';
import { GYMS, type Gym, type GymId } from '../../../src/data/world/gyms.ts';
import type { MapLocation } from '../../../src/types/pokemon/encounters.ts';

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

export class SpawnsWhitelistAuditor extends BaseAuditor<SpawnWhitelistRuleId> {
  constructor() {
    super({
      id: 'validate_spawns_whitelist',
      configKey: 'domain.spawnsWhitelist',
      defaultConfig: {
        enabled: true
      },
      name: 'World Spawns & Encounters Whitelist Validator',
      description: 'Spawns fuera de whitelist o niveles inválidos',
      icon: '🗺️',
      family: 'domain_data',
      ruleIds: SPAWN_WHITELIST_RULES,
      packageName: 'Spawns',
      ruleDescriptions: {
        'spawns-species-whitelist': 'Pokémon fuera de la whitelist',
        'spawns-level-range-integrity': 'Rango de niveles inválido',
        'spawns-encounter-rates-parity': 'Discrepancia en probabilidades'
      },
      requiredFiles: [
        path.resolve(process.cwd(), MAPS_FILE_PATH),
        path.resolve(process.cwd(), GYMS_FILE_PATH),
        path.resolve(process.cwd(), GYM_REMATCHES_FILE_PATH)
      ],
      coverage: {
        include: [MAPS_FILE_PATH, GYMS_FILE_PATH, GYM_REMATCHES_FILE_PATH]
      }
    });
  }

  private auditMapLevelRange(map: MapLocation, mapLine: number): void {
    if (!Array.isArray(map.lv) || map.lv.length !== 2) {
      this.addViolation({
        ruleId: 'spawns-level-range-integrity',
        severity: 'error',
        file: MAPS_FILE_PATH,
        line: mapLine,
        message: `Map '${map.id}' has invalid lv array format. Expected [minLevel, maxLevel].`,
        context: `"id": "${map.id}"`
      });
      return;
    }
    const minLv = map.lv[0];
    const maxLv = map.lv[1];
    if (minLv === undefined || maxLv === undefined || minLv < 1 || maxLv > 100 || minLv > maxLv) {
      this.addViolation({
        ruleId: 'spawns-level-range-integrity',
        severity: 'error',
        file: MAPS_FILE_PATH,
        line: mapLine,
        message: `Map '${map.id}' has invalid level range [${minLv ?? 'undefined'}, ${maxLv ?? 'undefined'}]. Must satisfy 1 <= min <= max <= 100.`,
        context: `"id": "${map.id}", "lv": [${minLv ?? 'undefined'}, ${maxLv ?? 'undefined'}]`
      });
    }
  }

  private auditMapWildSpawns(map: MapLocation, mapLine: number): void {
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
  }

  private auditMapWeather(map: MapLocation, mapLine: number): void {
    if (!map.weather) return;
    for (const [wName, wConfig] of Object.entries(map.weather)) {
      const visitors = [
        ...Object.keys(wConfig.visitors || {}),
        ...Object.keys(wConfig.fishingVisitors || {})
      ];
      for (const sp of visitors) {
        if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
          this.addViolation({
            ruleId: 'spawns-species-whitelist',
            severity: 'error',
            file: MAPS_FILE_PATH,
            line: mapLine,
            message: `Map '${map.id}' weather '${wName}' visitor '${sp}' is not in ENABLED_POKEMON_IDS.`,
            context: `"weather.${wName}": "${sp}"`
          });
        }
      }
    }
  }

  private auditMaps(maps: readonly MapLocation[], lineMap: Map<string, number>): void {
    for (const map of maps) {
      const mapLine = lineMap.get(map.id) || 1;
      this.auditMapLevelRange(map, mapLine);
      this.auditMapWildSpawns(map, mapLine);
      this.auditMapWeather(map, mapLine);
    }
  }

  private auditGymRoster(gymId: GymId, pokemon: string[], levels: number[], diffName?: string): void {
    const label = diffName ? `Gym '${gymId}' (${diffName})` : `Gym '${gymId}'`;
    const ctx = diffName ? `id: '${gymId}', difficulty: '${diffName}'` : `id: '${gymId}'`;

    for (const sp of pokemon) {
      if (!ENABLED_POKEMON_IDS_SET.has(sp)) {
        this.addViolation({
          ruleId: 'spawns-species-whitelist',
          severity: 'error',
          file: GYMS_FILE_PATH,
          line: 1,
          message: `${label} contains non-whitelisted Pokémon '${sp}'.`,
          context: ctx
        });
      }
    }

    if (pokemon.length !== levels.length) {
      this.addViolation({
        ruleId: 'spawns-level-range-integrity',
        severity: 'error',
        file: GYMS_FILE_PATH,
        line: 1,
        message: `${label} has mismatched pokemon count (${pokemon.length}) vs levels count (${levels.length}).`,
        context: ctx
      });
    }
  }

  private auditGymDifficulties(gym: Gym): void {
    if (!gym.difficulties) return;
    for (const [diffName, diff] of Object.entries(gym.difficulties)) {
      this.auditGymRoster(gym.id, diff.pokemon, diff.levels, diffName);
    }
  }

  private auditSingleGym(gym: Gym): void {
    this.auditGymRoster(gym.id, gym.pokemon, gym.levels);
    this.auditGymDifficulties(gym);
  }

  private auditGyms(gyms: readonly Gym[]): void {
    for (const gym of gyms) {
      this.auditSingleGym(gym);
    }
  }

  private auditGymRematches(): void {
    const rematchFullPath = path.resolve(this.projectRoot, GYM_REMATCHES_FILE_PATH);
    const rematchContent = fs.readFileSync(rematchFullPath, 'utf-8');

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
  }

  public override runAudit(): void {
    this.recordScanned(MAPS_FILE_PATH);
    this.recordScanned(GYMS_FILE_PATH);
    this.recordScanned(GYM_REMATCHES_FILE_PATH);
    this.markRuleEvaluated('spawns-species-whitelist');
    this.markRuleEvaluated('spawns-level-range-integrity');
    this.markRuleEvaluated('spawns-encounter-rates-parity');

    const { maps, lineMap } = this.parseMaps();
    this.auditMaps(maps, lineMap);

    const gyms = this.parseGyms();
    this.auditGyms(gyms);

    this.auditGymRematches();

    this.context.setMetric('Maps Scanned', maps.length);
    this.context.setMetric('Gyms Scanned', gyms.length);
  }

  private parseMaps(): { maps: readonly MapLocation[]; lineMap: Map<string, number> } {
    const fullPath = path.resolve(this.projectRoot, MAPS_FILE_PATH);
    const content = fs.readFileSync(fullPath, 'utf-8');

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

    return { maps: FIRE_RED_MAPS, lineMap };
  }

  private parseGyms(): readonly Gym[] {
    return GYMS;
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SpawnsWhitelistAuditor());
}
