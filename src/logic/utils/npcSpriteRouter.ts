import { ARCHETYPE_SPRITES, VALID_NPC_SPRITES, type NpcSpriteId } from '../../data/pokemon/npcSpriteCatalog.ts';
export type { NpcSpriteId } from '../../data/pokemon/npcSpriteCatalog.ts';

export type NpcArchetype =
  | 'rival'         // Renowned masters / rivals
  | 'caza_bichos'   // Bug Catcher / Bug Maniac
  | 'ornitologo'    // Bird Keeper
  | 'cientifico'    // Scientist / Super Nerd
  | 'luchador'      // Black Belt / Battle Girl
  | 'pescador'      // Fisherman
  | 'nadador'       // Swimmer
  | 'domador'       // Tamer / Roughneck
  | 'medium'        // Psychic / Medium / Channeler
  | 'motorista'     // Biker / Cue Ball / Punk Guy
  | 'montanero'     // Hiker / Ruin Maniac
  | 'rocket'        // Team Rocket Grunts
  | 'criador'       // Pokemon Breeder
  | 'aristocrata'   // Gentleman / Lady / Madame / Rich Boy
  | 'ranger'        // Pokemon Ranger
  | 'pokefan'       // Pokefan
  | 'policeman'     // Police officer
  | 'artista'       // Beauty / Dancer / Model / Artist
  | 'default';      // Youngster / Lass / Camper / Picnicker

// Mapping of archetypes to keywords found in sprite filenames or NPC names
export const ARCHETYPE_KEYWORDS: Record<NpcArchetype, string[]> = {
  rival: ['master', 'alder', 'arven', 'ash', 'barry', 'bianca', 'blue', 'brendan', 'calem', 'candela', 'carmine', 'cheren', 'cynthia', 'diantha', 'elaine', 'elio', 'ethan', 'geeta', 'gladion', 'gloria', 'green', 'hau', 'hilbert', 'hilda', 'hop', 'hugh', 'ingo', 'iris', 'kieran', 'kris', 'leaf', 'leon', 'lucas', 'lyra', 'marnie', 'may', 'nate', 'nemona', 'palmer', 'red', 'rei', 'rosa', 'roy', 'selene', 'serena', 'steven', 'trace', 'victor', 'volo', 'wally'],
  caza_bichos: ['bugcatcher', 'bugmaniac', 'bug', 'bichos', 'cazabichos', 'aaron', 'katy', 'bugsy', 'burgh'],
  ornitologo: ['birdkeeper', 'ornitologo', 'pajaro', 'falkner', 'kahili', 'skyla', 'skytrainer', 'winona', 'pilot'],
  cientifico: ['scientist', 'supernerd', 'cientifico', 'nerd', 'doctor', 'blaine', 'briar', 'clemont', 'colress', 'elm', 'juniper', 'kukui', 'laventon', 'magnolia', 'miriam', 'molayne', 'nurse', 'oak', 'raifort', 'rowan', 'sada', 'salvatore', 'samsonoak', 'sonia', 'sophocles', 'sycamore', 'thorton', 'turo'],
  luchador: ['blackbelt', 'battlegirl', 'crushgirl', 'luchador', 'fight', 'crasherwake', 'bea', 'bruno', 'chuck', 'atticus', 'brawly', 'dendra', 'eri', 'greta', 'hala', 'korrina', 'marshal', 'mustard', 'securitycorps', 'theroyal', 'wikstrom', 'zisu'],
  pescador: ['fisherman', 'fisher', 'pescador', 'marlon', 'sailor', 'lana'],
  nadador: ['swimmer', 'nadador', 'diver', 'freediver', 'candice', 'juan', 'lorelei', 'misty', 'nessa', 'surfer', 'wallace'],
  domador: ['tamer', 'domador', 'roughneck', 'tamer-gen3', 'clair', 'drasna', 'drayden', 'drayton', 'hassel', 'lucy', 'ryuki', 'zinnia'],
  medium: ['psychic', 'medium', 'channeler', 'hexmaniac', 'sabrina', 'morty', 'ghost', 'furisodegirl', 'avery', 'bede', 'caitlin', 'liza', 'lucian', 'olympia', 'shauntal', 'tate', 'will'],
  motorista: ['biker', 'cueball', 'delinquent', 'punk', 'motorista', 'hooligan', 'cyclist', 'giacomo', 'mela', 'piers', 'roxie', 'ruffian', 'streetthug'],
  montanero: ['hiker', 'ruinmaniac', 'montanero', 'brock', 'roark', 'clay', 'bertha', 'gordie', 'grant', 'olivia', 'peonia', 'peony', 'roxanne', 'worker', 'rika'],
  rocket: ['rocket', 'grunt', 'giovanni', 'petrel', 'proton', 'ariana', 'archer', 'rainbowrocket', 'archie', 'cliff', 'courtney', 'cyrus', 'faba', 'ghetsis', 'guzma', 'jupiter', 'lusamine', 'lysandre', 'mable', 'malva', 'mars', 'matt', 'maxie', 'oleana', 'plumeria', 'rood', 'saturn', 'shadowtriad', 'shelly', 'sierra', 'tabitha', 'xerosic', 'zinzolin'],
  criador: ['breeder', 'criador', 'nursery', 'nurseryaide', 'caretaker', 'cheryl', 'cilan', 'milo', 'ramos', 'rancher'],
  aristocrata: ['gentleman', 'lady', 'madame', 'richboy', 'butler', 'darach', 'officeworker', 'ortega', 'rose', 'siebold'],
  ranger: ['ranger', 'pokemonranger'],
  pokefan: ['pokefan', 'pokekid'],
  policeman: ['policeman', 'police', 'policia'],
  artista: ['beauty', 'artist', 'dancer', 'model', 'elesa', 'lisia', 'mina', 'painter', 'perrin', 'risingstar', 'rollerskater', 'tierno', 'tucker', 'tuli', 'tulip', 'valerie', 'viola'],
  default: ['youngster', 'lass', 'camper', 'picnicker', 'schoolkid', 'entrenador', 'player', 'rival']
};

