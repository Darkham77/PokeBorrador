import type { Pokemon } from '../../types/pokemon/pokemon';
import type { ShowdownPlayerRequest } from '../../types/battle/battle';

interface RequestPokemonWithUid {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  uid?: string;
}

export class ShowdownTeamResolver {
  /**
   * Resuelve el orden actual de los Pokémon según Showdown (activo primero).
   */
  static getShowdownOrder(team: Pokemon[], request: ShowdownPlayerRequest | null | undefined): Pokemon[] {
    if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
      return [...team];
    }
    
    const resolved: Pokemon[] = [];
    request.side.pokemon.forEach((reqMon) => {
      const pWithUid = reqMon as RequestPokemonWithUid | null | undefined; // domain-ok
      if (pWithUid && pWithUid.uid) {
        const found = team.find(p => p && p.uid === pWithUid.uid);
        if (found) resolved.push(found);
      }
    });
    
    // Agregar Pokémon restantes por seguridad
    team.forEach((p) => {
      if (p && !resolved.some(r => r.uid === p.uid)) {
        resolved.push(p);
      }
    });
    
    return resolved;
  }

  /**
   * Encuentra un Pokémon en el equipo reactivo por su UID.
   */
  static getPokemonByUid(team: Pokemon[], uid: string): Pokemon | null {
    if (!uid) return null;
    const found = team.find(p => p && p.uid === uid);
    if (!found) {
      throw new Error(`[ShowdownTeamResolver] Pokémon con UID "${uid}" no encontrado en el equipo.`);
    }
    return found;
  }

  /**
   * Encuentra un Pokémon en el equipo reactivo por su índice en la lista de Showdown (1-based).
   */
  static getPokemonByShowdownSlot(team: Pokemon[], request: ShowdownPlayerRequest | null | undefined, slotNum: number): Pokemon | null {
    if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
      const found = team[slotNum - 1];
      if (!found) {
        throw new Error(`[ShowdownTeamResolver] Pokémon no encontrado en slot posicional ${slotNum}.`);
      }
      return found;
    }
    const reqMon = request.side.pokemon[slotNum - 1] as RequestPokemonWithUid | null | undefined; // domain-ok
    if (!reqMon || !reqMon.uid) {
      throw new Error(`[ShowdownTeamResolver] Slot de Showdown ${slotNum} no tiene un Pokémon válido.`);
    }
    return this.getPokemonByUid(team, reqMon.uid);
  }

  /**
   * Obtiene el slot (1-based index) de Showdown para un Pokémon por su UID.
   */
  static getShowdownSlotForUid(request: ShowdownPlayerRequest | null | undefined, uid: string): number {
    if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
      throw new Error(`[ShowdownTeamResolver] No se puede obtener slot para UID "${uid}" porque el request de Showdown está ausente.`);
    }
    const list = request.side.pokemon as Array<{ uid?: string } | null | undefined>;
    const idx = list.findIndex((p) => p && p.uid === uid);
    if (idx === -1) {
      const availableUids = list.map((p) => p?.uid || 'null');
      throw new Error(`[ShowdownTeamResolver] UID "${uid}" no encontrado en los UIDs del request: ${JSON.stringify(availableUids)}`);
    }
    return idx + 1;
  }
}
