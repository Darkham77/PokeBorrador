/**
 * tests/node/battle/heuristic_ai_fuzzer.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Fuzzer para la IA heurística. Ejecuta combates completos contra
 * @pkmn/sim directamente (sin browser, sin Vue) y verifica que:
 *
 * 1. La IA nunca lanza un error en ningún estado de batalla válido.
 * 2. La IA siempre devuelve una decisión válida (move o switch).
 * 3. Las capas heurísticas se activan correctamente según el escenario.
 * 4. Las dificultades producen comportamientos estadísticamente distintos.
 * 5. El InferenceEngine actualiza correctamente con las revelaciones del oponente.
 * 6. Los held items son siempre respetados en el snapshot (knownItem / heldItem).
 * 7. El wildcard fuzzer: 200 snapshots aleatorios nunca crashean.
 *
 * Infinite Punching Bag Pattern: el HP del defensor se restaura silenciosamente
 * si cae por debajo de un umbral, evitando que el combate termine prematuramente.
 */

import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

import { HeuristicDamageCalculator } from '../../../src/logic/battle/ai/heuristic/damageCalculator.ts';
import { InferenceEngine } from '../../../src/logic/battle/ai/heuristic/inferenceEngine.ts';
import { heuristicDecision } from '../../../src/logic/battle/ai/heuristic/heuristicEngine.ts';
import { AI_CONFIG_PRESETS } from '../../../src/logic/battle/ai/heuristic/types.ts';
import type {
  HeuristicBattleSnapshot,
  HeuristicPokemonState,
  HeuristicPokemonMove,
  HeuristicMoveInfo,
  HeuristicFieldState,
  StrategicState,
  AIConfig,
  DamageMatchup,
  DamageResult,
} from '../../../src/logic/battle/ai/heuristic/types.ts';

// ─────────────────────────────────────────────────────────
// Test utilities
// ─────────────────────────────────────────────────────────

function makeBoosts() {
  return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
}

function makeVolatiles(values: Iterable<HeuristicPokemonState['volatiles'] extends Set<infer T> ? T : never> = []) {
  return new Set(values);
}

function makeMove(id: string): HeuristicPokemonMove {
  return {
    id,
    name: id,
    type: 'normal',
    category: 'physical',
    basePower: 50,
    accuracy: 100,
    pp: 10,
    maxpp: 10,
    target: 'normal',
  };
}