function isNpcArchetype(value: string): value is NpcArchetype {
  return Object.hasOwn(ARCHETYPE_KEYWORDS, value);
}

export function requireNpcArchetype(value: string): NpcArchetype {
  if (isNpcArchetype(value)) return value;
  throw new Error(`[npcSpriteRouter] Invalid NPC archetype: ${value}`);
}

/**
 * Classifies a trainer's sprite ID or name into an NpcArchetype.
 * Prioritizes keyword clues in the string first, then falls back to heuristics.
 */
export function classifyNpcArchetype(spriteIdOrName: string): NpcArchetype {
  if (!spriteIdOrName) return 'default';

  const normalized = spriteIdOrName.toLowerCase().replace(/[-_]/g, ''); // text-ok

  // 1. Prioridad Alta: Búsqueda exacta y coincidencia de palabras clave
  for (const [archetype, keywords] of Object.entries(ARCHETYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        if (keyword === 'bea' && normalized.includes('beauty')) continue;
        return archetype as NpcArchetype;
      }
    }
  }

  // 2. Heurísticas secundarias / personajes conocidos o específicos
  // (Por si no hay coincidencia directa de palabras clave en nombres especiales)
  if (['acerola', 'allister', 'fantina'].some(n => normalized.includes(n))) {
    return 'medium';
  }
  if (['adaman', 'irida', 'arezu', 'mai'].some(n => normalized.includes(n))) {
    return 'default';
  }
  if (['lance', 'drake', 'dragontamer'].some(n => normalized.includes(n))) {
    return 'domador';
  }
  if (['koga', 'janine', 'ninja'].some(n => normalized.includes(n))) {
    return 'luchador';
  }

  return 'default';
}

export function getSpritesForArchetype(archetype: NpcArchetype): readonly string[] {
  const sprites = ARCHETYPE_SPRITES[archetype];
  if (!sprites || sprites.length === 0) {
    throw new Error(`[npcSpriteRouter] No sprites found in catalog for archetype: ${archetype}`);
  }
  return sprites;
}

export function resolveNpcSprite(spriteId: NpcSpriteId): NpcSpriteId {
  if (VALID_NPC_SPRITES.includes(spriteId)) return spriteId;
  throw new Error(`[npcSpriteRouter] Invalid NPC sprite identifier: '${spriteId}'`);
}
