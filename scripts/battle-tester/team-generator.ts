// scripts/battle-tester/team-generator.ts
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';
import { EXCLUDED_FROM_SINGLES_REPORT } from './excluded-abilities.ts';

export interface TestBatch {
  playerTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  movesToTest: string[];
  abilitiesToTest: string[];
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
  voltabsorb:      { enemyMove: 'Thunderbolt' },
  lightningrod:    { enemyMove: 'Thunderbolt' },
  motordrive:      { enemyMove: 'Thunderbolt' },
  transistor:      { enemyMove: 'Thunderbolt' }, // boost al usar eléctrico
  waterabsorb:     { enemyMove: 'Surf' },
  stormdrain:      { enemyMove: 'Surf' },
  dryskin:         { enemyMove: 'Surf' },
  waterbubble:     { enemyMove: 'Surf' },         // boost al usar agua
  flashfire:       { enemyMove: 'Flamethrower' },
  wellbakedbody:   { enemyMove: 'Flamethrower' },
  heatproof:       { enemyMove: 'Flamethrower' },
  thermalexchange: { enemyMove: 'Flame Wheel' },
  sapsipper:       { enemyMove: 'Giga Drain' },
  levitate:        { enemyMove: 'Earthquake' },
  eartheater:      { enemyMove: 'Earthquake' },

  // Habilidades de contacto — rival usa movimiento físico de contacto
  static:          { enemyMove: 'Body Slam' },
  flamebody:       { enemyMove: 'Body Slam' },
  poisonpoint:     { enemyMove: 'Body Slam' },
  roughskin:       { enemyMove: 'Body Slam' },
  ironbarbs:       { enemyMove: 'Body Slam' },
  gooey:           { enemyMove: 'Body Slam' },
  tanglinghair:    { enemyMove: 'Body Slam' },
  cutecharm:       { enemyMove: 'Body Slam' },
  effectspore:     { enemyMove: 'Body Slam' },
  mummy:           { enemyMove: 'Body Slam' },
  wanderingspirit: { enemyMove: 'Body Slam' },
  perishbody:      { enemyMove: 'Body Slam' },
  lingeringaroma:  { enemyMove: 'Body Slam' },

  // Habilidades de recoil/no-recoil — jugador usa movimiento con recoil
  rockhead:        { enemyMove: 'Seismic Toss' }, // p1 usa Double-Edge sin recoil
  reckless:        { enemyMove: 'Seismic Toss' },

  // Habilidades activadas por baja vida — rival usa False Swipe para dejar a 1 HP
  blaze:           { enemyMove: 'False Swipe' },
  torrent:         { enemyMove: 'False Swipe' },
  overgrow:        { enemyMove: 'False Swipe' },
  swarm:           { enemyMove: 'False Swipe' },
  berserk:         { enemyMove: 'False Swipe' },
  emergencyexit:   { enemyMove: 'False Swipe' },
  wimpout:         { enemyMove: 'False Swipe' },
  defeatist:       { enemyMove: 'False Swipe' },

  // Activadas por reducciones de stats — rival usa Charm (baja Atk x2)
  competitive:     { enemyMove: 'Charm' },
  defiant:         { enemyMove: 'Charm' },
  rattled:         { enemyMove: 'Shadow Ball' }, // baja SpD + Oscuro/Bicho/Fantasma
  justified:       { enemyMove: 'Sucker Punch' }, // tipo Oscuro sube Atk
  guarddog:        { enemyMove: 'Charm' },        // bloquea Intimidate + sube Atk
  opportunist:     { enemyMove: 'Charm' },        // copia bajada de stats del rival

  // Activadas por tipos específicos de daño
  weakarmor:       { enemyMove: 'Rock Slide' },   // físico → +Spe, -Def
  steamengine:     { enemyMove: 'Flame Wheel' },  // Fuego/Agua → +6 Spe
  stamina:         { enemyMove: 'Rock Slide' },   // recibir daño → +Def
  watercompaction: { enemyMove: 'Surf' },         // agua → +2 Def
  innardsout:      { enemyMove: 'False Swipe' },  // al K.O. → devuelve daño

  // Activadas por tipo Oscuro
  darkside:        { enemyMove: 'Sucker Punch' },

  // Habilidades de stat boost por tipo de ataque recibido
  angerpoint:      { enemyMove: 'Storm Throw' },  // golpe crítico → +6 Atk
  angershell:      { enemyMove: 'False Swipe' },  // baja de 50% HP → stats mixtos

  // Habilidades de clima — ya cubiertas por ABILITY_SCENARIOS pero mapeamos igual
  // para el generador dinámico cuando aparecen solas en un batch
  swiftswim:       { enemyMove: 'Rain Dance' },
  chlorophyll:     { enemyMove: 'Sunny Day' },
  sandrush:        { enemyMove: 'Sandstorm' },
  slushrush:       { enemyMove: 'Snowscape' },
  sandforce:       { enemyMove: 'Sandstorm' },
  solarpower:      { enemyMove: 'Sunny Day' },
  leafguard:       { enemyMove: 'Sunny Day' },
  icebody:         { enemyMove: 'Snowscape' },
  snowcloak:       { enemyMove: 'Snowscape' },
  sandveil:        { enemyMove: 'Sandstorm' },
  raindish:        { enemyMove: 'Rain Dance' },
  hydration:       { enemyMove: 'Rain Dance' },

