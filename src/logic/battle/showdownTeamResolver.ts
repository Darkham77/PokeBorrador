import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import type { ShowdownPlayerRequest } from '../../types/battle/battle.ts';
import { isMatchingUid } from './showdownUidMapper.ts';
import { ShowdownSlotResolver } from './showdownSlotResolver.ts';

interface RequestPokemonWithUid {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  uid?: string;
}

export class ShowdownTeamResolver {
  /**
   * Resolves current Pokémon order according to Showdown (active first).
   */
  static getShowdownOrder(team: Pokemon[], request: ShowdownPlayerRequest | null | undefined): Pokemon[] {
    if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
      return team;
    }
    
    const resolved: Pokemon[] = [];
    request.side.pokemon.forEach((reqMon) => {
      const pWithUid = reqMon as RequestPokemonWithUid | null | undefined; // domain-ok: Open dynamic text or non-domain string payload
      if (pWithUid && pWithUid.uid) {
        const found = team.find(p => p && p.uid === pWithUid.uid);
        if (found) resolved.push(found);
      }
    });
    
    // Append remaining Pokémon for safety
    team.forEach((p) => {
      if (p && !resolved.some(r => r.uid === p.uid)) {
        resolved.push(p);
      }
    });
    
    return resolved;
  }

  /**
   * Finds a Pokémon in the reactive team by its UID.
   */
  static getPokemonByUid(team: Pokemon[], uid: string): Pokemon | null {
    if (!uid) return null;
    const found = team.find(p => p && isMatchingUid(p.uid, uid));
    if (!found) {
      throw new Error(`[ShowdownTeamResolver] Pokémon con UID "${uid}" no encontrado en el equipo.`);
    }
    return found;
  }

  /**
   * Finds a Pokémon in the reactive team by its Showdown list index (1-based).
   */
  static getPokemonByShowdownSlot(team: Pokemon[], request: ShowdownPlayerRequest | null | undefined, slotNum: number): Pokemon | null {
    return ShowdownSlotResolver.getPokemonByShowdownSlot(team, request, slotNum, ShowdownTeamResolver.getPokemonByUid);
  }

  /**
   * Gets the Showdown slot (1-based index) for a Pokémon by its UID.
   */
  static getShowdownSlotForUid(request: ShowdownPlayerRequest | null | undefined, uid: string): number {
    return ShowdownSlotResolver.getShowdownSlotForUid(request, uid);
  }
}
