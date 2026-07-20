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

/**
 * Helper to synchronize HP, statuses, fainted states, and active counts for a battle side.
 * Shared between showdownExecutor.ts and showdown.worker.ts to guarantee 100% algorithm parity.
 */
export function syncSidePokemon(
  side: Side,
  hps: Record<string, number>,
  statuses?: Record<string, string>
): void {
  console.debug(`[SYNC-SIDE] Side ${side.id}: before sync, pokemon:`, side.pokemon.map(p => `${p?.name} (uid:${(p as unknown as { uid?: string })?.uid}, hp:${p?.hp}, maxhp:${p?.maxhp}, fainted:${p?.fainted})`));
  side.pokemon.forEach(p => {
    if (p) {
      const uid = (p as unknown as { uid?: string }).uid;
      if (uid && hps[uid] !== undefined) {
        const maxHpVal = p.maxhp || 0;
        const clientHp = hps[uid];

        if (clientHp <= 0) {
          p.hp = 0;
        } else if (!(clientHp < p.hp && p.hp === maxHpVal)) {
          p.hp = clientHp;
        }

        if (p.hp <= 0) {
          if (!p.fainted) {
            p.faint();
          }
        } else {
          p.fainted = false;
          (p as unknown as { faintQueued: boolean }).faintQueued = false;
          clearPokemonFromFaintQueue(side, p);
          if (statuses && statuses[uid] !== undefined) {
            p.status = (statuses[uid] || '') as ID;
          } else if (p.status === 'fnt') {
            p.status = '' as ID;
          }
        }
      }
    }
  });
  console.debug(`[SYNC-SIDE] Side ${side.id}: after sync, pokemon:`, side.pokemon.map(p => `${p?.name} (uid:${(p as unknown as { uid?: string })?.uid}, hp:${p?.hp}, maxhp:${p?.maxhp}, fainted:${p?.fainted})`));
  (side as unknown as { pokemonLeft: number }).pokemonLeft = side.pokemon.filter(p => p && !p.fainted).length;
}
