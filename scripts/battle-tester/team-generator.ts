// scripts/battle-tester/team-generator.ts
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet, ID } from '@pkmn/sim';
import crypto from 'node:crypto';
import { EXCLUDED_FROM_SINGLES_REPORT } from './excluded-abilities.ts';

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

export interface TestBatch {
  playerTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  movesToTest: string[];
  abilitiesToTest: string[];
  /** Populated by run-tester: RNG seed for deterministic battle reproduction */
  seed?: number[];
  /** Populated by run-tester: ordered P1 choices for E2E replay */
  playerChoices?: string[];
  /** Populated by run-tester: ordered P2 choices for E2E determinism */
  enemyChoices?: string[];
  /** Populated by run-tester: per-turn damage/HP snapshots */
  steps?: string[];
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

export function generateTestBatches(batchSize: number = 6): TestBatch[] {
  const dexGen = Dex.forGen(9);

  const allMoves = dexGen.moves.all()
    .filter(m => m.exists && !m.isNonstandard && m.id !== 'struggle' && m.id !== 'nobleroar' && m.id !== 'orderup');

  // Filtrar habilidades excluidas del reporte singles
  const allAbilities = dexGen.abilities.all()
    .filter(a => a.exists && !a.isNonstandard && !EXCLUDED_FROM_SINGLES_REPORT.has(a.id));

  const movePool    = allMoves.map(m => m.id);
  const abilityPool = allAbilities.map(a => a.id);

  const batches: TestBatch[] = [];
  let moveIdx    = 0;
  let abilityIdx = 0;

  while (moveIdx < movePool.length || abilityIdx < abilityPool.length) {
    const playerTeam: PokemonSet[] = [];
    const enemyTeam:  PokemonSet[] = [];
    const batchMoves:     string[] = [];
    const batchAbilities: string[] = [];

    for (let p = 0; p < batchSize; p++) {
      if (moveIdx >= movePool.length && abilityIdx >= abilityPool.length) break;

      const pMoves: string[] = [];
      for (let m = 0; m < 4; m++) {
        if (moveIdx < movePool.length) {
          const moveName = movePool[moveIdx]!;
          pMoves.push(moveName);
          batchMoves.push(toID(moveName));
          moveIdx++;
        }
      }

      let abilityName = 'noability';
      if (abilityIdx < abilityPool.length) {
        abilityName = abilityPool[abilityIdx]!;
        batchAbilities.push(toID(abilityName));
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

      playerTeam.push({
        name:   `P-Poke${p + 1}`,
        species,
        level:   100,
        gender:  '',
        item,
        ability: abilityName,
        nature:  'serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: pMoves.length > 0 ? pMoves : ['tackle'],
      });
    }

    // Equipo enemigo con al menos 2 Pokémon para permitir switches.
    // El slot 0 del primer enemigo lleva el trigger move si aplica,
    // seguido de movimientos de clima y estado para máxima cobertura.
    const hasFocusPunch = batchMoves.includes('focuspunch');

    for (let e = 0; e < Math.max(batchSize, 2); e++) {
      // Equipo universal: los 4 slots cubren los 4 tipos de trigger más comunes.
      // El NPC siempre tiene disponibles: eléctrico, agua, fuego y contacto.
      // Si el jugador tiene focuspunch, forzamos a que el NPC no ataque para no romper la concentración.
      const eMoves: string[] = hasFocusPunch
        ? ['softboiled', 'sunnyday', 'raindance', 'sandstorm']
        : [...ENEMY_TRIGGER_MOVES];

      enemyTeam.push({
        name:    `E-Poke${e + 1}`,
        species: 'blissey',
        level:   100,
        gender:  '',
        item:    '',
        ability: 'naturalcure',
        nature:  'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: eMoves,
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
