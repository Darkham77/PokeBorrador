// fallow-ignore-file security-sink
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet, ID } from '@pkmn/sim';
import crypto from 'node:crypto';
import { EXCLUDED_FROM_SINGLES_REPORT } from '../scenarios/fuzzer_excluded_abilities.ts';
import { ABILITY_SCENARIOS } from '../scenarios/fuzzer_ability_scenarios.ts';
import { getShowdownNickname } from '../../../../src/logic/battle/showdownUidMapper.ts';
import { resolveBaseStats } from '../../../../src/logic/battle/showdownAdapter.ts';
import { calcStatsPure } from '../../../../src/logic/pokemon/statsMath.ts';

export function generateBatchHash(batch: { playerTeam: unknown[]; enemyTeam: unknown[]; steps?: string[] }): string {
  const data = {
    playerTeam: batch.playerTeam,
    enemyTeam: batch.enemyTeam,
    steps: batch.steps || []
  };
  return crypto.createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 12);
}

import type { PersistedPokemonGender } from '../../../../src/logic/auth/saveService.ts';
import type { PokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';
import type { ItemId } from '../../../../src/data/inventory/items.ts';
import type { AbilityId } from '../../../../src/data/battle/abilities.ts';
import type { NatureId } from '../../../../src/data/battle/natures.ts';
import type { PokemonMoveId } from '../../../../src/types/pokemon/pokemon.ts';

import type { CalculatedStats } from '../../../../src/logic/pokemon/statsMath.ts';

export interface FuzzerPokemonSet extends Omit<PokemonSet, 'gender' | 'species' | 'item' | 'ability' | 'nature' | 'moves'> {
  species: PokemonSpeciesId;
  gender: PersistedPokemonGender;
  item: ItemId;
  ability: AbilityId;
  nature: NatureId;
  moves: PokemonMoveId[];
  uid?: string;
  stats?: CalculatedStats | Record<string, number>;
}

export const CERTIFIED_BATTLE_WINNERS = ['p1', 'p2', 'tie'] as const;
export type CertifiedBattleWinner = (typeof CERTIFIED_BATTLE_WINNERS)[number];

export interface CertifiedPokemonFinalState {
  name: string;
  hp: number;
  maxHp: number;
  fainted: boolean;
}

export interface CertifiedBattleFinalState {
  isOver: true;
  winner: CertifiedBattleWinner;
  p1: CertifiedPokemonFinalState[];
  p2: CertifiedPokemonFinalState[];
}

export interface CertifiedBattleHistoryEntry {
  turnCount: number;
  p1Choice: string;
  p2Choice: string;
  battleTurn: number;
  p1Heal?: true;
  p2Heal?: true;
}

/**
 * Immutable replay contract shared by the fuzzer, the Node replayer, and
 * Playwright. A case exists only after the originating Showdown battle ended.
 */
export interface CertifiedBattleCase {
  id: string;
  idx: number;
  formatId?: string;
  playerTeam: FuzzerPokemonSet[];
  enemyTeam: FuzzerPokemonSet[];
  movesToTest: PokemonMoveId[];
  abilitiesToTest: AbilityId[];
  seed: number[];
  playerChoices: string[];
  enemyChoices: string[];
  history: CertifiedBattleHistoryEntry[];
  steps: string[];
  ended: true;
  winner: CertifiedBattleWinner;
  finalState: CertifiedBattleFinalState;
}

export interface CertifiedBattleCaseDocument {
  battle: CertifiedBattleCase[];
}

export interface FuzzerWorkerData {
  batch: TestBatch;
  roundNum: number;
  totalRounds?: number;
}

export interface TestBatch {
  formatId?: string;
  playerTeam: FuzzerPokemonSet[];
  enemyTeam: FuzzerPokemonSet[];
  movesToTest: PokemonMoveId[];
  abilitiesToTest: AbilityId[];
  /** Populated by run-tester: RNG seed for deterministic battle reproduction */
  seed?: number[];
  /** Populated by run-tester: ordered P1 choices for E2E replay */
  playerChoices?: string[];
  /** Populated by run-tester: ordered P2 choices for E2E determinism */
  enemyChoices?: string[];
  /** Populated by run-tester: history terna array for E2E replay and cheat tracking */
  history?: CertifiedBattleHistoryEntry[];
  /** Populated by run-tester: per-turn damage/HP snapshots */
  steps?: string[];
  /** Populated only after Showdown ends the same battle that produced the choice streams. */
  ended?: boolean;
  winner?: CertifiedBattleWinner;
  finalState?: CertifiedBattleFinalState;
}

// ---------------------------------------------------------------------------
// Mapa: habilidad del jugador → movimiento que el rival debe usar para activarla.
// El slot 1 del equipo enemigo siempre será este movimiento cuando aplique.
// ---------------------------------------------------------------------------
interface TriggerConfig {
  enemyMove: string;
  /** Stat a bajar para activar habilidades reactivas a reducciones. */
  statDrop?: string;
}

export const ABILITY_TRIGGER_MAP: Readonly<Record<string, TriggerConfig>> = {
  // Inmunidades de tipo — el rival ataca con el tipo que la habilidad absorbe/bloquea
  voltabsorb:      { enemyMove: 'thunderbolt' },
  lightningrod:    { enemyMove: 'thunderbolt' },
  motordrive:      { enemyMove: 'thunderbolt' },
  transistor:      { enemyMove: 'thunderbolt' }, // boost al usar eléctrico
  waterabsorb:     { enemyMove: 'surf' },
  stormdrain:      { enemyMove: 'surf' },
  dryskin:         { enemyMove: 'surf' },
  waterbubble:     { enemyMove: 'surf' },         // boost al usar agua
  flashfire:       { enemyMove: 'flamethrower' },
  wellbakedbody:   { enemyMove: 'flamethrower' },
  heatproof:       { enemyMove: 'flamethrower' },
  thermalexchange: { enemyMove: 'flamewheel' },
  sapsipper:       { enemyMove: 'gigadrain' },
  levitate:        { enemyMove: 'earthquake' },
  eartheater:      { enemyMove: 'earthquake' },

  // Habilidades de contacto — rival usa movimiento físico de contacto
  static:          { enemyMove: 'bodyslam' },
  flamebody:       { enemyMove: 'bodyslam' },
  poisonpoint:     { enemyMove: 'bodyslam' },
  roughskin:       { enemyMove: 'bodyslam' },
  ironbarbs:       { enemyMove: 'bodyslam' },
  gooey:           { enemyMove: 'bodyslam' },
  tanglinghair:    { enemyMove: 'bodyslam' },
  cutecharm:       { enemyMove: 'bodyslam' },
  effectspore:     { enemyMove: 'bodyslam' },
  mummy:           { enemyMove: 'bodyslam' },
  wanderingspirit: { enemyMove: 'bodyslam' },
  perishbody:      { enemyMove: 'bodyslam' },
  lingeringaroma:  { enemyMove: 'bodyslam' },

  // Habilidades de recoil/no-recoil — jugador usa movimiento con recoil
  rockhead:        { enemyMove: 'seismictoss' }, // p1 usa Double-Edge sin recoil
  reckless:        { enemyMove: 'seismictoss' },

  // Habilidades activadas por baja vida — rival usa False Swipe para dejar a 1 HP
  blaze:           { enemyMove: 'falseswipe' },
  torrent:         { enemyMove: 'falseswipe' },
  overgrow:        { enemyMove: 'falseswipe' },
  swarm:           { enemyMove: 'falseswipe' },
  berserk:         { enemyMove: 'falseswipe' },
  emergencyexit:   { enemyMove: 'falseswipe' },
  wimpout:         { enemyMove: 'falseswipe' },
  defeatist:       { enemyMove: 'falseswipe' },

  // Activadas por reducciones de stats — rival usa Charm (baja Atk x2)
  competitive:     { enemyMove: 'charm' },
  defiant:         { enemyMove: 'charm' },
  rattled:         { enemyMove: 'shadowball' }, // baja SpD + Oscuro/Bicho/Fantasma
  justified:       { enemyMove: 'suckerpunch' }, // tipo Oscuro sube Atk
  guarddog:        { enemyMove: 'charm' },        // bloquea Intimidate + sube Atk
  opportunist:     { enemyMove: 'charm' },        // copia bajada de stats del rival

  // Activadas por tipos específicos de daño
  weakarmor:       { enemyMove: 'rockslide' },   // físico → +Spe, -Def
  steamengine:     { enemyMove: 'flamewheel' },  // Fuego/Agua → +6 Spe
  stamina:         { enemyMove: 'rockslide' },   // recibir daño → +Def
  watercompaction: { enemyMove: 'surf' },         // agua → +2 Def
  innardsout:      { enemyMove: 'falseswipe' },  // al K.O. → devuelve daño

  // Activadas por tipo Oscuro
  darkside:        { enemyMove: 'suckerpunch' },

  // Habilidades de stat boost por tipo de ataque recibido
  angerpoint:      { enemyMove: 'stormthrow' },  // golpe crítico → +6 Atk
  angershell:      { enemyMove: 'falseswipe' },  // baja de 50% HP → stats mixtos

  // Habilidades de clima — ya cubiertas por ABILITY_SCENARIOS pero mapeamos igual
  // para el generador dinámico cuando aparecen solas en un batch
  swiftswim:       { enemyMove: 'raindance' },
  chlorophyll:     { enemyMove: 'sunnyday' },
  sandrush:        { enemyMove: 'sandstorm' },
  slushrush:       { enemyMove: 'snowscape' },
  sandforce:       { enemyMove: 'sandstorm' },
  solarpower:      { enemyMove: 'sunnyday' },
  leafguard:       { enemyMove: 'sunnyday' },
  icebody:         { enemyMove: 'snowscape' },
  snowcloak:       { enemyMove: 'snowscape' },
  sandveil:        { enemyMove: 'sandstorm' },
  raindish:        { enemyMove: 'raindance' },
  hydration:       { enemyMove: 'raindance' },

  // Habilidades de terreno
  surgesurfer:     { enemyMove: 'electricterrain' },
  mimicry:         { enemyMove: 'electricterrain' },

  // Inmunidades de estado
  limber:          { enemyMove: 'thunderwave' },
  immunity:        { enemyMove: 'toxic' },
  magmaarmor:      { enemyMove: 'lovelykiss' },   // inmune a congelar (usamos sleep como proxy)
  oblivious:       { enemyMove: 'lovelykiss' },
  vitalspirit:     { enemyMove: 'lovelykiss' },
  insomnia:        { enemyMove: 'lovelykiss' },
  owntempo:        { enemyMove: 'confuseray' },
  innerfocus:      { enemyMove: 'fakeout' },
  steadfast:       { enemyMove: 'fakeout' },      // al hacer flinch → +Spe
  clearsmog:       { enemyMove: 'confuseray' },

  // Activadas por movimientos de estado del rival
  soundproof:      { enemyMove: 'hypervoice' },   // inmune a sonido
  bulletproof:     { enemyMove: 'shadowball' },   // inmune a balas/bombas
  damp:            { enemyMove: 'selfdestruct' }, // bloquea Self-Destruct
  queenlymajesty:  { enemyMove: 'quickattack' },  // bloquea prioridad
  dazzling:        { enemyMove: 'quickattack' },  // bloquea prioridad
  armortail:       { enemyMove: 'quickattack' },  // bloquea prioridad

  // Habilidades misceláneas reactivas
  pressure:        { enemyMove: 'bodyslam' },     // PP extra consumidos
  unnerve:         { enemyMove: 'bodyslam' },     // rival no puede comer berries
  suctioncups:     { enemyMove: 'whirlwind' },     // bloquea phazing
  shadowtag:       { enemyMove: 'bodyslam' },     // rival no puede escapar
  arenatrap:       { enemyMove: 'bodyslam' },
  magnetpull:      { enemyMove: 'bodyslam' },
  stickyhold:      { enemyMove: 'knockoff' },     // bloquea robo de item
  colorchange:     { enemyMove: 'thunderbolt' },   // cambia tipo al ser golpeado
  klutz:           { enemyMove: 'bodyslam' },     // no puede usar su item
};

// ---------------------------------------------------------------------------
// Equipo universal del NPC: 4 slots con movimientos de tipos distintos.
// El run-tester lee la habilidad activa de p1 por turno y elige el slot correcto.
// Slot 1 = thunderbolt  → cubre inmunidades/boost eléctrico
// Slot 2 = surf          → cubre inmunidades/boost acuático
// Slot 3 = flamethrower  → cubre inmunidades/boost fuego
// Slot 4 = bodyslam     → cubre habilidades de contacto
// ---------------------------------------------------------------------------
export const ENEMY_TRIGGER_MOVES = [
  'thunderbolt',  // slot 1
  'surf',         // slot 2
  'flamethrower', // slot 3
  'bodyslam',    // slot 4
] as const;

/** Slot 1-based del ENEMY_TRIGGER_MOVES que activa la habilidad dada, o null si no aplica. */
export function getTriggerSlot(abilityId: string): number | null {
  const trigger = ABILITY_TRIGGER_MAP[abilityId];
  if (!trigger) return null;
  const move = trigger.enemyMove.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idx = ENEMY_TRIGGER_MOVES.findIndex(
    m => m.toLowerCase().replace(/[^a-z0-9]/g, '') === move
  );
  // Si el trigger move es uno de los 4 universales, usar ese slot.
  // Si es un movimiento especial (p.ej. Charm, Earthquake, Whirlwind),
  // el escenario scriptado en ability-scenarios.ts lo cubre — aquí devolvemos null
  // para no interferir.
  return idx !== -1 ? idx + 1 : null;
}

import { ACTIVE_GENERATION } from '../../../../src/data/system/constants.ts';

export function generateTestBatches(batchSize: number = 6): TestBatch[] {
  const dexGen = Dex.forGen(ACTIVE_GENERATION);

  const allMoves = dexGen.moves.all()
    .filter(m => m.exists && !m.isNonstandard && m.id !== 'struggle');

  // Obtener todas las habilidades probadas en escenarios scriptados para excluirlas del pool dinámico
  const scriptedAbilities = new Set(
    ABILITY_SCENARIOS.flatMap(s => s.abilities.map(a => toID(a)))
  );

  // Filtrar habilidades excluidas del reporte singles y las que ya tienen escenarios dedicados
  const allAbilities = dexGen.abilities.all()
    .filter(a => a.exists && !a.isNonstandard && !EXCLUDED_FROM_SINGLES_REPORT.has(a.id) && !scriptedAbilities.has(a.id));

  const movePool    = allMoves.map(m => m.id);
  const abilityPool = allAbilities.map(a => a.id);

  const batches: TestBatch[] = [];
  let moveIdx    = 0;
  let abilityIdx = 0;

  while (moveIdx < movePool.length || abilityIdx < abilityPool.length) {
    const playerTeam: FuzzerPokemonSet[] = [];
    const enemyTeam:  FuzzerPokemonSet[] = [];
    const batchMoves:     PokemonMoveId[] = [];
    const batchAbilities: AbilityId[] = [];

    for (let p = 0; p < batchSize; p++) {
      if (moveIdx >= movePool.length && abilityIdx >= abilityPool.length) break;

      const pMoves: string[] = [];
      for (let m = 0; m < 4; m++) {
        if (moveIdx < movePool.length) {
          const moveName = movePool[moveIdx]!;
          pMoves.push(moveName);
          batchMoves.push(toID(moveName) as PokemonMoveId);
          moveIdx++;
        }
      }

      let abilityName = 'illuminate';
      if (abilityIdx < abilityPool.length) {
        abilityName = abilityPool[abilityIdx]!;
        batchAbilities.push(toID(abilityName) as AbilityId);
        abilityIdx++;
      }

      const abilityId = toID(abilityName);

      // Items para activar ciertas habilidades que requieren estado o movimientos específicos
      let item = '';
      if (['guts', 'marvelscale', 'quickfeet', 'flareboost'].includes(abilityId)) {
        item = 'flameorb';
      } else if (['poisonheal', 'toxicboost'].includes(abilityId)) {
        item = 'toxicorb';
      } else if (['harvest', 'cheekpouch', 'ripen', 'gluttony', 'unburden'].includes(abilityId)) {
        item = 'sitrusberry';
      }

      // Si tiene movimientos que requieren baya obligatoria para ser válidos
      const movesToId = pMoves.map(m => toID(m));
      if (movesToId.includes('belch' as ID) || movesToId.includes('stuffcheeks' as ID)) {
        item = 'sitrusberry';
      }

      // noretreat requiere ser Falinks para poder ejecutarse
      const species = movesToId.includes('noretreat' as ID) ? 'falinks' : 'mew';

      const pUid = crypto.randomUUID();
      const pNickname = getShowdownNickname(pUid);
      const pEvs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
      const pIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      const pBaseStats = resolveBaseStats(species);
      const pStats = calcStatsPure(100, pIvs, pBaseStats, { up: null, down: null }, false, pEvs);

      playerTeam.push({
        name:    pNickname,
        species,
        level:   100,
        gender:  'M',
        item: item as ItemId,
        ability: abilityName as AbilityId,
        nature:  'serious',
        evs: pEvs,
        ivs: pIvs,
        moves: (pMoves.length > 0 ? pMoves : ['tackle']) as PokemonMoveId[],
        uid: pUid,
        stats: pStats,
      });
    }

    // Equipo enemigo con al menos 2 Pokémon para permitir switches.
    // El slot 0 del primer enemigo lleva el trigger move si aplica,
    // seguido de movimientos de clima y estado para máxima cobertura.
    const hasFocusPunch = batchMoves.includes('focuspunch');

    for (let e = 0; e < Math.max(batchSize, 2); e++) {
      // Equipo universal: los 4 slots cubren los 4 tipos de trigger más comunes.
      // El NPC siempre tiene disponibles: eléctrico, agua, fuego y contacto.
      // If player has focuspunch, NPC must not attack so concentration isn't broken.
      // 'splash' does nothing — no healing, no damage — so Blissey can still faint naturally.
      const eMoves: PokemonMoveId[] = (hasFocusPunch
        ? ['splash', 'sunnyday', 'raindance', 'sandstorm']
        : [...ENEMY_TRIGGER_MOVES]) as PokemonMoveId[];

      const eUid = crypto.randomUUID();
      const eNickname = getShowdownNickname(eUid);
      const eEvs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 252 };
      const eIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      const eBaseStats = resolveBaseStats('blissey');
      const eStats = calcStatsPure(100, eIvs, eBaseStats, { up: null, down: null }, false, eEvs);

      enemyTeam.push({
        name:    eNickname,
        species: 'blissey',
        level:   100,
        gender:  'F',
        item:    '',
        ability: 'naturalcure',
        nature:  'serious',
        evs: eEvs,
        ivs: eIvs,
        moves: eMoves,
        uid: eUid,
        stats: eStats,
      });
    }

    if (playerTeam.length > 0) {
      batches.push({
        playerTeam,
        enemyTeam,
        movesToTest:         batchMoves,
        abilitiesToTest:     batchAbilities,
      });
    }
  }

  return batches;
}
