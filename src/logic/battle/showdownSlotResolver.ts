import type { Pokemon } from '../../types/pokemon/pokemon.ts';
import type { ShowdownPlayerRequest } from '../../types/battle/battle.ts';
import { isMatchingUid } from './showdownUidMapper.ts';

interface RequestPokemonWithUid {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  uid?: string;
}

export class ShowdownSlotResolver {
  /**
   * Encuentra un Pokémon en el equipo reactivo por su índice en la lista de Showdown (1-based).
   */
  static getPokemonByShowdownSlot(
    team: Pokemon[],
    request: ShowdownPlayerRequest | null | undefined,
    slotNum: number,
    getPokemonByUid: (team: Pokemon[], uid: string) => Pokemon | null
  ): Pokemon | null {
    if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
      const found = team[slotNum - 1];
      if (!found) {
        throw new Error(`[ShowdownSlotResolver] Pokémon no encontrado en slot posicional ${slotNum}.`);
      }
      return found;
    }
    const reqMon = request.side.pokemon[slotNum - 1] as RequestPokemonWithUid | null | undefined;
    if (!reqMon || !reqMon.uid) {
      throw new Error(`[ShowdownSlotResolver] Slot de Showdown ${slotNum} no tiene un Pokémon válido.`);
    }
    return getPokemonByUid(team, reqMon.uid);
  }

  /**
   * Obtiene el slot (1-based index) de Showdown para un Pokémon por su UID.
   */
  static getShowdownSlotForUid(request: ShowdownPlayerRequest | null | undefined, uid: string): number {
    if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
      throw new Error(`[ShowdownSlotResolver] No se puede obtener slot para UID "${uid}" porque el request de Showdown está ausente.`);
    }
    const list = request.side.pokemon as Array<{ uid?: string } | null | undefined>;
    const idx = list.findIndex((p) => p && isMatchingUid(p.uid, uid));
    if (idx === -1) {
      const availableUids = list.map((p) => p?.uid || 'null');
      throw new Error(`[ShowdownSlotResolver] UID "${uid}" no encontrado en los UIDs del request: ${JSON.stringify(availableUids)}`);
    }
    return idx + 1;
  }
}
