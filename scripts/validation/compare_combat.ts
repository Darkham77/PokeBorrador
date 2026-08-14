// fallow-ignore-file security-sink
import fs from 'node:fs';
import path from 'node:path';
import { Battle, Dex } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '../../src/data/system/constants.ts';
import {
  MAXIMUM_POKEMON_LEVEL,
  BATTLE_TOTAL_STAGES_COUNT,
  BATTLE_MAX_STAGE_OFFSET,
  SHOWDOWN_DAMAGE_VARIANCE_MIN,
  SHOWDOWN_DAMAGE_VARIANCE_MAX_EXCLUSIVE
} from '../../src/logic/constants/gameplay.ts';
import {
  E2E_EV_BALANCED_VALUE,
  E2E_MAX_IV_VALUE,
  HIGH_SURVIVAL_HP_CAP,
  DEFAULT_WEATHER_TURNS_COUNT
} from '../e2e/simulation_config.ts';
import { toPokemonType } from '../../src/data/battle/types.ts';
import { calculateDamagePure, getMoveCategory } from '../../src/logic/battle/battleMath.ts';
import type { PurePokemon, PureMove, PureBattleWeather, PureDamageOptions } from '../../src/logic/battle/battleMathTypes.ts';

// Diccionario para traducir habilidades de nuestro motor (Español) a Showdown (Inglés)
const ABILITY_MAP_ES_TO_EN: Record<string, string> = {
  'Espesura': 'overgrow',
  'Clorofila': 'chlorophyll',
  'Mar llamas': 'blaze',
  'Poder solar': 'solarpower',
  'Torrente': 'torrent',
  'Lluvia Ligera': 'raindish',
  'Agallas': 'guts',
  'Robustez': 'sturdy',
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
  'Espíritu Vital': 'vitalspirit',
  'Sincronía': 'synchronize',
  'Cuerpo Puro': 'clearbody',
  'Despiste': 'oblivious',
  'Imán': 'magnetpull',
  'Fuga': 'runaway',
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
  'Punto tóxico': 'poisonpoint',
  'Experto': 'technician',
  'Absorbe Voltio': 'voltabsorb',
  'Foco interno': 'innerfocus',
  'Rivalidad': 'rivalry',
  'Muro Mágico': 'magicguard',
  'Viscosidad': 'stickyhold',
  'Dicha': 'serenegrace',
  'Sombra Trampa': 'shadowtag',
  'Bucle Aire': 'airlock',
  'Gran Encanto': 'cutecharm',
  'Potencia': 'hugepower',
  'Energía pura': 'purepower',
  'Llovizna': 'drizzle',
  'Sequía': 'drought',
  'Chorro Arena': 'sandstream'
};

const COMPARE_COMBAT_WEATHER_MAP: Record<string, string> = {
  'clear': 'clear',
  'sun': 'sunnyday',
  'rain': 'raindance',
  'sandstorm': 'sandstorm',
  'hail': 'hail',
  'snow': 'hail'
};

const ITEMS_MAP: Record<string, string> = {
  'charcoal': 'charcoal',
  'magnet': 'magnet',
  'mysticwater': 'mysticwater',
  'miracleseed': 'miracleseed',
  'black_belt': 'blackbelt',
  'twistedspoon': 'twistedspoon',
  'spelltag': 'spelltag',
  'silverpowder': 'silverpowder',
  'poisonbarb': 'poisonbarb',
  'choiceband': 'choiceband',
  'scopelens': 'scopelens'
};

const gen3Dex = Dex.forGen(ACTIVE_GENERATION);
const allPokemon = gen3Dex.species.all().filter(p => !p.isNonstandard && p.num > 0);
const allMoves = gen3Dex.moves.all().filter(m => 
  !m.isNonstandard && 
  m.category !== 'Status' && 
  m.basePower > 0 &&
  !m.multihit &&
  m.id !== 'struggle' &&
  !['beatup', 'bide', 'counter', 'mirrorcoat', 'seismictoss', 'nightshade', 'psywave', 'superfang', 'endeavor', 'sonicboom', 'dragonrage', 'magnitude', 'present', 'triplekick', 'doublekick', 'doublehit', 'bonerush', 'bulletseed', 'cometpunch', 'doubleslap', 'furyattack', 'furyswipes', 'iciclespear', 'pinmissile', 'rockblast', 'spikecannon', 'selfdestruct', 'explosion'].includes(m.id)
);

