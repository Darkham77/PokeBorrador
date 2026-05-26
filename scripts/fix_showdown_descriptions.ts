import fs from 'node:fs';

const DB_PATH = './showdown/sandbox_db/data/showdown_db_es.json';

interface DBMove {
  id: string;
  name: string;
  type: string;
  category: string;
  basePower: number;
  accuracy: number | boolean;
  pp: number;
  desc: string;
  shortDesc: string;
}

interface ShowdownDB {
  pokemon: Record<string, unknown>;
  moves: Record<string, DBMove>;
  abilities: Record<string, unknown>;
}

const CLEAN_DESCRIPTIONS: Record<string, string> = {
  assist: 'El usuario realiza un movimiento elegido al azar de entre los de su equipo.',
  bide: 'El usuario aguanta golpes durante dos turnos y devuelve el doble del daño recibido.',
  feintattack: 'Ataque rápido y garantizado que no puede fallar.',
  flash: 'Reduce la precisión del objetivo en un nivel.',
  foresight: 'Permite golpear a Pokémon de tipo Fantasma con movimientos de tipo Normal y Lucha.',
  hiddenpower: 'Su tipo y potencia varían según los valores individuales (IVs) del usuario.',
  jumpkick: 'Una patada voladora. Si falla, el usuario recibe daño por retroceso.',
  mirrormove: 'El usuario imita el último movimiento utilizado por el objetivo.',
  needlearm: 'Puede hacer retroceder al objetivo (30% de probabilidad).',
  nightmare: 'Causa daño residual cada turno a un oponente dormido.',
  odorsleuth: 'Permite golpear a Fantasmas con Normal y Lucha, y anula aumentos de evasión.',
  pursuit: 'Inflige el doble de daño si el oponente intenta retirarse de la batalla.',
  camouflage: 'Cambia el tipo del Pokémon usuario según el terreno de combate.',
  clamp: 'Atrapa al objetivo en una tenaza causando daño residual durante 2-5 turnos.',
  mudsport: 'Reduce la potencia de los ataques eléctricos en el campo de batalla.',
  secretpower: 'Tiene un 30% de probabilidad de causar un efecto secundario según el terreno.',
  tailglow: 'Aumenta drásticamente el Ataque Especial del usuario en dos niveles.',
  watersport: 'Reduce la potencia de los ataques de fuego en el campo de batalla.',
  barrier: 'Aumenta drásticamente la Defensa del usuario en dos niveles.',
  bubble: 'Puede reducir la Velocidad del objetivo (10% de probabilidad).',
  grasswhistle: 'Duerme al objetivo mediante un silbido de hierba.',
  psywave: 'Causa una cantidad de daño aleatoria basada en el nivel del usuario.',
  smellingsalts: 'Causa el doble de daño a un objetivo paralizado, pero cura su parálisis.',
  barrage: 'Ataca de 2 a 5 veces consecutivas en el mismo turno.',
  boneclub: 'Puede hacer retroceder al objetivo (10% de probabilidad).',
  cometpunch: 'Ataca de 2 a 5 veces consecutivas en el mismo turno.',
  constrict: 'Puede reducir la Velocidad del oponente (10% de probabilidad).',
  dizzypunch: 'Puede confundir al objetivo (20% de probabilidad).',
  doubleslap: 'Ataca de 2 a 5 veces consecutivas en el mismo turno.',
  dragonrage: 'Causa siempre 40 PS de daño al objetivo de forma fija.',
  eggbomb: 'Lanza un huevo masivo que explota causando daño.',
  frustration: 'Su potencia aumenta cuanto menos feliz sea el Pokémon con su entrenador.',
  iceball: 'Ataca durante 5 turnos consecutivos, duplicando su daño con cada acierto.',
  karatechop: 'Tiene una alta probabilidad de asestar un golpe crítico.',
  magnitude: 'Causa un terremoto de potencia aleatoria basada en una escala de 4 a 10.',
  meditate: 'Aumenta el Ataque del usuario en un nivel.',
  psychoboost: 'Ataque masivo que reduce el Ataque Especial del usuario en dos niveles.',
  rage: 'Aumenta el Ataque del usuario cada vez que es golpeado por el rival.',
  razorwind: 'El usuario crea un torbellino en el primer turno y ataca en el segundo.',
  refresh: 'Cura al usuario de parálisis, envenenamiento o quemaduras.',
  return: 'Su potencia aumenta cuanto más feliz sea el Pokémon con su entrenador.',
  rollingkick: 'Puede hacer retroceder al objetivo (30% de probabilidad).',
  sharpen: 'Aumenta el Ataque del usuario en un nivel al afilar sus bordes.',
  signalbeam: 'Puede confundir al objetivo (10% de probabilidad).',
  silverwind: 'Puede aumentar todas las estadísticas del usuario en un nivel (10%).',
  skyuppercut: 'Un gancho ascendente que puede golpear a objetivos en el aire (Vuelo).',
  sonicboom: 'Causa siempre 20 PS de daño al objetivo de forma fija.',
  spiderweb: 'Evita que el objetivo pueda huir o ser cambiado del combate.',
  spikecannon: 'Ataca de 2 a 5 veces consecutivas en el mismo turno.',
  twineedle: 'Ataca dos veces e inflige daño con probabilidad de envenenar (20%).'
};

function fixShowdownDescriptions() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('Showdown DB not found at: ' + DB_PATH);
    return;
  }

  const db: ShowdownDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  let fixedCount = 0;

  for (const [key, descText] of Object.entries(CLEAN_DESCRIPTIONS)) {
    const move = db.moves[key];
    if (move) {
      move.desc = descText;
      move.shortDesc = descText;
      fixedCount++;
    }
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`¡ÉXITO! Se han reparado ${fixedCount} descripciones obsoletas en la base de datos de Showdown.`);
}

fixShowdownDescriptions();
