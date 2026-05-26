import { Battle } from '@pkmn/sim';

let battle: Battle | null = null;

// Diccionarios estáticos para traducir naturalezas y habilidades al inglés del simulador
const NATURE_MAP_ES_TO_EN: Record<string, string> = {
  'Audaz': 'Brave',
  'Firme': 'Adamant',
  'Pícaro': 'Naughty',
  'Manso': 'Quiet',
  'Serio': 'Serious',
  'Osado': 'Bold',
  'Plácido': 'Relaxed',
  'Agitado': 'Impish',
  'Jovial': 'Jolly',
  'Ingenuo': 'Naive',
  'Modesto': 'Modest',
  'Moderado': 'Mild',
  'Raro': 'Quirky',
  'Dócil': 'Docile',
  'Tímido': 'Timid',
  'Activo': 'Hasty',
  'Alocado': 'Rash',
  'Tranquilo': 'Calm',
  'Grosero': 'Sassy',
  'Cauto': 'Careful',
  'Afable': 'Mild',
  'Amable': 'Gentle',
  'Huraño': 'Lonely',
  'Placido': 'Relaxed',
  'Psíquico': 'Quiet',
  'Picaro': 'Naughty',
  'Timido': 'Timid',
};

const ABILITY_MAP_ES_TO_EN: Record<string, string> = {
  'Espesura': 'overgrow',
  'Clorofila': 'chlorophyll',
  'Mar llamas': 'blaze',
  'Poder Solar': 'solarpower',
  'Torrente': 'torrent',
  'Lluvia Ligera': 'raindish',
  'Vista lince': 'keeneye',
  'Alboroto': 'uproar',
  'Escape': 'runaway',
  'Agallas': 'guts',
  'Polvo escudo': 'shielddust',
  'Mudar': 'shedskin',
  'Electricidad estática': 'static',
  'Pararrayos': 'lightningrod',
  'Robustez': 'sturdy',
  'Nerviosismo': 'tension',
  'Infiltrador': 'infiltrator',
  'Humedad': 'damp',
  'Aclimatación': 'cloudnine',
  'Nado rápido': 'swiftswim',
  'Ráfaga': 'speedboost',
  'Adaptable': 'adaptability',
  'Cura Natural': 'naturalcure',
  'Velo húmedo': 'waterveil',
  'Sebo': 'thickfat',
  'Caparazón': 'shellarmor',
  'Armadura Batalla': 'battlearmor',
  'Francotirador': 'sniper',
  'Intrépido': 'scrappy',
  'Ojo Compuesto': 'compoundeyes',
  'Velo arena': 'sandveil',
  'Insonorizar': 'soundproof',
  'Intimidación': 'intimidate',
  'Absorbe Fuego': 'flashfire',
  'Absorbe Agua': 'waterabsorb',
  'Efecto Espora': 'effectspore',
  'Trampa Arena': 'arenatrap',
  'Recogida': 'pickup',
  'Espíritu Vital': 'vitalspirit',
  'Sincronía': 'synchronize',
  'Cuerpo Puro': 'clearbody',
  'Despiste': 'oblivious',
  'Imán': 'magnetpull',
  'Fuga': 'runaway',
  'Hedor': 'stench',
  'Levitación': 'levitate',
  'Cabeza Roca': 'rockhead',
  'Insomnio': 'insomnia',
  'Corte Fuerte': 'hypercutter',
  'Flexibilidad': 'limber',
  'Madrugar': 'earlybird',
  'Enjambre': 'swarm',
  'Cuerpo Llama': 'flamebody',
  'Rastro': 'trace',
  'Inmunidad': 'immunity',
  'Presión': 'pressure',
  'Punto tóxico': 'poisonpoint',
  'Descarga': 'download',
  'Experto': 'technician',
  'Absorbe Voltio': 'voltabsorb',
  'Foco interno': 'innerfocus',
  'Rivalidad': 'rivalry',
  'Muro Mágico': 'magicguard',
  'Viscosidad': 'stickyhold',
  'Dicha': 'serenegrace',
  'Sombra Trampa': 'shadowtag',
  'Bucle Aire': 'airlock',
  'Cambio Color': 'colorchange',
  'Gran Encanto': 'cutecharm',
  'Potencia': 'hugepower',
  'Energía Pura': 'purepower',
  'Llovizna': 'drizzle',
  'Sequía': 'drought',
  'Chorro Arena': 'sandstream',
  'Ausente': 'truant',
  'Entusiasmo': 'hustle',
  'Escama Especial': 'marvelscale',
  'Predicción': 'forecast',
  'Menos': 'minus',
  'Más': 'plus',
  'Ventosas': 'suctioncups',
  'Humo Blanco': 'whitesmoke'
};