function getRandomElement<T>(arr: T[]): T {
  const element = arr[Math.floor(Math.random() * arr.length)];
  if (element === undefined) {
    throw new Error('Empty array or undefined element');
  }
  return element;
}

interface RunOptions {
  enableStages: boolean;
  enableWeather: boolean;
  enableAbilitiesAndItems: boolean;
  enableCustomFeatures: boolean; // Ciclos de día y thunderstorm
}

interface ComparisonResult {
  passed: boolean;
  ourDamage: number;
  showdownDamage: number;
  details: string;
}

function executeComparison(options: RunOptions): ComparisonResult {
  const p1Spec = getRandomElement(allPokemon);
  const p2Spec = getRandomElement(allPokemon);
  const moveSpec = getRandomElement(allMoves);
  const level = Math.floor(Math.random() * MAXIMUM_POKEMON_LEVEL) + 1;

  // Modificadores condicionales
  const p1AbilityEs = options.enableAbilitiesAndItems ? getRandomElement(Object.keys(ABILITY_MAP_ES_TO_EN)) : null;
  const p2AbilityEs = options.enableAbilitiesAndItems ? getRandomElement(Object.keys(ABILITY_MAP_ES_TO_EN)) : null;

  const p1Item = options.enableAbilitiesAndItems ? getRandomElement([undefined, ...Object.keys(ITEMS_MAP)]) : undefined;
  const p2Item = options.enableAbilitiesAndItems ? getRandomElement([undefined, ...Object.keys(ITEMS_MAP)]) : undefined;

  const weatherType = options.enableWeather 
    ? getRandomElement(['clear', 'sun', 'rain', 'sandstorm', 'hail'])
    : 'clear';

  // Si deshabilitamos custom features, fijamos ciclo a 'day' (que no tiene bonus en agua/fuego)
  const dayCycle = options.enableCustomFeatures 
    ? getRandomElement(['morning', 'day', 'dusk', 'night'] as const)
    : 'day'; 

  const atkStages = options.enableStages ? Math.floor(Math.random() * BATTLE_TOTAL_STAGES_COUNT) - BATTLE_MAX_STAGE_OFFSET : 0;
  const defStages = options.enableStages ? Math.floor(Math.random() * BATTLE_TOTAL_STAGES_COUNT) - BATTLE_MAX_STAGE_OFFSET : 0;

  // Simulación en Showdown
  const battle = new Battle({ formatid: 'gen3customgame' as never });
  
  if (battle.actions) {
    (battle.actions as { checkAccuracy?: () => boolean }).checkAccuracy = function() {
      return true;
    };
  }

  const originalRandom = battle.prng.random;
  battle.prng.random = function(from, to) {
    if (from === SHOWDOWN_DAMAGE_VARIANCE_MIN && to === SHOWDOWN_DAMAGE_VARIANCE_MAX_EXCLUSIVE) return MAXIMUM_POKEMON_LEVEL;
    return originalRandom.call(this, from, to);
  };

  const p1AbilityEn = p1AbilityEs ? (ABILITY_MAP_ES_TO_EN[p1AbilityEs] ?? '') : '';
  const p2AbilityEn = p2AbilityEs ? (ABILITY_MAP_ES_TO_EN[p2AbilityEs] ?? '') : '';
  const p1ItemEn = p1Item ? (ITEMS_MAP[p1Item] ?? '') : '';
  const p2ItemEn = p2Item ? (ITEMS_MAP[p2Item] ?? '') : '';

  battle.setPlayer('p1', {
    name: 'Player',
    team: [{
      name: 'Attacker',
      species: p1Spec.id,
      level,
      ability: p1AbilityEn,
      item: p1ItemEn,
      nature: '',
      gender: '',
      moves: [moveSpec.id],
      evs: { hp: 0, atk: E2E_EV_BALANCED_VALUE, def: E2E_EV_BALANCED_VALUE, spa: E2E_EV_BALANCED_VALUE, spd: E2E_EV_BALANCED_VALUE, spe: E2E_EV_BALANCED_VALUE },
      ivs: { hp: E2E_MAX_IV_VALUE, atk: E2E_MAX_IV_VALUE, def: E2E_MAX_IV_VALUE, spa: E2E_MAX_IV_VALUE, spd: E2E_MAX_IV_VALUE, spe: E2E_MAX_IV_VALUE }
    }]
  });

  battle.setPlayer('p2', {
    name: 'Enemy',
    team: [{
      name: 'Defender',
      species: p2Spec.id,
      level,
      ability: p2AbilityEn,
      item: p2ItemEn,
      nature: '',
      gender: '',
      moves: ['splash'],
      evs: { hp: 0, atk: E2E_EV_BALANCED_VALUE, def: E2E_EV_BALANCED_VALUE, spa: E2E_EV_BALANCED_VALUE, spd: E2E_EV_BALANCED_VALUE, spe: E2E_EV_BALANCED_VALUE },
      ivs: { hp: E2E_MAX_IV_VALUE, atk: E2E_MAX_IV_VALUE, def: E2E_MAX_IV_VALUE, spa: E2E_MAX_IV_VALUE, spd: E2E_MAX_IV_VALUE, spe: E2E_MAX_IV_VALUE }
    }]
  });

  const act1 = battle.p1.active[0];
  const act2 = battle.p2.active[0];
  if (!act1 || !act2) {
    return { passed: false, ourDamage: 0, showdownDamage: 0, details: 'Error al inicializar combatientes' };
  }

  // Establecer clima en Showdown
  const sdWeather = COMPARE_COMBAT_WEATHER_MAP[weatherType];
  if (sdWeather && sdWeather !== 'clear') {
    battle.field.setWeather(sdWeather as never, act1);
  }

  // Aplicar stages en Showdown (basado en tipos de Gen 3)
  const physicalTypes = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel']; // no-domain
  const isPhysical = physicalTypes.includes(moveSpec.type.toLowerCase());
  const statKeyAtk = isPhysical ? 'atk' : 'spa';
  const statKeyDef = isPhysical ? 'def' : 'spd';

  if (atkStages !== 0) {
    act1.boosts[statKeyAtk] = atkStages;
  }
  if (defStages !== 0) {
    act2.boosts[statKeyDef] = defStages;
  }

  // Defender tiene suficiente HP
  act2.maxhp = HIGH_SURVIVAL_HP_CAP;
  act2.hp = HIGH_SURVIVAL_HP_CAP;

  battle.choose('p1', 'move 1');
  battle.choose('p2', 'move 1');

  const showdownDamage = HIGH_SURVIVAL_HP_CAP - act2.hp;

  // Mapeamos los stats a nuestro formato PurePokemon
  const ourAttacker: PurePokemon = {
    level,
    atk: act1.storedStats.atk,
    def: act1.storedStats.def,
    spa: act1.storedStats.spa,
    spd: act1.storedStats.spd,
    spe: act1.storedStats.spe,
    type: toPokemonType((p1Spec.types[0] ?? 'normal').toLowerCase()),
    type2: p1Spec.types[1] ? toPokemonType(p1Spec.types[1].toLowerCase()) : undefined,
    ability: p1AbilityEs,
    heldItem: p1Item
  };

  const ourDefender: PurePokemon = {
    level,
    atk: act2.storedStats.atk,
    def: act2.storedStats.def,
    spa: act2.storedStats.spa,
    spd: act2.storedStats.spd,
    spe: act2.storedStats.spe,
    type: toPokemonType((p2Spec.types[0] ?? 'normal').toLowerCase()),
    type2: p2Spec.types[1] ? toPokemonType(p2Spec.types[1].toLowerCase()) : undefined,
    ability: p2AbilityEs,
    heldItem: p2Item
  };

  const ourMove: PureMove = {
    id: moveSpec.id,
    name: moveSpec.name,
    type: toPokemonType(moveSpec.type.toLowerCase()), // string-ok
    power: moveSpec.basePower,
    cat: getMoveCategory({ id: moveSpec.id, type: toPokemonType(moveSpec.type.toLowerCase()), power: moveSpec.basePower }) // string-ok
  };

  const weatherObj: PureBattleWeather | null = weatherType !== 'clear' ? { type: weatherType, turns: DEFAULT_WEATHER_TURNS_COUNT } : null;
  const ctx: PureDamageOptions = {
    atkStages,
    defStages,
    weather: weatherObj
  };

  const ourRes = calculateDamagePure(ourAttacker, ourDefender, ourMove, ctx, dayCycle, 1.0, false);
  const ourDamage = ourRes.dmg;

  const sdAtk = act1.getStat(isPhysical ? 'atk' : 'spa');
  const sdDef = act2.getStat(isPhysical ? 'def' : 'spd');

  const passed = ourDamage === showdownDamage;
  const details = `Mov: ${moveSpec.name} (Pwr: ${moveSpec.basePower}, Type: ${moveSpec.type}).
Stages - Atk: ${atkStages}, Def: ${defStages}.
Nuestro Motor: Atk=${ourAttacker.atk}, SpA=${ourAttacker.spa}; Def=${ourDefender.def}, SpD=${ourDefender.spd}.
Showdown: Atk=${sdAtk}, Def=${sdDef}.
Clima: ${weatherType}, Ciclo: ${dayCycle}.`;

  return { passed, ourDamage, showdownDamage, details };
}

