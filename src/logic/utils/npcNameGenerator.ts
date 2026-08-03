export type NpcGender = 'M' | 'F';

export const MALE_NAMES = [
  'Chano', 'Roberto', 'Pedro', 'Paco', 'Andrés', 'Elías', 'Carlos', 'Hugo', 'Lucas',
  'Ramón', 'Tomás', 'Mateo', 'Diego', 'Bruno', 'Marcos', 'Gonzalo', 'Javier', 'Iván',
  'Adrián', 'Gabriel', 'David', 'Joaquín', 'Martín', 'Nicolás', 'Leo', 'Alejandro',
  'Samuel', 'Santiago', 'Daniel', 'Esteban', 'Manuel', 'Álvaro', 'Guillermo', 'Rubén',
  'Mario', 'Sergio', 'Jorge', 'Raúl', 'Víctor', 'Ignacio', 'Fernando', 'Ricardo',
  'Felipe', 'Héctor', 'Óscar', 'César', 'Jaime', 'Alberto', 'Rodrigo', 'Santi'
] as const;


export const FEMALE_NAMES = [
  'Sara', 'Lucía', 'María', 'Elena', 'Laura', 'Ana', 'Carmen', 'Clara', 'Marta',
  'Sofía', 'Paula', 'Alba', 'Irene', 'Nerea', 'Carla', 'Valeria', 'Daniela', 'Almudena',
  'Noelia', 'Beatriz', 'Inés', 'Rocío', 'Lorena', 'Silvia', 'Lidia', 'Patricia',
  'Alicia', 'Andrea', 'Cristina', 'Marina', 'Nuria', 'Natalia', 'Miriam', 'Verónica',
  'Eva', 'Rosa', 'Teresa', 'Begoña', 'Pilar', 'Isabel', 'Gloria', 'Victoria',
  'Angela', 'Celia', 'Jimena', 'Leire', 'Vega', 'Lara', 'Ainhoa', 'Naiara'
] as const;


const KNOWN_FEMALE_SPRITES = [
  'nurse', 'nurseryaide', 'battlegirl', 'beauty', 'lass', 'aromalady', 'lady', 'skyla',
  'erika', 'misty', 'sabrina', 'sonia', 'sonia-professor', 'juniper', 'sada', 'sada-ai',
  'briar', 'miriam', 'raifort', 'kahili', 'winona', 'katy', 'bea', 'whitney', 'flannery',
  'fantina', 'candice', 'iris', 'roxie', 'korrina', 'valerie', 'olympia', 'acerola',
  'mina', 'nessa', 'marnie', 'allister', 'klara', 'iono', 'tulip', 'geeta', 'lillie',
  'lusamine', 'mallow', 'lanacu', 'marley', 'cheryl', 'cynthia', 'daisy', 'yellow',
  'doctorf', 'scientistf', 'skytrainerf', 'pokemonrangerf',
  'whitney', 'flannery', 'winona', 'candice', 'iris', 'eleesa', 'korrina', 'nessa',
  'bea', 'marnie', 'acerola', 'kahili', 'mallow', 'lana', 'lusamine', 'lillie',
  'cynthia', 'diantha', 'nemona', 'penny', 'geeta', 'mira', 'turo-ai', 'parasollady',
  'picnicker', 'hexmaniac', 'channeler', 'medium', 'swimmerf', 'swimmerf-gen4',
  'swimmerf-gen5', 'tuberf', 'teacher', 'interviewers', 'kimonogirl', 'cowgirl',
  'dancer', 'idol', 'nurse-gen4', 'nurse-gen5', 'nurseryaide-gen5'
] as const satisfies readonly string[]; // no-domain