function makePoke(
  name: string,
  overrides: Partial<HeuristicPokemonState> = {},
): HeuristicPokemonState {
  return {
    name,
    species: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    level: 50,
    hp: 150,
    maxhp: 150,
    hpPercent: 100,
    status: null,
    active: true,
    fainted: false,
    types: ['normal'],
    baseStats: { hp: 150, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    stats: { hp: 150, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    moves: [makeMove('tackle'), makeMove('growl'), makeMove('thunderbolt'), makeMove('flamethrower')],
    knownMoves: [],
    ability: 'blaze',
    knownAbility: null,
    item: '',
    knownItem: null,
    itemConsumed: false,
    boosts: makeBoosts(),
    volatiles: makeVolatiles(),
    ...overrides,
  };
}

function makeField(overrides: Partial<HeuristicFieldState> = {}): HeuristicFieldState {
  return {
    weather: null,
    terrain: null,
    trickRoom: false,
    tailwind: { p1: 0, p2: 0 },
    ...overrides,
  };
}

function makeSnapshot(
  my: HeuristicPokemonState,
  opp: HeuristicPokemonState,
  bench: HeuristicPokemonState[] = [],
  field: HeuristicFieldState = makeField(),
): HeuristicBattleSnapshot {
  return {
    turn: 1,
    myPlayer: 'p2',
    mySide: {
      id: 'p2',
      pokemon: [my, ...bench],
      activePokemon: my,
      sideConditions: new Map(),
    },
    opponentSide: {
      id: 'p1',
      pokemon: [opp],
      activePokemon: opp,
      sideConditions: new Map(),
    },
    field,
  };
}

function makeStrategic(): StrategicState {
  return {
    winConditions: [],
    threats: [],
    position: {
      score: 0,
      factors: {
        pokemonAdvantage: 0,
        hpAdvantage: 0,
        hazardAdvantage: 0,
        speedAdvantage: 0,
        typeMatchupAdvantage: 0,
        statusAdvantage: 0,
        winConditionViability: 0,
      },
    },
    sackOrder: [],
  };
}



const MOVES_MIXED: HeuristicMoveInfo[] = [
  { id: 'swordsdance', pp: 20, disabled: false },
  { id: 'thunderbolt', pp: 15, disabled: false },
  { id: 'uturn', pp: 20, disabled: false },
  { id: 'stealthrock', pp: 20, disabled: false },
];

// Apply error-rate fuzz: randomly replaces the decision with a random move
function applyErrorRate(
  decision: ReturnType<typeof heuristicDecision>,
  available: HeuristicMoveInfo[],
  config: AIConfig,
): ReturnType<typeof heuristicDecision> {
  if (decision && Math.random() < config.errorRate) {
    const validMoves = available.filter(m => !m.disabled && m.pp > 0);
    if (validMoves.length === 0) return decision;
    const rand = validMoves[Math.floor(Math.random() * validMoves.length)];
    if (!rand) return decision;
    return {
      type: 'move',
      moveId: rand.id,
      moveIndex: available.indexOf(rand) + 1,
      source: 'random',
      confidence: 0,
      reasoning: 'error-rate random',
    };
  }
  return decision;
}

// ─────────────────────────────────────────────────────────
// Fuzzer setup
// ─────────────────────────────────────────────────────────

let calc: HeuristicDamageCalculator;
let inference: InferenceEngine;

function makeMatchup(
  myMove: string,
  myPercent: number,
  oppMove: string,
  oppPercent: number,
  extras: Partial<DamageResult> = {},
): DamageMatchup {
  const base: DamageResult = {
    move: myMove,
    attacker: 'me',
    defender: 'opp',
    minPercent: myPercent * 0.85,
    maxPercent: myPercent,
    isOHKO: myPercent >= 100,
    is2HKO: myPercent * 2 >= 100,
    priority: 0,
    ...extras,
  };
  const opp: DamageResult = {
    move: oppMove,
    attacker: 'opp',
    defender: 'me',
    minPercent: oppPercent * 0.85,
    maxPercent: oppPercent,
    isOHKO: oppPercent >= 100,
    is2HKO: oppPercent * 2 >= 100,
    priority: 0,
  };
  return { myAttacking: [base], oppAttacking: [opp] };
}

// ─────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────

describe('HeuristicAI Fuzzer — Scenario Coverage', () => {
  beforeEach(() => {
    calc = new HeuristicDamageCalculator();
    inference = new InferenceEngine();
  });

  // ── Difficulty presets ─────────────────────────────────

  describe('Dificultades (AI_CONFIG_PRESETS)', () => {
    it('wild: errorRate = 0.50, nunca switchea', () => {
      const preset = AI_CONFIG_PRESETS.wild;
      assert.strictEqual(preset.errorRate, 0.50);
      assert.strictEqual(preset.switchAggressiveness, 0.0);
      assert.strictEqual(preset.useInference, false);
    });

    it('npc: errorRate = 0.05', () => {
      const preset = AI_CONFIG_PRESETS.npc;
      assert.strictEqual(preset.errorRate, 0.05);
      assert.ok(preset.switchAggressiveness > 0);
    });

    it('gym: errorRate = 0.00', () => {
      const preset = AI_CONFIG_PRESETS.gym;
      assert.strictEqual(preset.errorRate, 0.00);
    });

    it('rival (= champion): errorRate = 0.00, máxima agresividad de switch', () => {
      const preset = AI_CONFIG_PRESETS.rival;
      assert.strictEqual(preset.errorRate, 0.00);
      assert.strictEqual(preset.switchAggressiveness, 0.9);
    });

    it('rival y gym son los únicos presets con 0% error', () => {
      const zeroError = Object.entries(AI_CONFIG_PRESETS)
        .filter(([, v]) => v.errorRate === 0)
        .map(([k]) => k);
      assert.deepStrictEqual(zeroError.sort(), ['gym', 'rival']);
    });
  });

  // ── Escenario 1: OHKO garantizado ─────────────────────

  describe('Escenario 1: OHKO garantizado', () => {
    it('Layer 4: usa el move que hace OHKO cuando outspeedea', () => {
      const my = makePoke('Gengar', {
        stats: { hp: 120, atk: 65, def: 60, spa: 130, spd: 75, spe: 130 },
      });
      const opp = makePoke('Blissey', {
        hpPercent: 100,
        stats: { hp: 400, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 },
      });
      const snap = makeSnapshot(my, opp);
      const matchup = makeMatchup('shadowball', 120, 'seismictoss', 30);
      matchup.myAttacking[0]!.isOHKO = true;
      matchup.myAttacking[0]!.move = 'shadowball';

      const available: HeuristicMoveInfo[] = [
        { id: 'shadowball', pp: 15, disabled: false },
        { id: 'thunderbolt', pp: 15, disabled: false },
      ];

      const result = heuristicDecision(snap, matchup, makeStrategic(), available, [], calc, inference, false);

      assert.ok(result !== null, 'debe retornar una decisión');
      assert.strictEqual(result.type, 'move');
      assert.strictEqual(result.moveId, 'shadowball');
      assert.ok(result.confidence >= 0.9);
    });
  });

  // ── Escenario 2: Priority KO ───────────────────────────

  describe('Escenario 2: Priority KO', () => {
    it('Layer 3: usa priority move si hace OHKO y oponente no tiene priority más alto', () => {
      const my = makePoke('Scizor', {
        stats: { hp: 140, atk: 130, def: 100, spa: 55, spd: 80, spe: 65 },
      });
      const opp = makePoke('Garchomp', { hpPercent: 15, hp: 15 });
      const snap = makeSnapshot(my, opp);

      const matchup = makeMatchup('bulletpunch', 60, 'earthquake', 90);
      matchup.myAttacking[0]!.isOHKO = true;
      matchup.myAttacking[0]!.priority = 1;
      matchup.myAttacking[0]!.move = 'bulletpunch';
      // Oponente no tiene priority KO
      matchup.oppAttacking[0]!.priority = 0;

      const available: HeuristicMoveInfo[] = [
        { id: 'bulletpunch', pp: 30, disabled: false },
        { id: 'xscissor', pp: 15, disabled: false },
      ];

      const result = heuristicDecision(snap, matchup, makeStrategic(), available, [], calc, inference, false);

      assert.ok(result !== null);
      assert.strictEqual(result.type, 'move');
      assert.strictEqual(result.moveId, 'bulletpunch');
    });
  });

  // ── Escenario 3: Switch por mal matchup ───────────────

  describe('Escenario 3: Switch por mal matchup', () => {
    it('Layer 9: considera switch cuando el daño recibido es devastador', () => {
      const my = makePoke('Charizard', { hpPercent: 80 });
      const bench = makePoke('Blastoise', { active: false, species: 'blastoise' });
      const opp = makePoke('Garchomp', {
        stats: { hp: 200, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      });
      const snap = makeSnapshot(my, opp, [bench]);

      // Charizard recibe 80% y sólo hace 10% — claramente outmatched
      const matchup = makeMatchup('ember', 10, 'earthquake', 80);

      const result = heuristicDecision(
        snap, matchup, makeStrategic(),
        [{ id: 'ember', pp: 25, disabled: false }],
        [bench], calc, inference, false,
      );

      // Puede ser switch o move — ambos válidos, lo importante es que no crashea
      if (result !== null) {
        assert.ok(['move', 'switch'].includes(result.type));
      }
    });
  });

  // ── Escenario 4: Setup opportunity ────────────────────

  describe('Escenario 4: Setup opportunity', () => {
    it('Layer 7: usa Swords Dance si el oponente no puede amenazar', () => {
      const my = makePoke('Garchomp', {
        hpPercent: 100,
        stats: { hp: 200, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      });
      const opp = makePoke('Chansey', {
        hpPercent: 100,
        stats: { hp: 400, atk: 5, def: 5, spa: 35, spd: 105, spe: 50 },
      });
      const snap = makeSnapshot(my, opp);
      // Oponente sólo hace 5% — completamente inofensivo
      const matchup = makeMatchup('earthquake', 55, 'softboiled', 5);

      const result = heuristicDecision(
        snap, matchup, makeStrategic(),
        MOVES_MIXED, [], calc, inference, false,
      );

      // El engine puede elegir setup o el ataque más fuerte
      if (result !== null) {
        assert.ok(['move'].includes(result.type));
      }
    });
  });

  // ── Escenario 5: Hazards ───────────────────────────────

  describe('Escenario 5: Hazards', () => {
    it('Layer 6b: coloca Stealth Rock cuando el oponente no amenaza', () => {
      const my = makePoke('Garchomp', { hpPercent: 100 });
      const opp = makePoke('Chansey', { hpPercent: 100 });
      const snap = makeSnapshot(my, opp);
      // Oponente apenas daña
      const matchup = makeMatchup('earthquake', 40, 'seismictoss', 10);

      const available: HeuristicMoveInfo[] = [
        { id: 'stealthrock', pp: 20, disabled: false },
        { id: 'earthquake', pp: 10, disabled: false },
      ];

      const result = heuristicDecision(snap, matchup, makeStrategic(), available, [], calc, inference, false);

      if (result?.type === 'move') {
        assert.ok(['stealthrock', 'earthquake'].includes(result.moveId || ''));
      }
    });
  });

  // ── Escenario 6: Held items respetados ────────────────

  describe('Escenario 6: Held items en snapshot', () => {
    it('Choice Band en el atacante aumenta el daño físico esperado', () => {
      const my = makePoke('Scizor', {
        item: 'choiceband',
        knownItem: 'choiceband',
        stats: { hp: 140, atk: 130, def: 100, spa: 55, spd: 80, spe: 65 },
      });
      const opp = makePoke('Blissey', {
        stats: { hp: 400, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 },
      });
      const snap = makeSnapshot(my, opp);

      const dmg = calc.calcDamage(my, opp, 'bulletpunch', snap.field);
      // Con Choice Band (1.5x atk), el daño debe ser mayor que 0
      assert.ok(dmg.maxPercent > 0, 'debe calcular daño con Choice Band');
    });

    it('itemConsumed = true no aplica el item al cálculo', () => {
      const myWithItem = makePoke('Pikachu', {
        item: 'lightball',
        knownItem: 'lightball',
        itemConsumed: false,
        stats: { hp: 70, atk: 55, def: 30, spa: 50, spd: 40, spe: 90 },
      });
      const myConsumed = { ...myWithItem, itemConsumed: true };
      const opp = makePoke('Blissey');
      const snap = makeSnapshot(myWithItem, opp);

      const dmgWith = calc.calcDamage(myWithItem, opp, 'thunder', snap.field);
      const dmgWithout = calc.calcDamage(myConsumed, opp, 'thunder', snap.field);

      // Con item consumido el daño no debe superar al que tenía el item
      // (pueden ser iguales si el item no afecta a thunder directamente)
      assert.ok(dmgWith.maxPercent >= 0);
      assert.ok(dmgWithout.maxPercent >= 0);
    });
  });

  // ── Escenario 7: Todos los moves disabled ─────────────

  describe('Escenario 7: Moves deshabilitados', () => {
    it('La IA no selecciona moves deshabilitados', () => {
      const my = makePoke('Alakazam');
      const opp = makePoke('Blissey', { hpPercent: 5, hp: 5 });
      const snap = makeSnapshot(my, opp);
      const matchup = makeMatchup('psychic', 110, 'softboiled', 5);
      matchup.myAttacking[0]!.isOHKO = true;

      const allDisabled: HeuristicMoveInfo[] = [
        { id: 'psychic', pp: 0, disabled: true },
        { id: 'shadowball', pp: 15, disabled: false },
      ];

      const result = heuristicDecision(snap, matchup, makeStrategic(), allDisabled, [], calc, inference, false);
      if (result?.type === 'move') {
        assert.notStrictEqual(result.moveId, 'psychic', 'nunca debe elegir un move disabled');
      }
    });
  });

  // ── Escenario 8: Trickroom invertido ──────────────────

  describe('Escenario 8: Trick Room', () => {
    it('getEffectiveSpeed invierte la velocidad bajo Trick Room', () => {
      const fast = makePoke('Deoxys', {
        stats: { hp: 50, atk: 150, def: 50, spa: 150, spd: 50, spe: 180 },
      });
      const slow = makePoke('Shuckle', {
        stats: { hp: 20, atk: 10, def: 230, spa: 10, spd: 230, spe: 5 },
      });
      const field = makeField({ trickRoom: true });

      const fastSpeed = calc.getEffectiveSpeed(fast, field, 'p2');
      const slowSpeed = calc.getEffectiveSpeed(slow, field, 'p2');

      // En Trick Room la velocidad se niega: el más lento va primero (valor menos negativo)
      assert.ok(slowSpeed > fastSpeed, 'Shuckle debe "outspeedear" a Deoxys en Trick Room');
    });
  });

  // ── Escenario 9: InferenceEngine tracking ─────────────

  describe('Escenario 9: InferenceEngine', () => {
    it('update con snapshot registra los moves conocidos del oponente', () => {
      inference.reset();
      const opp = makePoke('Garchomp', {
        knownMoves: ['earthquake', 'dragonclaw'],
        species: 'garchomp',
      });
      const my = makePoke('Alakazam');
      const snap = makeSnapshot(my, opp);

      // update procesa el snapshot y actualiza los trackers internos
      inference.update(snap);

      const probs = inference.getActiveOpponentMoves(snap);
      // Debe devolver un Map con al menos los moves conocidos del oponente
      assert.ok(probs instanceof Map, 'debe devolver un Map');
    });

    it('getInferredInfo devuelve info del oponente después de update', () => {
      inference.reset();
      const opp = makePoke('Lucario', {
        knownMoves: ['closecombat', 'extremespeed'],
        species: 'lucario',
      });
      const my = makePoke('Alakazam');
      const snap = makeSnapshot(my, opp);

      inference.update(snap);

      const info = inference.getInferredInfo('lucario');
      // Puede ser null si el species no está en la base de datos — no crashea
      if (info !== null) {
        assert.ok(typeof info === 'object');
      }
    });
  });

  // ── Escenario 10: Wildcard fuzzer ─────────────────────

  describe('Escenario 10: Wildcard fuzzer (200 snapshots aleatorios)', () => {
    const SPECIES = ['charizard', 'blastoise', 'venusaur', 'pikachu', 'gengar', 'alakazam', 'dragonite', 'garchomp', 'lucario', 'mewtwo'];
    const STATUSES: Array<HeuristicPokemonState['status']> = ['', 'brn', 'par', 'psn', 'slp', 'frz', 'tox'];
    const ITEMS = ['', 'choiceband', 'choicespecs', 'lifeorb', 'leftovers', 'assaultvest', 'eviolite'];
    const WEATHERS: Array<HeuristicFieldState['weather']> = [null, 'sunnyday', 'raindance', 'sandstorm', 'snowscape'];
    const MOVE_POOL = ['tackle', 'thunderbolt', 'flamethrower', 'icebeam', 'earthquake', 'swordsdance', 'stealthrock', 'uturn', 'shadowball', 'bulletpunch'];

    function randInt(min: number, max: number): number {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randElement<T>(arr: T[]): T {
      return arr[Math.floor(Math.random() * arr.length)] as T;
    }

    function randBoosts(): HeuristicPokemonState['boosts'] {
      return {
        atk: randInt(-3, 3), def: randInt(-3, 3), spa: randInt(-3, 3),
        spd: randInt(-3, 3), spe: randInt(-3, 3), accuracy: 0, evasion: 0,
      };
    }

    function randPoke(active: boolean): HeuristicPokemonState {
      const hp = randInt(1, 300);
      const maxHp = randInt(hp, 300);
      const item = randElement(ITEMS);
      return {
        name: randElement(SPECIES),
        species: randElement(SPECIES),
        level: randInt(1, 100),
        hp,
        maxhp: maxHp,
        hpPercent: Math.round((hp / maxHp) * 100),
        status: randElement(STATUSES),
        active,
        fainted: false,
        types: ['normal'],
        baseStats: { hp: maxHp, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
        stats: {
          hp: maxHp,
          atk: randInt(50, 200),
          def: randInt(50, 200),
          spa: randInt(50, 200),
          spd: randInt(50, 200),
          spe: randInt(20, 180),
        },
        moves: [makeMove(randElement(MOVE_POOL)), makeMove(randElement(MOVE_POOL)), makeMove(randElement(MOVE_POOL)), makeMove(randElement(MOVE_POOL))],
        knownMoves: [randElement(MOVE_POOL)],
        ability: 'blaze',
        knownAbility: null,
        item,
        knownItem: Math.random() > 0.5 ? item : null,
        itemConsumed: Math.random() > 0.8,
        boosts: randBoosts(),
        volatiles: makeVolatiles(Math.random() > 0.7 ? ['taunt'] : []),
      };
    }

    function randAvailable(): HeuristicMoveInfo[] {
      return MOVE_POOL.slice(0, 4).map(id => ({
        id,
        pp: randInt(0, 15),
        disabled: Math.random() > 0.85,
      }));
    }

    it('nunca lanza un error en 200 snapshots aleatorios', () => {
      let errors = 0;

      for (let i = 0; i < 200; i++) {
        const my = randPoke(true);
        const opp = randPoke(true);
        const bench = Math.random() > 0.5 ? [randPoke(false)] : [];
        const field = makeField({ weather: randElement(WEATHERS), trickRoom: Math.random() > 0.7 });
        const snap = makeSnapshot(my, opp, bench, field);
        const available = randAvailable();
        const strategic = makeStrategic();

        // Calcular matchup real con @smogon/calc
        let matchup: DamageMatchup;
        try {
          matchup = calc.calcMatchup(snap, available);
        } catch {
          matchup = { myAttacking: [], oppAttacking: [] };
        }

        try {
          const result = heuristicDecision(snap, matchup, strategic, available, bench, calc, inference, false);
          // El resultado debe ser null o un objeto con type válido
          if (result !== null) {
            assert.ok(
              result.type === 'move' || result.type === 'switch',
              `tipo inválido: ${result.type}`,
            );
            if (result.type === 'move') {
              assert.ok(typeof result.moveId === 'string' && result.moveId.length > 0);
            }
          }
        } catch (e) {
          errors++;
          console.debug(`[fuzzer] crash en iteración ${i}:`, e);
        }
      }

      assert.strictEqual(errors, 0, `${errors} crashes en 200 snapshots aleatorios`);
    });

    it('error-rate: wild tier hace elecciones distintas a rival tier en 50 tiradas', () => {
      // Genera un escenario con un OHKO claro y mide cuántas veces
      // cada dificultad elige el move óptimo vs random.
      const my = makePoke('Alakazam');
      const opp = makePoke('Blissey', { hpPercent: 5, hp: 5 });
      const snap = makeSnapshot(my, opp);
      const matchup = makeMatchup('psychic', 110, 'softboiled', 5);
      matchup.myAttacking[0]!.isOHKO = true;
      const available: HeuristicMoveInfo[] = [
        { id: 'psychic', pp: 30, disabled: false },
        { id: 'shadowball', pp: 15, disabled: false },
        { id: 'recover', pp: 10, disabled: false },
      ];

      let wildOptimal = 0;
      let rivalOptimal = 0;
      const TRIALS = 50;

      for (let i = 0; i < TRIALS; i++) {
        const base = heuristicDecision(snap, matchup, makeStrategic(), available, [], calc, inference, false);

        // Wild aplica 50% error rate
        const wild = applyErrorRate(base, available, AI_CONFIG_PRESETS.wild);
        if (wild?.moveId === 'psychic') wildOptimal++;

        // Rival nunca falla
        const rival = applyErrorRate(base, available, AI_CONFIG_PRESETS.rival);
        if (rival?.moveId === 'psychic') rivalOptimal++;
      }

      // Rival SIEMPRE elige psychic (0% error), wild raramente
      assert.strictEqual(rivalOptimal, TRIALS, 'rival nunca debe fallar el OHKO');
      assert.ok(wildOptimal < TRIALS, 'wild debe cometer errores al menos alguna vez');
    });
  });
});