  // Habilidades de terreno
  surgesurfer:     { enemyMove: 'Electric Terrain' },
  mimicry:         { enemyMove: 'Electric Terrain' },

  // Inmunidades de estado
  limber:          { enemyMove: 'Thunder Wave' },
  immunity:        { enemyMove: 'Toxic' },
  magmaarmor:      { enemyMove: 'Lovely Kiss' },   // inmune a congelar (usamos sleep como proxy)
  oblivious:       { enemyMove: 'Lovely Kiss' },
  vitalspirit:     { enemyMove: 'Lovely Kiss' },
  insomnia:        { enemyMove: 'Lovely Kiss' },
  owntempo:        { enemyMove: 'Confuse Ray' },
  innerfocus:      { enemyMove: 'Fake Out' },
  steadfast:       { enemyMove: 'Fake Out' },      // al hacer flinch → +Spe
  clearsmog:       { enemyMove: 'Confuse Ray' },

  // Activadas por movimientos de estado del rival
  soundproof:      { enemyMove: 'Hyper Voice' },   // inmune a sonido
  bulletproof:     { enemyMove: 'Shadow Ball' },   // inmune a balas/bombas
  damp:            { enemyMove: 'Self-Destruct' }, // bloquea Self-Destruct
  queenlymajesty:  { enemyMove: 'Quick Attack' },  // bloquea prioridad
  dazzling:        { enemyMove: 'Quick Attack' },  // bloquea prioridad
  armortail:       { enemyMove: 'Quick Attack' },  // bloquea prioridad

  // Habilidades misceláneas reactivas
  pressure:        { enemyMove: 'Body Slam' },     // PP extra consumidos
  unnerve:         { enemyMove: 'Body Slam' },     // rival no puede comer berries
  suctioncups:     { enemyMove: 'Whirlwind' },     // bloquea phazing
  shadowtag:       { enemyMove: 'Body Slam' },     // rival no puede escapar
  arenatrap:       { enemyMove: 'Body Slam' },
  magnetpull:      { enemyMove: 'Body Slam' },
  stickyhold:      { enemyMove: 'Knock Off' },     // bloquea robo de item
  colorchange:     { enemyMove: 'Thunderbolt' },   // cambia tipo al ser golpeado
  klutz:           { enemyMove: 'Body Slam' },     // no puede usar su item
};

// ---------------------------------------------------------------------------
// Equipo universal del NPC: 4 slots con movimientos de tipos distintos.
// El run-tester lee la habilidad activa de p1 por turno y elige el slot correcto.
// Slot 1 = Thunderbolt  → cubre inmunidades/boost eléctrico
// Slot 2 = Surf          → cubre inmunidades/boost acuático
// Slot 3 = Flamethrower  → cubre inmunidades/boost fuego
// Slot 4 = Body Slam     → cubre habilidades de contacto
// ---------------------------------------------------------------------------
export const ENEMY_TRIGGER_MOVES = [
  'Thunderbolt',  // slot 1
  'Surf',         // slot 2
  'Flamethrower', // slot 3
  'Body Slam',    // slot 4
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
    .filter(m => m.exists && !m.isNonstandard && m.id !== 'struggle');

  // Filtrar habilidades excluidas del reporte singles
  const allAbilities = dexGen.abilities.all()
    .filter(a => a.exists && !a.isNonstandard && !EXCLUDED_FROM_SINGLES_REPORT.has(a.id));

  const movePool    = allMoves.map(m => m.name);
  const abilityPool = allAbilities.map(a => a.name);

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

      let abilityName = 'No Ability';
      if (abilityIdx < abilityPool.length) {
        abilityName = abilityPool[abilityIdx]!;
        batchAbilities.push(toID(abilityName));
        abilityIdx++;
      }

      const abilityId = toID(abilityName);

      // Items para activar ciertas habilidades que requieren estado o movimientos específicos
      let item = '';
      if (['guts', 'marvelscale', 'quickfeet', 'flareboost'].includes(abilityId)) {
        item = 'Flame Orb';
      } else if (['poisonheal', 'toxicboost'].includes(abilityId)) {
        item = 'Toxic Orb';
      } else if (['harvest', 'cheekpouch', 'ripen', 'gluttony', 'unburden'].includes(abilityId)) {
        item = 'Sitrus Berry';
      }

      // Si tiene movimientos que requieren baya obligatoria para ser válidos
      const movesToId = pMoves.map(m => toID(m));
      if (movesToId.includes('belch' as ID) || movesToId.includes('stuffcheeks' as ID)) {
        item = 'Sitrus Berry';
      }

      // noretreat requiere ser Falinks para poder ejecutarse
      const species = movesToId.includes('noretreat' as ID) ? 'Falinks' : 'Mew';

      playerTeam.push({
        name:   `P-Poke${p + 1}`,
        species,
        level:   100,
        gender:  '',
        item,
        ability: abilityName,
        nature:  'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: pMoves.length > 0 ? pMoves : ['Tackle'],
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
        ? ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
        : [...ENEMY_TRIGGER_MOVES];

      enemyTeam.push({
        name:    `E-Poke${e + 1}`,
        species: 'Blissey',
        level:   100,
        gender:  '',
        item:    '',
        ability: 'Natural Cure',
        nature:  'Serious',
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
