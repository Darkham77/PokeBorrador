// scripts/battle-tester/fuzzer-agent.ts

export interface SidePokemon {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  stats: { hp: number };
  moves: string[];
  ability: string;
}

//
// BattleAgent robusto para el fuzzer de cobertura.
// Maneja los cuatro tipos de request del simulador Showdown:
//   null / undefined → pass
//   teamPreview      → team 1
//   forceSwitch      → switch <N> (nunca pass si hay candidatos)
//   active (move)    → movimiento o switch voluntario
//
// La regla más importante: NUNCA enviar 'move X' si el request no tiene
// un bloque 'active' válido, y NUNCA enviar 'switch X' si el request
// no es forceSwitch ni periódico. Esto elimina el error "invalid action".
//

export interface ChoiceRequest {
  teamPreview?: boolean;
  forceSwitch?: boolean[];
  wait?: boolean;
  active?: Array<{
    moves: Array<{
      id: string;
      move: string;
      pp: number;
      disabled?: boolean;
      maxMove?: { id: string };
    }>;
    canMegaEvo?: boolean;
    trapped?: boolean;
  }> | null;
  side?: {
    pokemon: SidePokemon[];
  };
}

/** Tipo discriminado del request de Showdown para evitar acciones inválidas. */
type RequestKind = 'none' | 'team-preview' | 'force-switch' | 'move' | 'wait';

function classifyRequest(req: ChoiceRequest | null | undefined): RequestKind {
  if (!req) return 'none';
  if (req.wait) return 'wait';
  if (req.teamPreview) return 'team-preview';
  if (req.forceSwitch?.length) return 'force-switch';
  if (req.active?.length) return 'move';
  return 'none';
}

export class BattleAgent {
  private turnCount = 0;
  /** Marca si el último decide() ejecutó un switch voluntario (para evitar doble-switch). */
  private justSwitched = false;

  constructor(
    public sideId: 'p1' | 'p2',
    public movesToTest: Set<string> = new Set(),
    /** Slot de movimiento (1-based) que el agente NPC debe priorizar para disparar la habilidad rival. */
    public abilityTriggerMoveSlot: number | null = null,
    /** Cada cuántos turnos rotar voluntariamente al siguiente Pokémon sano de la banca. */
    public periodicSwitchEvery: number = 4,
    /**
     * Permite al agente generar elecciones useitem:potion/revive.
     * Desactivar en fuzzers de movimientos/habilidades para garantizar
     * determinismo completo con el E2E (solo el fuzzer de ítems lo habilita).
     */
    public useItemsEnabled: boolean = true,
  ) {}

