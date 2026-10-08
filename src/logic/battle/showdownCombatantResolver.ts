/**
 * src/logic/battle/showdownCombatantResolver.ts
 *
 * Resolves combatants, teams, and Pokémon UIDs from raw Showdown battle log lines.
 */

import type { BattleSide, BattleState } from '@/types/battle/battle.ts';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';
import { findMatchingPokemon, isMatchingUid } from './showdownUidMapper.ts';
import { useGameStore } from '@/stores/game';

export function parseBattleSide(rawId: string): BattleSide | null {
  if (/^p1[a-d]?:/.test(rawId)) return 'player';
  if (/^p2[a-d]?:/.test(rawId)) return 'enemy';
  return null;
}

function resolveSideTeam(battle: BattleState, side: BattleSide): Pokemon[] {
  if (side === 'player') {
    return (battle.playerTeam && battle.playerTeam.length > 0)
      ? battle.playerTeam
      : (useGameStore().state?.team || (battle.player ? [battle.player] : []));
  }
  return (battle.enemyTeam && battle.enemyTeam.length > 0)
    ? battle.enemyTeam
    : (battle.enemy ? [battle.enemy] : []);
}

function extractUidFromLogLine(line: string, rawId: string): string | undefined {
  if (!line || !line.includes('|[uids]')) return undefined;
  const lineParts = line.split('|');
  const uidsPart = lineParts.find(p => p.startsWith('[uids]'));
  if (!uidsPart) return undefined;
  const mappings = uidsPart.substring(6).split(',');
  const targetIdent = rawId.replace(/\s+/g, '');
  const match = mappings.find(m => m.startsWith(`${targetIdent}=`));
  return match ? match.split('=')[1] : undefined;
}

function locateActiveBattlePokemonByUid(battle: BattleState, side: BattleSide, targetUid: string): Pokemon | null {
  const keys = Object.keys(battle);
  for (const key of keys) {
    const matchesSide = side === 'player'
      ? (key.startsWith('player') || key === 'ally')
      : key.startsWith('enemy');
    if (matchesSide) {
      const val = Reflect.get(battle, key) as Pokemon | null | undefined;
      if (val && typeof val === 'object' && val.uid === targetUid) {
        return val;
      }
    }
  }
  return null;
}

function matchPokemonBySuffixOrIdentity(team: Pokemon[], rawId: string): Pokemon | null {
  const namePart = rawId.includes(':') ? (rawId.split(':')[1]?.trim() ?? '') : '';
  if (namePart) {
    const suffixMon = (team.find(mon => mon && (isMatchingUid(mon.uid, namePart) || mon.name?.toLowerCase() === namePart.toLowerCase() || mon.id === namePart)) ?? null) as Pokemon | null; // text-ok: UI text display localization string
    if (suffixMon) {
      console.debug(`[E2E-GETPOKE-SUFFIX-MATCH] Matched rawId "${rawId}" to team UID "${suffixMon.uid}" via name/UID`);
      return suffixMon;
    }
  }

  const matchMon = findMatchingPokemon(rawId, team) ?? null;
  if (matchMon) {
    console.debug(`[E2E-GETPOKE-MATCHMON] Resolved rawId "${rawId}" to team UID "${matchMon.uid}" name "${matchMon.name}"`);
    return matchMon;
  }
  return null;
}

export function determineCombatantFromLog(
  rawId: string,
  line: string,
  battle: BattleState | null,
  fallbackMon: Pokemon | null,
): Pokemon | null {
  const side = parseBattleSide(rawId);
  if (!side) return null;

  if (!battle) {
    console.debug(`[E2E-GETPOKE] No active battle. rawId: "${rawId}", side: "${side}". Returning default.`);
    return fallbackMon;
  }

  console.debug(`[E2E-GETPOKE] rawId: "${rawId}", side: "${side}", line: "${line}"`);

  const team = resolveSideTeam(battle, side);
  const foundUid = extractUidFromLogLine(line, rawId);

  if (foundUid) {
    const foundInTeam = team.find(mon => mon && mon.uid === foundUid);
    if (!foundInTeam) {
      throw new Error(`[showdownBridge.ts] Resolved UID "${foundUid}" for "${rawId}" but it was not found in the reactively tracked team list.`);
    }
    const activeMon = locateActiveBattlePokemonByUid(battle, side, foundUid);
    if (activeMon) {
      console.debug(`[E2E-GETPOKE-RESOLVED-ACTIVE] Resolved rawId "${rawId}" to active UID "${foundInTeam.uid}" matches`);
      return activeMon;
    }
    console.debug(`[E2E-GETPOKE-RESOLVED-TEAM] Resolved rawId "${rawId}" to team UID "${foundInTeam.uid}" name "${foundInTeam.name}"`);
    return foundInTeam;
  }

  const matched = matchPokemonBySuffixOrIdentity(team, rawId);
  if (matched) return matched;

  throw new Error(
    `[ShowdownBridge] UID resolution failed for "${rawId}". ` +
    `This indicates a synchronization bug — UID must be present in the tracked team. ` +
    `Aborting to expose the desync at its source.`
  );
}
