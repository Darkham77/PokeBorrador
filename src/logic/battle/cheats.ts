export interface CheatPokemon {
  hp: number;
  maxhp?: number;
  maxHp?: number;
  status: string | null;
  fainted?: boolean;
  faintQueued?: boolean;
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
}

/**
 * Applies the heal cheat to all Pokémon on the specified side/team.
 * Works seamlessly with both Showdown Simulator Pokemon and client-side Vue Pokemon store objects.
 */
export function applyHealCheatToSide(side: CheatSide | null | undefined): void {
  if (!side || !Array.isArray(side.pokemon)) return;
  side.pokemon.forEach(p => {
    if (p) {
      const maxHpVal = p.maxhp !== undefined ? p.maxhp : (p.maxHp !== undefined ? p.maxHp : 0);
      p.hp = maxHpVal;
      p.status = p.maxhp !== undefined ? '' : null;
      if ('fainted' in p) {
        p.fainted = false;
      }
      if ('faintQueued' in p) {
        p.faintQueued = false;
      }
    }
  });
  if (side.pokemonLeft !== undefined) {
    side.pokemonLeft = side.pokemon.filter(p => p && !p.fainted).length;
  }
}

/**
 * Synchronizes Showdown's activeRequest side pokemon condition strings with actual simulator state.
 * Required so the simulator has the updated HP/status info when choosing moves/actions on subsequent turns.
 */
export function syncRequestConditionsWithSimulator(side: CheatSide | null | undefined): void {
  if (!side || !side.activeRequest) return;
  const activeRequest = side.activeRequest as { side?: { pokemon?: Array<RequestPokemon | null> } } | null;
  if (!activeRequest || !activeRequest.side || !Array.isArray(activeRequest.side.pokemon)) {
    return;
  }
  const reqPokemons = activeRequest.side.pokemon;
  const simPokemons = side.pokemon;
  for (let i = 0; i < reqPokemons.length; i++) {
    const simMon = simPokemons[i];
    const reqMon = reqPokemons[i];
    if (simMon && reqMon) {
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
}
