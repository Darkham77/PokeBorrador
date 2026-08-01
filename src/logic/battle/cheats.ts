import { clearPokemonFromFaintQueue } from './helpers/showdownSyncHelper.ts';

export interface CheatPokemon {
  hp: number;
  maxhp?: number;
  maxHp?: number;
  status: string | null;
  fainted?: boolean;
  faintQueued?: boolean;
  active?: boolean;
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

/**
 * Applies the heal cheat to all Pokémon on the specified side/team.
 * Works seamlessly with both Showdown Simulator Pokemon and client-side Vue Pokemon store objects.
 */
export function applyHealCheatToSide(side: CheatSide | null | undefined): void {
  if (!side || !Array.isArray(side.pokemon)) return;
  side.pokemon.forEach(p => {
    if (p) {
      const maxHpVal = p.maxhp !== undefined ? p.maxhp : (p.maxHp !== undefined ? p.maxHp : 0);
      
      // Forzar asignación directa de HP en memoria para evitar que validaciones internas del método .heal() de Showdown restrinjan la curación en la banca
      p.hp = maxHpVal;
      p.status = p.maxhp !== undefined ? '' : null;
      
      // Resucitar explícita e incondicionalmente al Pokémon en el simulador
      const monObj = p as unknown as { fainted: boolean; faintQueued: boolean; switchFlag: boolean };
      monObj.fainted = false;
      monObj.faintQueued = false;
      monObj.switchFlag = false;

      clearPokemonFromFaintQueue(side, p);

      // Restaurar PP de todos los movimientos del simulador Showdown para evitar el uso forzado de Struggle en combates largos
      if (Array.isArray((p as unknown as { moveSlots?: Array<{ pp: number; maxpp: number }> }).moveSlots)) {
        (p as unknown as { moveSlots: Array<{ pp: number; maxpp: number }> }).moveSlots.forEach(slot => {
          if (slot) {
            slot.pp = slot.maxpp;
          }
        });
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

  reqPokemons.forEach((reqMon, i) => {
    if (reqMon) {
      const simMon = reqMon.uid
        ? simPokemons.find(p => p && (p as unknown as { uid?: string }).uid === reqMon.uid)
        : simPokemons[i];
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
}

/**
 * Shared generic function for Infinite Punching Bag (IPB) heal mechanics.
 * Evaluates active combatants' health and applies heal cheats identically across
 * both the fuzzer generator and the Web Worker / runtime simulator.
 */
export function processIPBHeals(
  battle: { p1: CheatSide; p2: CheatSide; turn: number },
  cheatsArray?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }> | null,
  clientP1Active?: CheatPokemon | null,
  clientP2Active?: CheatPokemon | null
): { p1Healed: boolean; p2Healed: boolean } {
  let p1Healed = false;
  let p2Healed = false;

  const p1Active = battle.p1?.active?.[0];
  if (p1Active && (p1Active.hp <= (p1Active.maxhp || p1Active.maxHp || 0) * 0.3 || p1Active.fainted)) {
    applyHealCheatToSide(battle.p1);
    syncRequestConditionsWithSimulator(battle.p1);
    p1Healed = true;
    if (Array.isArray(cheatsArray)) {
      cheatsArray.push({ turn: battle.turn, side: 'p1', type: 'heal' });
    }
    if (clientP1Active) {
      clientP1Active.hp = clientP1Active.maxhp || clientP1Active.maxHp || 0;
      clientP1Active.status = '';
    }
  }

  const p2Active = battle.p2?.active?.[0];
  if (p2Active && (p2Active.hp <= (p2Active.maxhp || p2Active.maxHp || 0) * 0.3 || p2Active.fainted)) {
    applyHealCheatToSide(battle.p2);
    syncRequestConditionsWithSimulator(battle.p2);
    p2Healed = true;
    if (Array.isArray(cheatsArray)) {
      cheatsArray.push({ turn: battle.turn, side: 'p2', type: 'heal' });
    }
    if (clientP2Active) {
      clientP2Active.hp = clientP2Active.maxhp || clientP2Active.maxHp || 0;
      clientP2Active.status = '';
    }
  }

  return { p1Healed, p2Healed };
}