// Ejecutar fases de prueba
const PHASES = [
  {
    name: 'Fase 1: Matemática Pura (Sin stages, climas, habilidades u objetos)',
    options: { enableStages: false, enableWeather: false, enableAbilitiesAndItems: false, enableCustomFeatures: false }
  },
  {
    name: 'Fase 2: Matemática + Modificadores de Nivel (Stages)',
    options: { enableStages: true, enableWeather: false, enableAbilitiesAndItems: false, enableCustomFeatures: false }
  },
  {
    name: 'Fase 3: Matemática + Clima Estándar',
    options: { enableStages: false, enableWeather: true, enableAbilitiesAndItems: false, enableCustomFeatures: false }
  },
  {
    name: 'Fase 4: Matemática + Habilidades y Objetos Estándar',
    options: { enableStages: false, enableWeather: false, enableAbilitiesAndItems: true, enableCustomFeatures: false }
  },
  {
    name: 'Fase 5: Combate Completo (Todo habilitado)',
    options: { enableStages: true, enableWeather: true, enableAbilitiesAndItems: true, enableCustomFeatures: true }
  }
];

/** Total randomized comparison iterations per test phase. */
export const COMPARISON_ITERATIONS_COUNT = 500;

/** Maximum sample size of failed cases logged to reporting artifacts. */
export const MAX_FAILURE_SAMPLES_COUNT = 10;

