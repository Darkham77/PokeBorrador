import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';

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


const KNOWN_FEMALE_SPRITES: readonly string[] = [ // no-domain
  'nurse', 'nurseryaide', 'battlegirl', 'beauty', 'lass', 'aromalady', 'lady', 'skyla',
  'erika', 'misty', 'sabrina', 'sonia', 'sonia-professor', 'juniper', 'sada', 'sada-ai',
  'briar', 'miriam', 'raifort', 'kahili', 'winona', 'katy', 'bea', 'whitney', 'flannery',
  'fantina', 'candice', 'iris', 'roxie', 'korrina', 'valerie', 'olympia', 'acerola',
  'mina', 'nessa', 'marnie', 'allister', 'klara', 'iono', 'tulip', 'geeta', 'lillie',
  'lusamine', 'mallow', 'lanacu', 'marley', 'cheryl', 'cynthia', 'daisy', 'yellow',
  'doctorf', 'scientistf', 'skytrainerf', 'pokemonrangerf'
];

const KNOWN_MALE_SPRITES: readonly string[] = [ // no-domain
  'oak', 'elm', 'rowan', 'kukui', 'sycamore', 'birch', 'blaine', 'brock', 'lt-surge',
  'koga', 'giovanni', 'falkner', 'bugsy', 'morty', 'chuck', 'pryce', 'clair',
  'roark', 'byron', 'volkner', 'cilan', 'chili', 'cress', 'burgh', 'clay', 'drayden',
  'cheren', 'rood', 'zinzolin', 'ghetsis', 'colress', 'hugh', 'milo', 'kabu',
  'gordie', 'piers', 'raihan', 'blackbelt', 'hiker', 'bugcatcher', 'gentleman',
  'biker', 'fisherman', 'birdkeeper', 'scientist', 'youngster', 'supernerd',
  'psychic', 'tamer', 'policeman', 'doctor'
];

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
  spriteId?: NpcSpriteId | string;
  archetype?: NpcArchetype | string;
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
