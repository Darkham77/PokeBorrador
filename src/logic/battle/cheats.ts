export interface CheatPokemon {
  hp: number;
  maxhp?: number;
  maxHp?: number;
  status: string | null;
  fainted?: boolean;
}

export interface CheatSide {
  pokemon: Array<CheatPokemon | null>;
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
    }
  });
}