  /**
   * Decide la acción según el request actual del simulador.
   * Garantiza que el tipo de acción (move/switch/pass) sea siempre coherente
   * con lo que Showdown espera en ese momento.
   */
  decide(request: ChoiceRequest | null | undefined, forceOffensive?: boolean): string {
    const kind = classifyRequest(request);

    // Si el simulador no espera nada de este lado, no hacer nada.
    if (kind === 'none' || kind === 'wait') return 'pass';

    this.turnCount++;
    this.justSwitched = false;

    // --- TEAM PREVIEW ---
    if (kind === 'team-preview') return 'team 1';

    const team: SidePokemon[] = request!.side?.pokemon ?? [];

    // --- FORCE SWITCH ---
    // El simulador EXIGE un switch. Iterar todo el equipo para encontrar un
    // candidato vivo y disponible. Solo se permite 'pass' si todos están debilitados.
    if (kind === 'force-switch') {
      for (let i = 0; i < team.length; i++) {
        const mon = team[i]!;
        if (!mon.active && !this.isFainted(mon.condition)) {
          return `switch ${i + 1}`;
        }
      }
      // Todos debilitados: es el único caso válido para 'pass' en forceSwitch.
      return 'pass';
    }

    // --- MOVE REQUEST ---
    // A partir de aquí kind === 'move'. El simulador espera una acción del Pokémon activo.

    // Alinear con la IA del juego real en battleTurn.ts:
    const activePoke = team.find(p => p.active) || team[0];
    if (!activePoke) return 'move 1';



    const isTrapped = !!request?.active?.[0]?.trapped;

    // Switch periódico voluntario (para probar habilidades de switch-out/in).
    // Solo si el equipo tiene banca disponible, no acabamos de switchear y NO estamos atrapados.
    if (
      !forceOffensive &&
      !isTrapped &&
      !this.justSwitched &&
      this.periodicSwitchEvery > 0 &&
      this.turnCount % this.periodicSwitchEvery === 0 &&
      team.length > 1
    ) {
      const switchTarget = this.findBenchCandidate(team);
      if (switchTarget !== null) {
        this.justSwitched = true;
        return `switch ${switchTarget}`;
      }
    }

    // Auto-switch si el Pokémon activo agotó su lista de movimientos pendientes
    // pero otro en banca todavía tiene pendientes, y NO estamos atrapados.
    const activeHasPending = activePoke?.moves.some(
      m => this.movesToTest.has(toCleanId(m)),
    );
    if (!isTrapped && !activeHasPending && this.movesToTest.size > 0 && !this.justSwitched) {
      for (let i = 0; i < team.length; i++) {
        const mon = team[i]!;
        if (!mon.active && !this.isFainted(mon.condition)) {
          const hasPending = mon.moves.some(m => this.movesToTest.has(toCleanId(m)));
          if (hasPending) {
            this.justSwitched = true;
            return `switch ${i + 1}`;
          }
        }
      }
    }

    // Elegir movimiento del Pokémon activo.
    const activeSlot = request!.active![0];
    if (!activeSlot) return 'pass';

    const moves = activeSlot.moves;

    // Slot trigger de habilidad (agente NPC: provoca la habilidad del jugador).
    if (this.abilityTriggerMoveSlot !== null) {
      const triggerIdx = this.abilityTriggerMoveSlot - 1;
      const trigger = moves[triggerIdx];
      if (trigger && !trigger.disabled && trigger.pp > 0) {
        return `move ${this.abilityTriggerMoveSlot}`;
      }
    }

    // Priorizar movimientos pendientes de testear.
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      if (!m.disabled && m.pp > 0) {
        const id = toCleanId(m.id);
        if (this.movesToTest.has(id)) {
          this.movesToTest.delete(id);
          return `move ${i + 1}`;
        }
      }
    }

    const DEFENSIVE_MOVES = new Set([
      'recover', 'substitute', 'protect', 'detect', 'softboiled', 'roost', 'slackoff', 
      'milkdrink', 'healorder', 'wish', 'rest', 'spikyshield', 'banefulbunker', 
      'obstruct', 'kingsshield', 'silktrap', 'shoreup', 'lifedew', 'nastyplot', 'calmmind'
    ]);

    // Cualquier movimiento válido disponible.
    const validSlots: number[] = [];
    const offensiveSlots: number[] = [];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      if (!m.disabled && m.pp > 0) {
        validSlots.push(i + 1);
        const cleanId = toCleanId(m.id);
        if (!DEFENSIVE_MOVES.has(cleanId)) {
          offensiveSlots.push(i + 1);
        }
      }
    }

    if (forceOffensive && offensiveSlots.length > 0) {
      return `move ${offensiveSlots[Math.floor(Math.random() * offensiveSlots.length)]}`;
    }
    if (validSlots.length > 0) {
      return `move ${validSlots[Math.floor(Math.random() * validSlots.length)]}`;
    }

    // Último recurso: si todos los movimientos están deshabilitados (struggle).
    // Showdown acepta 'move 1' para usar Struggle automáticamente.
    return 'move 1';
  }

  // ---------------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------------

  /** Devuelve el índice 1-based de un candidato en banca, o null si no hay ninguno. */
  private findBenchCandidate(team: SidePokemon[]): number | null {
    for (let i = 0; i < team.length; i++) {
      const mon = team[i]!;
      if (!mon.active && !this.isFainted(mon.condition)) return i + 1;
    }
    return null;
  }

  /** Devuelve true si la condición del Pokémon indica que está debilitado. */
  private isFainted(condition: string): boolean {
    return condition === '0 fnt' || condition.endsWith(' fnt');
  }
}

/** Normaliza un ID de movimiento para comparación contra movesToTest. */
function toCleanId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}
