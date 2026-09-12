import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState } from '@/types/battle/battle';
import type { DayPhase } from '@/types/system/time';
import { getAvailableCyclesForMap, isMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { cloneReactive } from '@/logic/utils/cloneUtils';
import type { PvpMatchFormat } from '@/types/battle/pvp';

export type GameBattleMode =
  | 'adventure'
  | 'pvp_ranked'
  | 'pvp_casual'
  | 'faction_war'
  | 'spectator'
  | 'replay';

/**
 * Resolves the operational game battle mode from the active battle state.
 */
export function resolveGameBattleMode(battleState?: BattleState | null): GameBattleMode {
  if (!battleState) return 'adventure';
  if (Reflect.get(battleState, 'isReplay') === true) return 'replay';
  if (Reflect.get(battleState, 'isSpectator') === true) return 'spectator';
  if (Reflect.get(battleState, 'isFactionWar') === true) return 'faction_war';
  if (battleState.isPvP) {
    return Reflect.get(battleState, 'isRanked') === true ? 'pvp_ranked' : 'pvp_casual';
  }
  return 'adventure';
}

/**
 * Resolves the team format (3v3 vs 6v6).
 */
export function resolveBattleFormat(mode: GameBattleMode, battleState?: BattleState | null): PvpMatchFormat {
  if (mode === 'pvp_ranked') return '3v3';
  if (mode === 'pvp_casual') {
    const rawFormat = Reflect.get(battleState || {}, 'format');
    return rawFormat === '6v6' ? '6v6' : '3v3';
  }
  return '6v6';
}

function sanitizeCombatantForCompetitive(mon: Pokemon): Pokemon {
  const maxHp = Number(mon.maxHp ?? mon.hp ?? 100);
  return {
    ...mon,
    hp: maxHp,
    maxHp,
    status: '',
    statusTurns: 0,
    sleepTurns: 0,
    fainted: false,
    cursed: false,
    confused: 0,
    flinched: false,
    substitute: 0,
    seeded: false,
    attracted: false,
    isGuardian: false,
    volatileCounters: {}
  };
}

/**
 * Resolves the starting roster for a battle mode, ensuring strict format isolation,
 * cloning, and competitive sanitization.
 */
export function resolveStartingTeamForMode(
  mode: GameBattleMode,
  format: PvpMatchFormat,
  saveData: {
    team: (Pokemon | null)[];
    box?: (Pokemon | null)[];
    pvpTeam?: string[];
    pvpTeam6?: string[];
    warTeam?: string[];
  }
): Pokemon[] {
  const allAvailable = [
    ...(saveData.team || []),
    ...(saveData.box || [])
  ].filter((p): p is Pokemon => p !== null && !p.isIllegal);

  const byUid = new Map<string, Pokemon>();
  for (const p of allAvailable) {
    if (p.uid) byUid.set(p.uid, p);
  }

  if (mode === 'pvp_ranked' || mode === 'pvp_casual') {
    const uids = format === '3v3' ? (saveData.pvpTeam || []) : (saveData.pvpTeam6 || []);
    const resolved: Pokemon[] = [];
    for (const uid of uids) {
      const mon = byUid.get(uid);
      if (mon) resolved.push(cloneReactive(mon));
    }
    const targetCount = format === '3v3' ? 3 : 6;
    if (resolved.length < targetCount) {
      for (const p of allAvailable) {
        if (resolved.length >= targetCount) break;
        if (!resolved.some(r => r.uid === p.uid)) {
          resolved.push(cloneReactive(p));
        }
      }
    }
    return resolved.map(sanitizeCombatantForCompetitive);
  }

  if (mode === 'faction_war') {
    const uids = saveData.warTeam || saveData.pvpTeam6 || [];
    const resolved: Pokemon[] = [];
    for (const uid of uids) {
      const mon = byUid.get(uid);
      if (mon) resolved.push(cloneReactive(mon));
    }
    if (resolved.length === 0) {
      resolved.push(...(saveData.team || []).filter((p): p is Pokemon => p !== null).map(cloneReactive));
    }
    return resolved.map(sanitizeCombatantForCompetitive);
  }

  return (saveData.team || []).filter((p): p is Pokemon => p !== null).map(cloneReactive);
}

/**
 * Single Source of Truth for the currently active combat team in the battle session.
 */
export function getActiveCombatTeam(ctx: BattleContext): Pokemon[] {
  const active = ctx.activeBattle?.value;
  if (active?.playerTeam && active.playerTeam.length > 0) {
    return active.playerTeam.filter((p): p is Pokemon => p !== null);
  }
  return (ctx.gs?.state?.team || []).filter((p): p is Pokemon => p !== null);
}

/**
 * Retrieves the alive bench combatants from the active combat team.
 */
export function getHealthyBenchCombatants(ctx: BattleContext): Pokemon[] {
  const team = getActiveCombatTeam(ctx);
  const activeUid = ctx.activeBattle?.value?.player?.uid;
  return team.filter(p => p.hp > 0 && p.uid !== activeUid);
}

/**
 * Evaluates if switching is permissible for the player in the active battle.
 */
export function canSwitchInCombat(ctx: BattleContext): boolean {
  return getHealthyBenchCombatants(ctx).length > 0;
}

/**
 * Checks whether natural map weather is permissible in the given physical arena location.
 * Natural weather is strictly forbidden in Gyms, Caves, Crystal Caves, and Indoors.
 */
export function isNaturalWeatherAllowedInLocation(
  locationId?: MapRouteId,
  mapConfig?: { isGym?: boolean; isIndoors?: boolean; isCave?: boolean; isCrystalCave?: boolean; weatherEnabled?: boolean } | null,
  gymConfig?: { id?: string; fixedCycle?: DayPhase; isGym?: boolean } | null,
  battleState?: { isGym?: boolean; isIndoors?: boolean; isCave?: boolean; isCrystalCave?: boolean; locationId?: MapRouteId } | null
): boolean {
  if (battleState?.isGym || battleState?.isIndoors || battleState?.isCave || battleState?.isCrystalCave) {
    return false;
  }
  if (locationId === 'gym' || battleState?.locationId === 'gym') {
    return false;
  }
  if (Boolean(gymConfig) || mapConfig?.isGym || mapConfig?.isIndoors || mapConfig?.isCave || mapConfig?.isCrystalCave) {
    return false;
  }
  if (mapConfig?.weatherEnabled === false) {
    return false;
  }
  return true;
}

/**
 * Resolves the effective day/night lighting cycle for an arena.
 * Indoors and Gyms have fixed daytime lighting; caves have fixed nighttime/dark lighting.
 */
export function resolveEffectiveCycleForLocation(
  locationId?: MapRouteId,
  mapConfig?: { isGym?: boolean; isIndoors?: boolean; isCave?: boolean; isCrystalCave?: boolean } | null,
  gymConfig?: { fixedCycle?: DayPhase; isGym?: boolean } | null,
  battleState?: { fixedCycle?: DayPhase; isGym?: boolean; isIndoors?: boolean; isCave?: boolean; isCrystalCave?: boolean; locationId?: MapRouteId } | null,
  currentMapCycle: DayPhase = 'day'
): DayPhase {
  if (battleState?.fixedCycle) return battleState.fixedCycle;
  if (gymConfig?.fixedCycle) return gymConfig.fixedCycle;

  const isGym = battleState?.isGym || Boolean(gymConfig) || mapConfig?.isGym || locationId === 'gym';
  if (isGym) return 'day';

  const available = typeof locationId === 'string' && isMapRouteId(locationId) ? getAvailableCyclesForMap(locationId) : [];
  if (available.length > 1) {
    if (available.includes(currentMapCycle)) return currentMapCycle;
    return available[0] || 'day';
  }

  const isCave = battleState?.isCave || battleState?.isCrystalCave || mapConfig?.isCave || mapConfig?.isCrystalCave;
  if (isCave) return 'night';

  const isIndoors = battleState?.isIndoors || mapConfig?.isIndoors;
  if (isIndoors) return 'day';

  return currentMapCycle;
}

/**
 * Determines if using the player's inventory bag is permitted in the active battle.
 */
export function isBagAllowedInBattle(ctx: BattleContext): boolean {
  const active = ctx.activeBattle?.value;
  if (!active) return true;
  if (active.isPvP || Reflect.get(active, 'isSpectator') || Reflect.get(active, 'isReplay')) return false;
  if (active.cannotEscape) return false;
  return true;
}

/**
 * Determines if Team Rocket stealing mechanics are permitted in the active battle.
 */
export function isStealingAllowedInBattle(ctx: BattleContext): boolean {
  const active = ctx.activeBattle?.value;
  if (!active) return false;
  if (active.isPvP || active.isGym || Reflect.get(active, 'isSpectator') || Reflect.get(active, 'isReplay')) return false;
  const isRocket = active.trainerArchetype === 'rocket' ||
    (typeof active.trainerSprite === 'string' && active.trainerSprite.includes('rocket')) ||
    (typeof active.trainerName === 'string' && active.trainerName.toLowerCase().includes('rocket'));
  return isRocket;
}

/**
 * Governs whether player state changes (rewards, level up, money) should persist.
 * Replays and Spectator sessions MUST NOT modify player data.
 */
export function shouldPersistPlayerState(ctx: BattleContext): boolean {
  const active = ctx.activeBattle?.value;
  if (!active) return true;
  if (Reflect.get(active, 'isSpectator') === true || Reflect.get(active, 'isReplay') === true) return false;
  return true;
}

/**
 * Governs whether battle HP mutations should be written back to the adventure party.
 * In competitive PvP, Replays, and Spectator sessions, adventure party HP is shielded.
 */
export function shouldPersistHpToAdventure(ctx: BattleContext): boolean {
  const active = ctx.activeBattle?.value;
  if (!active) return true;
  if (active.isPvP || Reflect.get(active, 'isSpectator') === true || Reflect.get(active, 'isReplay') === true) {
    return false;
  }
  return true;
}
