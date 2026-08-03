import { clearPokemonFromFaintQueue } from './helpers/showdownSyncHelper.ts';
import { isMatchingUid } from './showdownUidMapper.ts';

import type { Side } from '@pkmn/sim';

export interface CheatPokemon {
  uid?: string;
  hp: number;
  maxhp?: number;
  maxHp?: number;
  status: string | null;
  fainted?: boolean;
  faintQueued?: boolean;
  active?: boolean;
  moveSlots?: Array<{ pp: number; maxpp: number }>;
}

export interface RequestPokemon {
  condition?: string;
  ident?: string;
  details?: string;
  active?: boolean;
  uid?: string;
}

export interface CheatSide {
  pokemon: Array<CheatPokemon | null>;
  pokemonLeft?: number;
  activeRequest?: unknown;
  active?: Array<CheatPokemon | null>;
}

export type CompatibleSide = Side | CheatSide;

/**
 * Applies the heal cheat to all Pokémon on the specified side/team.
 * Works seamlessly with both Showdown Simulator Pokemon and client-side Vue Pokemon store objects.
 */
export function applyHealCheatToSide(side: CheatSide | null | undefined): void {
  if (!side || !Array.isArray(side.pokemon)) return;

  side.pokemon.forEach(p => {
    if (p) {
      p.fainted = false;
      if ('faintQueued' in p) {
        Reflect.set(p, 'faintQueued', false);
      }
      clearPokemonFromFaintQueue(side, p);

      const maxHpVal = p.maxhp !== undefined ? p.maxhp : (p.maxHp !== undefined ? p.maxHp : 0);
      p.hp = maxHpVal;
      p.status = '';

      if (Array.isArray(p.moveSlots)) {
        p.moveSlots.forEach(slot => {
          if (slot) {
            slot.pp = slot.maxpp;
          }
        });
      }
    }
  });

  if (side.pokemonLeft !== undefined) {
    side.pokemonLeft = side.pokemon.length;
  }
}

/**
 * Synchronizes Showdown's activeRequest side pokemon condition strings with actual simulator state.
 * Required so the simulator has the updated HP/status info when choosing moves/actions on subsequent turns.
 */
export function syncRequestConditionsWithSimulator(side: CompatibleSide | null | undefined): void {
  if (!side || !side.activeRequest) return;
  const activeRequest = side.activeRequest as { side?: { pokemon?: Array<RequestPokemon | null> } } | null;
  if (!activeRequest || !activeRequest.side || !Array.isArray(activeRequest.side.pokemon)) {
    return;
  }
  const reqPokemons = activeRequest.side.pokemon;
  const simPokemons = side.pokemon;

  reqPokemons.forEach((reqMon, i) => {
    if (reqMon) {
      const simMon = reqMon.uid
        ? (simPokemons as Array<CheatPokemon | null>).find(p => p && isMatchingUid(p.uid, reqMon.uid))
        : (simPokemons as Array<CheatPokemon | null>)[i];
      if (simMon) {
        const hp = simMon.hp;
        const maxhp = simMon.maxhp !== undefined ? simMon.maxhp : (simMon.maxHp !== undefined ? simMon.maxHp : 0);
        const status = simMon.status || '';
        
        let cond = `${hp}/${maxhp}`;
        if (hp <= 0) {
          cond = '0 fnt';
        } else if (status) {
          cond = `${cond} ${status}`;
        }
        reqMon.condition = cond;
      }
    }
  });

  const active = (side.activeRequest as { active?: Array<{ moves?: Array<{ disabled?: boolean | string }> }> })?.active;
  if (Array.isArray(active)) {
    active.forEach(act => {
      if (act && Array.isArray(act.moves)) {
        act.moves.forEach(m => {
          if (m && m.disabled === 'pp') {
            m.disabled = false;
          }
        });
      }
    });
  }
}



