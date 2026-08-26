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

  const battle = Reflect.get(side, 'battle') as { makeRequest?: (type: string) => void; requestState?: string; sides?: Array<CheatSide | null> } | undefined;

  side.pokemon.forEach(p => {
    if (p) {
      p.fainted = false;
      if ('faintQueued' in p) {
        Reflect.set(p, 'faintQueued', false);
      }
      if ('switchFlag' in p) {
        Reflect.set(p, 'switchFlag', false);
      }
      clearPokemonFromFaintQueue(side, p);

      const maxHpVal = p.maxhp !== undefined ? p.maxhp : (p.maxHp !== undefined ? p.maxHp : 0);
      p.hp = maxHpVal;
      const cureFn = Reflect.get(p, 'cureStatus') as ((silent?: boolean) => boolean) | undefined;
      if (typeof cureFn === 'function') {
        cureFn.call(p, true);
      } else {
        p.status = '';
      }
    }
  });

  if (side.pokemonLeft !== undefined) {
    side.pokemonLeft = side.pokemon.length;
  }

  if (Array.isArray(side.active) && side.active.length > 0 && !side.active[0] && side.pokemon[0]) {
    side.active[0] = side.pokemon[0];
  }

  const allActiveAlive = Boolean(battle && Array.isArray(battle.sides) && battle.sides.every(s => !s || !Array.isArray(s.active) || s.active.every(p => !p || (!p.fainted && p.hp > 0))));
  if (battle && typeof battle.makeRequest === 'function' && battle.requestState === 'switch' && allActiveAlive) {
    battle.makeRequest('move');
  }

  syncRequestConditionsWithSimulator(side);
}

/**
 * Applies explicit PP refill cheat to all move slots of all Pokémon on the specified side/team.
 * Kept strictly decoupled from HP healing to preserve 1:1 replay parity.
 */
export function applyPpRefillCheatToSide(side: CheatSide | null | undefined): void {
  if (!side || !Array.isArray(side.pokemon)) return;

  side.pokemon.forEach(p => {
    if (p && Array.isArray(p.moveSlots)) {
      p.moveSlots.forEach(slot => {
        if (slot) {
          slot.pp = slot.maxpp;
        }
      });
    }
  });
}

/** Applies a visible Debug status action to the matching simulator team member. */
export function applyStatusCheatToSide(side: CompatibleSide | null | undefined, pokemonUid: string, status: string): void {
  if (!side || !Array.isArray(side.pokemon)) {
    throw new Error('[cheats] Cannot apply a status without a simulator side')
  }

  const target = side.pokemon.find(pokemon => {
    if (!pokemon || !('uid' in pokemon) || typeof pokemon.uid !== 'string') return false
    return isMatchingUid(pokemon.uid, pokemonUid)
  })
  if (!target) {
    throw new Error(`[cheats] Cannot find simulator Pokémon ${pokemonUid} for status synchronization`)
  }
  target.status = status
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
  const simPokemons = (side.pokemon as Array<(CheatPokemon & { name?: string; ident?: string; moveSlots?: Array<{ id: string; move?: string }>; moves?: string[] }) | null>).filter(Boolean);

  const matchedSimMons = new Set<unknown>();

  reqPokemons.forEach((reqMon) => {
    if (!reqMon) return;
    const reqId = reqMon.uid || reqMon.ident?.replace(/^p[1-4]a?:\s*/, '') || '';
    const reqMoves = (Reflect.get(reqMon, 'moves') as string[] | undefined) ?? []; // no-domain

    let simMon = simPokemons.find(p => {
      if (!p || matchedSimMons.has(p)) return false;
      if (reqMon.uid && p.uid && isMatchingUid(p.uid, reqMon.uid)) return true;
      if (reqId) {
        if (p.uid && isMatchingUid(p.uid, reqId)) return true;
        if (p.name && isMatchingUid(p.name, reqId)) return true;
        if (p.ident && isMatchingUid(p.ident.replace(/^p[1-4]a?:\s*/, ''), reqId)) return true;
      }
      return false;
    });

    if (!simMon && reqMoves.length > 0) {
      simMon = simPokemons.find(p => {
        if (!p || matchedSimMons.has(p)) return false;
        const pMoves: string[] = p.moves ?? (p.moveSlots?.map(ms => (ms as { id?: string; move?: string }).id || (ms as { id?: string; move?: string }).move || '').filter(Boolean) ?? []); // no-domain
        if (pMoves.length > 0 && reqMoves.every(rm => pMoves.some(pm => isMatchingUid(pm, rm)))) {
          return true;
        }
        return false;
      });
    }

    if (!simMon) {
      // Fallback matching by position index if not matched yet
      simMon = simPokemons.find(p => p && !matchedSimMons.has(p));
    }

    if (simMon) {
      matchedSimMons.add(simMon);
      const hp = simMon.hp;
      const maxhp = simMon.maxhp !== undefined ? simMon.maxhp : (simMon.maxHp !== undefined ? simMon.maxHp : 0);
      const status = simMon.status || '';
      const isFainted = simMon.fainted === true || hp <= 0;

      let cond = `${hp}/${maxhp}`;
      if (isFainted) {
        cond = '0 fnt';
      } else if (status) {
        cond = `${cond} ${status}`;
      }
      reqMon.condition = cond;
      Reflect.set(reqMon, 'fainted', isFainted);
      Reflect.set(reqMon, 'hp', hp);
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