const KNOWN_MALE_SPRITES = [
  'youngster', 'bugcatcher', 'camper', 'picnicker-m', 'hiker', 'fisherman',
  'birdkeeper', 'blackbelt', 'cueball', 'gambler', 'rocker', 'tamer', 'engineer',
  'juggler', 'gentleman', 'biker', 'sailor', 'swimmerm', 'swimmerm-gen4',
  'psychic-m', 'schoolboy', 'supernerd', 'red', 'blue', 'green', 'oak',
  'lance', 'steven', 'wallace', 'alder', 'cheren', 'n', 'ghetsis', 'colress',
  'zygard', 'volkner', 'roark', 'byron', 'fantina', 'clay', 'brycen', 'drayden',
  'scientist', 'doctor'
] as const satisfies readonly string[]; // no-domain

const ARCHETYPE_TITLES: Record<string, { M: string; F: string }> = {
  caza_bichos: { M: 'Caza Bichos', F: 'Caza Bichos' },
  ornitologo: { M: 'Ornitólogo', F: 'Ornitóloga' },
  cientifico: { M: 'Científico', F: 'Científica' },
  luchador: { M: 'Luchador', F: 'Luchadora' },
  pescador: { M: 'Pescador', F: 'Pescadora' },
  nadador: { M: 'Nadador', F: 'Nadadora' },
  domador: { M: 'Domador', F: 'Domadora' },
  medium: { M: 'Médium', F: 'Médium' },
  motorista: { M: 'Motorista', F: 'Motorista' },
  montanero: { M: 'Montañero', F: 'Montañera' },
  rocket: { M: 'Recluta Rocket', F: 'Recluta Rocket' },
  criador: { M: 'Criador Pokémon', F: 'Criadora Pokémon' },
  aristocrata: { M: 'Aristócrata', F: 'Aristócrata' },
  ranger: { M: 'Ranger Pokémon', F: 'Ranger Pokémon' },
  pokefan: { M: 'Pokéfan', F: 'Pokéfan' },
  policeman: { M: 'Oficial de Policía', F: 'Oficial de Policía' },
  artista: { M: 'Artista', F: 'Artista' },
  rival: { M: 'Rival', F: 'Rival' },
  default: { M: 'Joven', F: 'Joven' }
};

export interface NpcNameOptions {
  spriteId?: string;
  archetype?: string;
  gender?: NpcGender;
  includeTitle?: boolean;
}

export function detectGenderFromSprite(spriteId?: string): NpcGender {
  if (!spriteId) return Math.random() < 0.5 ? 'M' : 'F';
  const clean = spriteId.trim();
  const baseName = clean.split('-')[0] || clean;

  // Check known female sprite IDs or suffixes
  if (
    KNOWN_FEMALE_SPRITES.includes(clean) ||
    KNOWN_FEMALE_SPRITES.includes(baseName) ||
    clean.includes('female') ||
    clean.endsWith('f') ||
    clean.includes('girl') ||
    clean.includes('lady')
  ) {
    return 'F';
  }

  // Check known male sprite IDs
  if (
    KNOWN_MALE_SPRITES.includes(clean) ||
    KNOWN_MALE_SPRITES.includes(baseName) ||
    clean.includes('man') ||
    clean.includes('boy')
  ) {
    return 'M';
  }

  // Generic heuristic based on sprite name string
  if (clean.includes('f-') || clean.includes('woman') || clean.includes('mother')) {
    return 'F';
  }

  return Math.random() < 0.5 ? 'M' : 'F';
}

export function generateNpcName(options?: NpcNameOptions): string {
  const gender = options?.gender ?? detectGenderFromSprite(options?.spriteId);

  const namePool = gender === 'F' ? FEMALE_NAMES : MALE_NAMES;
  const personalName = namePool[Math.floor(Math.random() * namePool.length)] || 'Entrenador';

  if (!options?.includeTitle) {
    return personalName;
  }

  const archKey = options.archetype || 'default';
  const titleObj = ARCHETYPE_TITLES[archKey] ?? ARCHETYPE_TITLES['default']!;
  const title = titleObj[gender];

  return `${title} ${personalName}`;
}
