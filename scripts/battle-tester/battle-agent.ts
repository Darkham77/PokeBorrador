// scripts/battle-tester/battle-agent.ts

export interface ChoiceRequest {
  teamPreview?: boolean;
  forceSwitch?: boolean[];
  active?: Array<{
    moves: Array<{
      id: string;
      move: string;
      pp: number;
      disabled?: boolean;
    }>;
  }>;
  side?: {
    pokemon: Array<{
      ident: string;
      details: string;
      condition: string;
      active: boolean;
      stats: { hp: number };
      moves: string[];
      ability: string;
    }>;
  };
}

export class BattleAgent {
  constructor(public sideId: 'p1' | 'p2', public movesToTest: Set<string> = new Set()) {}

  /**
   * Decide la mejor opción basándose en la petición del simulador y
   * los movimientos que aún faltan por testear.
   */
  decide(request: ChoiceRequest): string {
    // 0. Si es Team Preview
    if (request.teamPreview) {
      return 'team 1';
    }

    // 1. Si es obligatorio cambiar de Pokémon
    if (request.forceSwitch && request.forceSwitch[0]) {
      const candidates = request.side?.pokemon || [];
      for (let i = 0; i < candidates.length; i++) {
        const mon = candidates[i]!;
        if (!mon.active && !mon.condition.includes('fnt')) {
          return `switch ${i + 1}`;
        }
      }
      return 'pass';
    }

    // 2. Auto-switch si el activo ya no tiene movimientos pendientes pero hay banca con pendientes
    if (request.active && request.active[0] && request.side?.pokemon) {
      const activePoke = request.side.pokemon.find(p => p.active);
      const activeHasPending = activePoke?.moves.some(m => this.movesToTest.has(m.toLowerCase().replace(/[^a-z0-9]/g, '')));

      if (!activeHasPending) {
        const candidates = request.side.pokemon;
        for (let i = 0; i < candidates.length; i++) {
          const mon = candidates[i]!;
          if (!mon.active && !mon.condition.includes('fnt')) {
            const candidateHasPending = mon.moves.some(m => this.movesToTest.has(m.toLowerCase().replace(/[^a-z0-9]/g, '')));
            if (candidateHasPending) {
              return `switch ${i + 1}`;
            }
          }
        }
      }
    }

    // 3. Si es posible usar un movimiento
    if (request.active && request.active[0]) {
      const moves = request.active[0].moves;
      
      // Intentar priorizar un movimiento que esté en nuestra lista de pendientes
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i]!;
        if (!m.disabled && m.pp > 0) {
          const moveIdClean = m.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (this.movesToTest.has(moveIdClean)) {
            // Eliminar de pendientes ya que lo vamos a usar
            this.movesToTest.delete(moveIdClean);
            return `move ${i + 1}`;
          }
        }
      }

      // Si no hay pendientes válidos en la lista, elegir un movimiento no deshabilitado de forma aleatoria para mayor dinamismo
      const validMoves: number[] = [];
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i]!;
        if (!m.disabled && m.pp > 0) {
          validMoves.push(i + 1);
        }
      }
      if (validMoves.length > 0) {
        const randomIdx = Math.floor(Math.random() * validMoves.length);
        return `move ${validMoves[randomIdx]}`;
      }

      return 'move 1'; // fallback
    }

    return 'pass';
  }
}