const ABILITY_MAP_EN_TO_ES: Record<string, string> = {};
const NATURE_MAP_EN_TO_ES: Record<string, string> = {};

for (const [es, en] of Object.entries(ABILITY_MAP_ES_TO_EN)) {
  ABILITY_MAP_EN_TO_ES[en] = es;
}
for (const [es, en] of Object.entries(NATURE_MAP_ES_TO_EN)) {
  NATURE_MAP_EN_TO_ES[en] = es;
}

// Tabla de efectividades de tipos de Generación 3 para la IA Estratégica
const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Electric: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Ground: { Fire: 2, Grass: 0.5, Electric: 2, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Grass: 2, Electric: 0.5, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 }
};

/**
 * Calcula la efectividad de un tipo de movimiento frente a los tipos del objetivo
 */
function getMoveEffectiveness(moveType: string, targetTypes: string[]): number {
  let mult = 1;
  const chart = TYPE_CHART[moveType];
  if (!chart) return 1;
  for (const type of targetTypes) {
    if (chart[type] !== undefined) {
      mult *= chart[type];
    }
  }
  return mult;
}

/**
 * Obtiene el índice (0 a 5) del counter óptimo de la IA para entrar al combate
 */
function getOptimalCounterIndexForBot(battleInstance: Battle): number {
  const team = battleInstance.p2.pokemon;
  const playerActive = battleInstance.p1.active[0];
  const playerTypes = playerActive ? playerActive.types : ['Normal'];

  let bestScore = -999;
  let bestIndex = -1;

  // team[0] es el activo actual, buscamos relevos en la banca (índices 1 a 5)
  for (let i = 1; i < team.length; i++) {
    const poke = team[i];
    if (!poke || poke.fainted || poke.hp <= 0) continue;

    let score = 0;

    // 1. Ofensivo: Buscar si tiene movimientos súper efectivos contra el jugador activo
    let maxEff = 0;
    for (const moveSlot of poke.moveSlots) {
      const move = battleInstance.dex.moves.get(moveSlot.id);
      const eff = getMoveEffectiveness(move.type, playerTypes);
      if (eff > maxEff) maxEff = eff;
    }
    score += maxEff * 10;

    // 2. Defensivo: Comprobar si resiste los tipos del jugador activo
    if (playerActive) {
      for (const pType of playerTypes) {
        for (const cType of poke.types) {
          const eff = getMoveEffectiveness(pType, [cType]);
          if (eff > 1) score -= 5; // Desventaja defensiva (recibe súper efectivo)
          else if (eff < 1) score += 3; // Resistencia defensiva
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

interface WorkerSandboxPokemon {
  id: string;
  name: string;
  types: string[];
  spriteUrl: string;
  isAnimated: boolean;
  moves: string[];
  hp?: number;
  maxHp?: number;
  status?: string;
  ability?: string;
}

interface SimStatusState {
  id: string;
  time?: number;
}

interface SimBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

interface SimStats {
  hp?: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface SimPokemon {
  species: {
    id: string;
  };
  name: string;
  hp: number;
  maxhp: number;
  status: string;
  fainted: boolean;
  types: string[];
  moveSlots: Array<{
    id: string;
    pp: number;
    maxpp: number;
    disabled?: boolean | string;
  }>;
  baseStoredStats?: SimStats;
  storedStats?: SimStats;
  boosts?: SimBoosts;
  statusState?: SimStatusState;
  ability?: string;
  set?: {
    nature?: string;
  };
  volatiles?: Record<string, { id: string; duration?: number; time?: number; layers?: number; hp?: number }>;
}

interface SimSideCondition {
  id: string;
  duration?: number;
  layers?: number;
}

interface SimPlayer {
  pokemon: SimPokemon[];
  active: (SimPokemon | null)[];
  sideConditions: Record<string, { id: string; duration?: number; layers?: number }>;
}

/**
 * Mapea el estado de salud de los equipos para sincronizar la UI
 */
const getTeamStatus = (player: SimPlayer) => {
  if (!player || !player.pokemon) return [];
  return player.pokemon.map((p: SimPokemon) => ({
    id: p.species.id,
    name: p.name,
    hp: p.hp,
    maxHp: p.maxhp,
    status: p.status || (p.fainted ? 'fnt' : ''),
    baseStoredStats: p.baseStoredStats ? {
      hp: p.baseStoredStats.hp || 0,
      atk: p.baseStoredStats.atk || 0,
      def: p.baseStoredStats.def || 0,
      spa: p.baseStoredStats.spa || 0,
      spd: p.baseStoredStats.spd || 0,
      spe: p.baseStoredStats.spe || 0,
    } : null,
    storedStats: p.storedStats ? {
      atk: p.storedStats.atk || 0,
      def: p.storedStats.def || 0,
      spa: p.storedStats.spa || 0,
      spd: p.storedStats.spd || 0,
      spe: p.storedStats.spe || 0,
    } : null,
    boosts: p.boosts ? {
      atk: p.boosts.atk || 0,
      def: p.boosts.def || 0,
      spa: p.boosts.spa || 0,
      spd: p.boosts.spd || 0,
      spe: p.boosts.spe || 0,
      accuracy: p.boosts.accuracy || 0,
      evasion: p.boosts.evasion || 0,
    } : null,
    statusState: p.statusState ? {
      id: p.statusState.id || '',
      time: typeof p.statusState.time === 'number' ? p.statusState.time : 0,
    } : null,
    moveSlots: p.moveSlots ? p.moveSlots.map(ms => ({
      id: ms.id,
      pp: ms.pp,
      maxpp: ms.maxpp,
      disabled: ms.disabled || false
    })) : [],
    ability: p.ability ? (ABILITY_MAP_EN_TO_ES[p.ability] || p.ability) : '',
    nature: p.set?.nature ? (NATURE_MAP_EN_TO_ES[p.set.nature] || p.set.nature) : '',
    volatiles: p.volatiles ? Object.keys(p.volatiles).reduce((acc, key) => {
      const v = p.volatiles[key];
      acc[key] = {
        id: v.id || key,
        duration: typeof v.duration === 'number' ? v.duration : undefined,
        time: typeof v.time === 'number' ? v.time : undefined,
        layers: typeof v.layers === 'number' ? v.layers : undefined,
        hp: typeof v.hp === 'number' ? v.hp : undefined,
        source: v.sourceEffect?.id || v.sourceEffect?.name || v.effect?.id || v.effect?.name || (v.source ? (v.source.id || v.source.name || String(v.source)) : undefined),
      };
      return acc;
    }, {} as Record<string, { id: string; duration?: number; time?: number; layers?: number; hp?: number }>) : {}
  }));
};

/**
 * Obtiene las condiciones de campo laterales activas
 */
const getSideConditions = (player: SimPlayer): SimSideCondition[] => {
  if (!player || !player.sideConditions) return [];
  return Object.keys(player.sideConditions).map((key) => {
    const cond = player.sideConditions[key];
    return {
      id: key,
      duration: cond.duration,
      layers: cond.layers,
    };
  });
};

/**
 * Obtiene el estado del clima en el campo de batalla
 */
const getFieldState = (battleInstance: Battle) => {
  return {
    weather: battleInstance.field.weather || '',
    weatherDuration: typeof battleInstance.field.weatherState.duration === 'number'
      ? battleInstance.field.weatherState.duration
      : 0,
  };
};

/**
 * Procesa las decisiones automáticas de la IA cuando el simulador lo requiere
 * de forma inmediata (por ejemplo, relevo obligatorio por debilitamiento).
 */
function handleBotDecisions(battleInstance: Battle) {
  let iterations = 0;
  // Bucle para resolver relevos obligatorios del bot de forma secuencial
  while (battleInstance.p2.activeRequest && !battleInstance.ended && iterations < 5) {
    iterations++;
    const req = battleInstance.p2.activeRequest;
    
    // Si la IA está en wait, no tiene ninguna elección pendiente
    if (req.wait) {
      break;
    }
    
    // Si la IA requiere relevo obligatorio (forceSwitch)
    if (req.forceSwitch) {
      const bestSwitchIndex = getOptimalCounterIndexForBot(battleInstance);
      if (bestSwitchIndex !== -1) {
        battleInstance.choose('p2', `switch ${bestSwitchIndex + 1}`);
      } else {
        battleInstance.choose('p2', 'default');
      }
    } else {
      // Si el jugador humano está en wait, pero la IA tiene alguna solicitud activa,
      // elegimos la opción por defecto para evitar congelamientos.
      const p1Req = battleInstance.p1.activeRequest;
      if (p1Req && p1Req.wait) {
        battleInstance.choose('p2', 'default');
      } else {
        break;
      }
    }
  }
}

// Escuchar mensajes del hilo principal
self.addEventListener('message', (event) => {
  const { action, data } = event.data;

  try {
    if (action === 'start') {
      const { playerTeam, enemyTeam } = data;

      // 1. Crear la instancia del combate con formato Gen 3 Custom Game
      battle = new Battle({ formatid: 'gen3customgame' as never });

      // 2. Formatear y registrar los equipos completos en Showdown
      const formattedPlayerTeam = playerTeam.map((p: WorkerSandboxPokemon) => {
        const engAbility = p.ability ? (ABILITY_MAP_ES_TO_EN[p.ability] || p.ability.toLowerCase()) : 'overgrow';
        const engNature = p.nature ? (NATURE_MAP_ES_TO_EN[p.nature] || 'Serious') : 'Serious';
        return {
          name: p.name,
          species: p.id,
          moves: p.moves,
          ability: engAbility,
          level: 50,
          evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          nature: engNature,
          item: '',
          gender: '',
        };
      });

      const formattedEnemyTeam = enemyTeam.map((p: WorkerSandboxPokemon) => {
        const engAbility = p.ability ? (ABILITY_MAP_ES_TO_EN[p.ability] || p.ability.toLowerCase()) : 'torrent';
        const engNature = p.nature ? (NATURE_MAP_ES_TO_EN[p.nature] || 'Serious') : 'Serious';
        return {
          name: p.name,
          species: p.id,
          moves: p.moves,
          ability: engAbility,
          level: 50,
          evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          nature: engNature,
          item: '',
          gender: '',
        };
      });

      battle.setPlayer('p1', {
        name: 'Player',
        team: formattedPlayerTeam,
      });

      battle.setPlayer('p2', {
        name: 'Enemy IA',
        team: formattedEnemyTeam,
      });

      // 3. Iniciar la batalla
      if (!battle.started) {
        battle.start();
      }

      // Resolver cualquier decisión automática que la IA deba tomar al inicio
      handleBotDecisions(battle);

      const playerActive = battle.p1.active[0];
      const enemyActive = battle.p2.active[0];

      // 4. Devolver logs de inicio e información de salud de los 6 combatientes
      const logs = battle.log.slice();
      self.postMessage({
        action: 'started',
        data: {
          logs,
          playerHP: playerActive ? playerActive.hp : 100,
          playerMaxHP: playerActive ? playerActive.maxhp : 100,
          enemyHP: enemyActive ? enemyActive.hp : 100,
          enemyMaxHP: enemyActive ? enemyActive.maxhp : 100,
          playerTeam: getTeamStatus(battle.p1),
          enemyTeam: getTeamStatus(battle.p2),
          fieldState: getFieldState(battle),
          playerSideConditions: getSideConditions(battle.p1),
          enemySideConditions: getSideConditions(battle.p2),
        }
      });

    } else if (action === 'choose') {
      if (!battle) {
        throw new Error('El combate no ha sido inicializado.');
      }

      const { playerChoice } = data; // ej: 'move 1' o 'switch 2'

      const oldLogLength = battle.log.length;

      // 1. Registrar elección del jugador humano si se requiere
      const p1Req = battle.p1.activeRequest;
      const canChooseP1 = p1Req && !p1Req.wait;

      if (canChooseP1) {
        battle.choose('p1', playerChoice);
      }

      // 2. Registrar elección estratégica de la IA del Bot si se requiere
      const p2Req = battle.p2.activeRequest;
      const canChooseP2 = p2Req && !p2Req.wait;

      if (canChooseP2) {
        const enemyActive = battle.p2.active[0];

        if (!enemyActive || enemyActive.fainted || (p2Req && p2Req.forceSwitch)) {
          // CASO A: IA Debilitada (Relevo obligatorio)
          const bestSwitchIndex = getOptimalCounterIndexForBot(battle);
          if (bestSwitchIndex !== -1) {
            battle.choose('p2', `switch ${bestSwitchIndex + 1}`);
          } else {
            battle.choose('p2', 'default');
          }
        } else {
          // CASO B: IA Activa (Decidir si cambiar voluntariamente o atacar)
          let choseAction = false;
          const playerActive = battle.p1.active[0];

          // Detección de desventaja severa de tipo
          let hasTypeDisadvantage = false;
          if (playerActive) {
            const playerTypes = playerActive.types;
            let maxBotEff = 0;
            for (const moveSlot of enemyActive.moveSlots) {
              const move = battle.dex.moves.get(moveSlot.id);
              const eff = getMoveEffectiveness(move.type, playerTypes);
              if (eff > maxBotEff) maxBotEff = eff;
            }
            if (maxBotEff < 1) {
              hasTypeDisadvantage = true; // El bot no daña súper efectivo
            }
          }

          // Probabilidad de cambio voluntario: 30% en desventaja extrema, 10% base
          const shouldSwitchVoluntarily = (hasTypeDisadvantage && Math.random() < 0.3) || (Math.random() < 0.1);

          if (shouldSwitchVoluntarily) {
            const bestSwitchIndex = getOptimalCounterIndexForBot(battle);
            // Solo cambiar si encontramos un counter viable en el banco
            if (bestSwitchIndex !== -1) {
              battle.choose('p2', `switch ${bestSwitchIndex + 1}`);
              choseAction = true;
            }
          }

          if (!choseAction) {
            // IA Atacante: Priorizar daño súper efectivo
            const moves = enemyActive.moveSlots;
            if (moves && moves.length > 0) {
              let bestMoveIndex = 0;
              let bestScore = -1;

              for (let i = 0; i < moves.length; i++) {
                const moveSlot = moves[i];
                const move = battle.dex.moves.get(moveSlot.id);
                const targetTypes = playerActive ? playerActive.types : ['Normal'];
                const effectiveness = getMoveEffectiveness(move.type, targetTypes);
                const basePower = move.basePower || 40;
                const isStatus = move.category === 'Status';

                let score = effectiveness * basePower;
                if (isStatus) {
                  score = effectiveness > 1 ? 50 : 25; // Puntuación baja para estados no óptimos
                }

                if (score > bestScore) {
                  bestScore = score;
                  bestMoveIndex = i;
                }
              }

              try {
                const success = battle.choose('p2', `move ${bestMoveIndex + 1}`);
                if (!success) {
                  battle.choose('p2', 'default');
                }
              } catch {
                battle.choose('p2', 'default');
              }
            } else {
              battle.choose('p2', 'default');
            }
          }
        }
      }

      // 3. Procesar decisiones automáticas inmediatas que la IA deba tomar tras la resolución
      handleBotDecisions(battle);

      // 4. Capturar nuevos logs de resolución de turno
      const newLogs = battle.log.slice(oldLogLength);
      
      const playerActive = battle.p1.active[0];
      const enemyActiveNew = battle.p2.active[0];

      self.postMessage({
        action: 'turn_resolved',
        data: {
          logs: newLogs,
          playerHP: playerActive ? playerActive.hp : 0,
          playerMaxHP: playerActive ? playerActive.maxhp : 100,
          enemyHP: enemyActiveNew ? enemyActiveNew.hp : 0,
          enemyMaxHP: enemyActiveNew ? enemyActiveNew.maxhp : 100,
          playerFainted: playerActive ? playerActive.fainted : true,
          enemyFainted: enemyActiveNew ? enemyActiveNew.fainted : true,
          playerTeam: getTeamStatus(battle.p1),
          enemyTeam: getTeamStatus(battle.p2),
          fieldState: getFieldState(battle),
          playerSideConditions: getSideConditions(battle.p1),
          enemySideConditions: getSideConditions(battle.p2),
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ action: 'error', data: { message } });
  }
});
