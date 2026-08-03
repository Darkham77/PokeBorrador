// src/logic/battle/helpers/showdownSyncHelper.ts
import type { Side, ID } from '@pkmn/sim';

export interface MinimalPokemonState {
  uid: string;
  hp: number;
  status?: string | null | undefined;
}

/**
 * Removes a specific Pokémon from the simulator's faint queue.
 * Shared to avoid duplication when reviving/healing Pokémon in cheats or normal synchronization.
 */
export function clearPokemonFromFaintQueue(side: unknown, p: unknown): void {
  const battle = (side as { battle?: { faintQueue?: unknown[] } })?.battle;
  if (battle && Array.isArray(battle.faintQueue)) {
    battle.faintQueue = battle.faintQueue.filter(
      (entry: unknown) => entry && (entry as { target?: unknown }).target !== p
    );
  }
}

/**
 * Extracts HP and status mappings from a team of Pokémon.
 * Avoids duplicate mapping code in switchAction.ts and showdownWorkerClient.ts.
 */
export function extractTeamHpAndStatus(team: Array<MinimalPokemonState | null>): {
  hps: Record<string, number>;
  statuses: Record<string, string>;
} {
  const hps: Record<string, number> = {};
  const statuses: Record<string, string> = {};
  team.forEach(p => {
    if (p && p.uid) {
      hps[p.uid] = p.hp ?? 0;
      statuses[p.uid] = p.status ?? '';
    }
  });
  return { hps, statuses };
}

import { findMatchingValue } from '../showdownUidMapper.ts';

/**
 * Helper to synchronize HP, statuses, fainted states, and active counts for a battle side.
 * Shared between showdownExecutor.ts and showdown.worker.ts to guarantee 100% algorithm parity.
 */
export function syncSidePokemon(
  side: Side,
  hps: Record<string, number>,
  statuses?: Record<string, string>
): void {
  console.debug(`[SYNC-SIDE] Side ${side.id}: before sync, pokemon:`, side.pokemon.map(p => `${p?.name} (uid:${p ? Reflect.get(p, 'uid') : undefined}, hp:${p?.hp}, maxhp:${p?.maxhp}, fainted:${p?.fainted})`));
  side.pokemon.forEach(p => {
    if (p) {
      const uid = Reflect.get(p, 'uid') as string | undefined;
      const clientHp = uid ? findMatchingValue(uid, hps) : undefined;
      if (clientHp !== undefined) {


        if (clientHp <= 0) {
          p.hp = 0;
        } else {
          p.hp = Math.min(clientHp, p.maxhp);
        }

        if (p.hp <= 0) {
          if (!p.fainted) {
            p.faint();
          }
        } else {
          p.fainted = false;
          Reflect.set(p, 'faintQueued', false);
          clearPokemonFromFaintQueue(side, p);
          const rawStatus = uid && statuses ? findMatchingValue(uid, statuses) : undefined;
          if (rawStatus !== undefined) {
            const targetStatus = (rawStatus || '') as ID;
            console.debug(`[SYNC-SIDE-STATUS] Mon: ${p.name} (uid:${uid}), current status: "${p.status}", targetStatus: "${targetStatus}"`);
            const cureFn = Reflect.get(p, 'cureStatus') as ((silent?: boolean) => boolean) | undefined;
            const setFn = Reflect.get(p, 'setStatus') as ((s: string) => boolean) | undefined;
            if (targetStatus === '' && typeof cureFn === 'function') {
              cureFn.call(p, true);
            } else if (typeof setFn === 'function') {
              setFn.call(p, targetStatus);
            } else {
              p.status = targetStatus;
            }
            console.debug(`[SYNC-SIDE-STATUS] Mon: ${p.name} status after sync: "${p.status}"`);
          } else if (p.status === 'fnt') {
            const cureFn = Reflect.get(p, 'cureStatus') as ((silent?: boolean) => boolean) | undefined;
            const setFn = Reflect.get(p, 'setStatus') as ((s: string) => boolean) | undefined;
            if (typeof cureFn === 'function') {
              cureFn.call(p, true);
            } else if (typeof setFn === 'function') {
              setFn.call(p, '');
            } else {
              p.status = '' as ID;
            }
          }
        }
      }
    }
  });
  console.debug(`[SYNC-SIDE] Side ${side.id}: after sync, pokemon:`, side.pokemon.map(p => `${p?.name} (uid:${p ? Reflect.get(p, 'uid') : undefined}, hp:${p?.hp}, maxhp:${p?.maxhp}, fainted:${p?.fainted})`));
  Reflect.set(side, 'pokemonLeft', side.pokemon.filter(p => p && !p.fainted).length);
}