const iterations = COMPARISON_ITERATIONS_COUNT;
const reports: string[] = []; // no-domain

console.log('Iniciando comparación por fases...');

PHASES.forEach(phase => {
  let passedCount = 0;
  const fails: ReturnType<typeof executeComparison>[] = [];

  for (let i = 0; i < iterations; i++) {
    const res = executeComparison(phase.options);
    if (res.passed) {
      passedCount++;
    } else {
      fails.push(res);
    }
  }

  const accuracy = (passedCount / iterations) * 100;
  const reportLine = `* **${phase.name}**: ${passedCount}/${iterations} (${accuracy.toFixed(2)}% de coincidencia)`;
  console.log(reportLine);
  reports.push(`## ${phase.name}\nCoincidencia: ${passedCount}/${iterations} (${accuracy.toFixed(2)}%)\n`);

  if (fails.length > 0) {
    reports.push('### Muestra de Fallos:\n');
    fails.slice(0, MAX_FAILURE_SAMPLES_COUNT).forEach((f, idx) => {
      reports.push(`#### Fallo #${idx + 1} (Dif: ${f.ourDamage - f.showdownDamage})
* **Nuestra estimación**: \`${f.ourDamage}\`
* **Showdown**: \`${f.showdownDamage}\`
* **Detalles**: ${f.details}
`);
    });
    reports.push('\n---\n');
  }
});

const scratchDir = path.resolve(import.meta.dirname, '../../scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

fs.writeFileSync(
  path.join(scratchDir, 'combat_comparison.md'),
  `# Reporte de Auditoría de Fórmulas por Fases

Este reporte evalúa la precisión matemática del motor de Poké Vicio comparado con \`@pkmn/sim\` (Showdown) bajo reglas de Gen 3 en diferentes niveles de complejidad.

## Resultados Generales
${PHASES.map((p, i) => {
  const reportBlock = reports[i * 2] ?? '';
  const line = reportBlock.split('\n')[1] ?? ''; // Extrae la línea de acierto
  return `* **${p.name}**: ${line}`;
}).join('\n')}

---

${reports.join('\n')}
`
);

console.log(`\nAuditoría por fases completada. Reporte guardado en scratch/combat_comparison.md`);
