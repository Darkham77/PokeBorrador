import { SPECIES_METADATA, type SpeciesMetadataId } from './speciesMetadata.ts';
import type { PokemonMoveId } from '@/types/pokemon/pokemon';

export const PDEX_ORDER = [
  'bulbasaur','ivysaur','venusaur',
  'charmander','charmeleon','charizard',
  'squirtle','wartortle','blastoise',
  'caterpie','metapod','butterfree',
  'weedle','kakuna','beedrill',
  'pidgey','pidgeotto','pidgeot',
  'rattata','raticate',
  'spearow','fearow',
  'ekans','arbok',
  'pikachu', 'raichu',
  'sandshrew','sandslash',
  'nidoranf','nidorina','nidoqueen',
  'nidoranm','nidorino','nidoking',
  'clefairy','clefable',
  'vulpix','ninetales',
  'jigglypuff','wigglytuff',
  'zubat','golbat',
  'oddish','gloom','vileplume',
  'paras','parasect',
  'venonat','venomoth',
  'diglett','dugtrio',
  'meowth','persian',
  'psyduck','golduck',
  'mankey','primeape',
  'growlithe','arcanine',
  'poliwag','poliwhirl','poliwrath',
  'abra','kadabra','alakazam',
  'machop','machoke','machamp',
  'bellsprout','weepinbell','victreebel',
  'tentacool','tentacruel',
  'geodude','graveler','golem',
  'ponyta','rapidash',
  'slowpoke','slowbro',
  'magnemite','magneton',
  'farfetchd',
  'doduo','dodrio',
  'seel','dewgong',
  'grimer','muk',
  'shellder','cloyster',
  'gastly','haunter','gengar',
  'onix',
  'drowzee','hypno',
  'krabby','kingler',
  'voltorb','electrode',
  'exeggcute','exeggutor',
  'cubone','marowak',
  'hitmonlee','hitmonchan',
  'lickitung',
  'koffing','weezing',
  'rhyhorn','rhydon',
  'chansey',
  'tangela',
  'kangaskhan',
  'horsea','seadra',
  'goldeen','seaking',
  'staryu','starmie',
  'mrmime',
  'scyther',
  'jynx',
  'electabuzz',
  'magmar',
  'pinsir',
  'tauros',
  'magikarp', 'gyarados',
  'lapras',
  'ditto',
  'eevee', 'vaporeon', 'jolteon', 'flareon',
  'porygon',
  'omanyte', 'omastar',
  'kabuto', 'kabutops',
  'aerodactyl',
  'snorlax',
  'articuno','zapdos','moltres',
  'dratini','dragonair','dragonite',
  'mewtwo','mew'
] as const;
export type Gen1PokemonSpeciesId = (typeof PDEX_ORDER)[number];

export const GEN2_PDEX_ORDER = [
  'chikorita', 'bayleef', 'meganium', 'cyndaquil', 'quilava', 'typhlosion', 'totodile', 'croconaw', 'feraligatr',
  'sentret', 'furret', 'hoothoot', 'noctowl', 'ledyba', 'ledian', 'spinarak', 'ariados', 'crobat',
  'chinchou', 'lanturn', 'pichu', 'cleffa', 'igglybuff', 'togepi', 'togetic', 'natu', 'xatu',
  'mareep', 'flaaffy', 'ampharos', 'bellossom', 'marill', 'azumarill', 'sudowoodo', 'politoed',
  'hoppip', 'skiploom', 'jumpluff', 'aipom', 'sunkern', 'sunflora', 'yanma', 'wooper', 'quagsire',
  'espeon', 'umbreon', 'murkrow', 'slowking', 'misdreavus', 'unown', 'wobbuffet', 'girafarig', 
  'pineco', 'forretress', 'dunsparce', 'gligar', 'steelix', 'snubbull', 'granbull', 'qwilfish',
  'scizor', 'shuckle', 'heracross', 'sneasel', 'teddiursa', 'ursaring', 'slugma', 'magcargo',
  'swinub', 'piloswine', 'corsola', 'remoraid', 'octillery', 'delibird', 'mantine', 'skarmory',
  'houndour', 'houndoom', 'kingdra', 'phanpy', 'donphan', 'porygon2', 'stantler', 'smeargle',
  'tyrogue', 'hitmontop', 'smoochum', 'elekid', 'magby', 'miltank', 'blissey', 'raikou', 'entei',
  'suicune', 'larvitar', 'pupitar', 'tyranitar', 'lugia', 'hooh', 'celebi'
] as const;
export type Gen2PokemonSpeciesId = (typeof GEN2_PDEX_ORDER)[number];
export type PokedexOrderSpeciesId = Gen1PokemonSpeciesId | Gen2PokemonSpeciesId;

import { PDEX_TYPE_COLORS } from '../../logic/constants/pokedexConstants.ts'
export { PDEX_TYPE_COLORS }

export const POKEMON_AESTHETICS = {
  // Floating species (visually not on the ground, regardless of type)
  bulbasaur: { floating: false },
  ivysaur: { floating: false },
  venusaur: { floating: false },
  charmander: { floating: false },
  charmeleon: { floating: false },
  charizard: { floating: false },
  butterfree: { floating: true },
  beedrill: { floating: true },
  pidgey: { floating: false },
  pidgeotto: { floating: true },
  pidgeot: { floating: false },
  spearow: { floating: false },
  fearow: { floating: true },
  zubat: { floating: true },
  golbat: { floating: true },
  geodude: { floating: false },
  magnemite: { floating: true },
  magneton: { floating: true },
  gastly: { floating: true },
  haunter: { floating: true },
  gengar: { floating: false },
  koffing: { floating: true },
  weezing: { floating: true },
  mew: { floating: true },
  mewtwo: { floating: false },
  celebi: { floating: true },
  misdreavus: { floating: true },
  unown: { floating: true },
  staryu: { floating: true },
  starmie: { floating: true },
  porygon: { floating: false },
  porygon2: { floating: false },
  lugia: { floating: true },
  'hooh': { floating: true },
  articuno: { floating: true },
  zapdos: { floating: true },
  moltres: { floating: true },
  dragonite: { floating: false },
  gyarados: { floating: true },
  scyther: { floating: false },
  aerodactyl: { floating: true },
  venomoth: { floating: true },
  crobat: { floating: true },
  togetic: { floating: true },
  yanma: { floating: true },
  gligar: { floating: true },
  mantine: { floating: true },
  hoppip: { floating: false },
  farfetchd: { floating: false },
  doduo: { floating: false },
  dodrio: { floating: false }
};




export { POKEMON_SPRITE_IDS } from './spriteMapping.ts';


export const GAME_TMS = [
  { id: 'TM01', name: 'Puño Certero', type: 'fighting', moveId: 'focuspunch' },
  { id: 'TM02', name: 'Garra Dragón', type: 'dragon', moveId: 'dragonclaw' },
  { id: 'TM03', name: 'Hidropulso', type: 'water', moveId: 'waterpulse' },
  { id: 'TM04', name: 'Paz Mental', type: 'psychic', moveId: 'calmmind' },
  { id: 'TM05', name: 'Rugido', type: 'normal', moveId: 'roar' },
  { id: 'TM06', name: 'Tóxico', type: 'poison', moveId: 'toxic' },
  { id: 'TM07', name: 'Granizo', type: 'ice', moveId: 'hail' },
  { id: 'TM08', name: 'Corpulencia', type: 'fighting', moveId: 'bulkup' },
  { id: 'TM09', name: 'Recurrente', type: 'grass', moveId: 'bulletseed' },
  { id: 'TM10', name: 'Poder Oculto', type: 'normal', moveId: 'hiddenpower' },
  { id: 'TM11', name: 'Día Soleado', type: 'fire', moveId: 'sunnyday' },
  { id: 'TM12', name: 'Mofa', type: 'dark', moveId: 'taunt' },
  { id: 'TM13', name: 'Rayo Hielo', type: 'ice', moveId: 'icebeam' },
  { id: 'TM14', name: 'Ventisca', type: 'ice', moveId: 'blizzard' },
  { id: 'TM15', name: 'Hiperrayo', type: 'normal', moveId: 'hyperbeam' },
  { id: 'TM16', name: 'Pantalla de Luz', type: 'psychic', moveId: 'lightscreen' },
  { id: 'TM17', name: 'Protección', type: 'normal', moveId: 'protect' },
  { id: 'TM18', name: 'Danza Lluvia', type: 'water', moveId: 'raindance' },
  { id: 'TM19', name: 'Gigadrenado', type: 'grass', moveId: 'gigadrain' },
  { id: 'TM20', name: 'Velo Sagrado', type: 'normal', moveId: 'safeguard' },
  { id: 'TM21', name: 'Frustración', type: 'normal', moveId: 'frustration' },
  { id: 'TM22', name: 'Rayo Solar', type: 'grass', moveId: 'solarbeam' },
  { id: 'TM23', name: 'Cola Férrea', type: 'steel', moveId: 'irontail' },
  { id: 'TM24', name: 'Rayo', type: 'electric', moveId: 'thunderbolt' },
  { id: 'TM25', name: 'Trueno', type: 'electric', moveId: 'thunder' },
  { id: 'TM26', name: 'Terremoto', type: 'ground', moveId: 'earthquake' },
  { id: 'TM27', name: 'Retribución', type: 'normal', moveId: 'return' },
  { id: 'TM28', name: 'Excavar', type: 'ground', moveId: 'dig' },
  { id: 'TM29', name: 'Psíquico', type: 'psychic', moveId: 'psychic' },
  { id: 'TM30', name: 'Bola Sombra', type: 'ghost', moveId: 'shadowball' },
  { id: 'TM31', name: 'Demolición', type: 'fighting', moveId: 'brickbreak' },
  { id: 'TM32', name: 'Doble Equipo', type: 'normal', moveId: 'doubleteam' },
  { id: 'TM33', name: 'Reflejo', type: 'psychic', moveId: 'reflect' },
  { id: 'TM34', name: 'Onda Voltio', type: 'electric', moveId: 'shockwave' },
  { id: 'TM35', name: 'Lanzallamas', type: 'fire', moveId: 'flamethrower' },
  { id: 'TM36', name: 'Bomba Lodo', type: 'poison', moveId: 'sludgebomb' },
  { id: 'TM37', name: 'Tormenta de Arena', type: 'rock', moveId: 'sandstorm' },
  { id: 'TM38', name: 'Llamarada', type: 'fire', moveId: 'fireblast' },
  { id: 'TM39', name: 'Tumba Rocas', type: 'rock', moveId: 'rocktomb' },
  { id: 'TM40', name: 'Golpe Aéreo', type: 'flying', moveId: 'aerialace' },
  { id: 'TM41', name: 'Tormento', type: 'dark', moveId: 'torment' },
  { id: 'TM42', name: 'Imagen', type: 'normal', moveId: 'facade' },
  { id: 'TM43', name: 'Daño Secreto', type: 'normal', moveId: 'secretpower' },
  { id: 'TM44', name: 'Descanso', type: 'psychic', moveId: 'rest' },
  { id: 'TM45', name: 'Atracción', type: 'normal', moveId: 'attract' },
  { id: 'TM46', name: 'Ladrón', type: 'dark', moveId: 'thief' },
  { id: 'TM47', name: 'Ala de Acero', type: 'steel', moveId: 'steelwing' },
  { id: 'TM48', name: 'Intercambio', type: 'psychic', moveId: 'skillswap' },
  { id: 'TM49', name: 'Robo', type: 'dark', moveId: 'snatch' },
  { id: 'TM50', name: 'Sofoco', type: 'fire', moveId: 'overheat' },
] as const satisfies readonly { id: string; name: string; type: string; moveId: PokemonMoveId }[];

export const TM_COMPAT = {
  bulbasaur: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  ivysaur: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  venusaur: ['TM05','TM06','TM09','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM26','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  charmander: ['TM01','TM06','TM10','TM11','TM17','TM21','TM23','TM27','TM28','TM31','TM32','TM35','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM50'],
  charmeleon: ['TM01','TM06','TM10','TM11','TM17','TM21','TM23','TM27','TM28','TM31','TM32','TM35','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM50'],
  charizard: ['TM01','TM02','TM05','TM06','TM10','TM11','TM15','TM17','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM35','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM47','TM50'],
  squirtle: ['TM01','TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM23','TM27','TM28','TM31','TM32','TM39','TM42','TM43','TM44','TM45'],
  wartortle: ['TM01','TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM23','TM27','TM28','TM31','TM32','TM39','TM42','TM43','TM44','TM45'],
  blastoise: ['TM01','TM03','TM05','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM39','TM42','TM43','TM44','TM45'],
  caterpie: [], metapod: [],
  butterfree: ['TM06','TM10','TM11','TM15','TM17','TM18','TM19','TM20','TM21','TM22','TM27','TM29','TM30','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM48'],
  weedle: [], kakuna: [],
  beedrill: ['TM06','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM27','TM31','TM32','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  pidgey: ['TM06','TM10','TM11','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  pidgeotto: ['TM06','TM10','TM11','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  pidgeot: ['TM06','TM10','TM11','Rel','TM15','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  rattata: ['TM06','TM10','TM11','TM12','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM30','TM32','TM34','TM42','TM43','TM44','TM45','TM46'],
  raticate: ['TM05','TM06','TM10','TM11','TM12','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM30','TM32','TM34','TM42','TM43','TM44','TM45','TM46'],
  spearow: ['TM06','TM10','TM11','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  fearow: ['TM06','TM10','TM11','TM15','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  ekans: ['TM06','TM10','TM11','TM17','TM18','TM19','TM21','TM23','TM26','TM27','TM28','TM32','TM36','TM41','TM42','TM43','TM44','TM45','TM46','TM49'],
  arbok: ['TM06','TM10','TM11','TM15','TM17','TM18','TM19','TM21','TM23','TM26','TM27','TM28','TM32','TM36','TM41','TM42','TM43','TM44','TM45','TM46','TM49'],
  pikachu: ['TM01','TM06','TM10','TM16','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM31','TM32','TM34','TM42','TM43','TM44','TM45'],
  raichu: ['TM01','TM06','TM10','TM15','TM16','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM31','TM32','TM34','TM42','TM43','TM44','TM45'],
  sandshrew: ['TM01','TM06','TM10','TM11','TM17','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM37','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  sandslash: ['TM01','TM06','TM10','TM11','TM15','TM17','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM37','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  nidoranf: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  nidorina: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  nidoqueen: ['TM01','TM03','TM05','TM06','TM10','TM11','TM12','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM30','TM31','TM32','TM34','TM35','TM36','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM45','TM46'],
  nidoranm: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM42','TM43','TM44','TM45','TM46'],
  nidorino: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM42','TM43','TM44','TM45','TM46'],
  nidoking: ['TM01','TM03','TM05','TM06','TM10','TM11','TM12','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM30','TM31','TM32','TM34','TM35','TM36','TM37','TM38','TM39','TM41','TM42','TM43','TM44','TM45','TM46'],
  clefairy: ['TM01','TM03','TM04','TM06','TM10','TM11','TM13','TM14','TM16','TM17','TM18','TM20','TM21','TM22','TM23','TM24','TM25','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM38','TM42','TM43','TM44','TM45','TM49'],
  clefable: ['TM01','TM03','TM04','TM06','TM10','TM11','TM13','TM14','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM23','TM24','TM25','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM38','TM42','TM43','TM44','TM45','TM49'],
  vulpix: ['TM05','TM06','TM10','TM11','TM17','TM20','TM21','TM23','TM27','TM28','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM50'],
  ninetales: ['TM05','TM06','TM10','TM11','TM15','TM17','TM20','TM21','TM23','TM27','TM28','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM50'],
  jigglypuff: ['TM01','TM03','TM06','TM10','TM11','TM13','TM14','TM16','TM17','TM18','TM20','TM21','TM22','TM24','TM25','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM38','TM42','TM43','TM44','TM45','TM49'],
  wigglytuff: ['TM01','TM03','TM06','TM10','TM11','TM13','TM14','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM24','TM25','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM38','TM42','TM43','TM44','TM45','TM49'],
  zubat: ['TM06','TM10','TM11','TM12','TM17','TM18','TM19','TM21','TM27','TM30','TM32','TM36','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47','TM49'],
  golbat: ['TM06','TM10','TM11','TM12','TM15','TM17','TM18','TM19','TM21','TM27','TM30','TM32','TM36','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47','TM49'],
  oddish: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  gloom: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  vileplume: ['TM06','TM09','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  paras: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM28','TM32','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  parasect: ['TM06','TM09','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM27','TM28','TM32','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  venonat: ['TM06','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM29','TM32','TM36','TM42','TM43','TM44','TM45','TM46','TM48'],
  venomoth: ['TM06','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM27','TM29','TM32','TM36','TM40','TM42','TM43','TM44','TM45','TM46','TM48'],
  diglett: ['TM06','TM10','TM11','TM17','TM21','TM26','TM27','TM28','TM32','TM36','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  dugtrio: ['TM06','TM10','TM11','TM15','TM17','TM21','TM26','TM27','TM28','TM32','TM36','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  meowth: ['TM03','TM06','TM10','TM11','TM12','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM30','TM32','TM34','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM49'],
  persian: ['TM03','TM05','TM06','TM10','TM11','TM12','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM30','TM32','TM34','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM49'],
  psyduck: ['TM01','TM03','TM04','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM23','TM27','TM28','TM31','TM32','TM40','TM42','TM43','TM44','TM45'],
  golduck: ['TM01','TM03','TM04','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM27','TM28','TM31','TM32','TM40','TM42','TM43','TM44','TM45'],
  mankey: ['TM01','TM06','TM08','TM10','TM11','TM12','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM31','TM32','TM39','TM40','TM42','TM43','TM44','TM45','TM46','TM50'],
  primeape: ['TM01','TM06','TM08','TM10','TM11','TM12','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM31','TM32','TM39','TM40','TM42','TM43','TM44','TM45','TM46','TM50'],
  growlithe: ['TM05','TM06','TM10','TM11','TM17','TM21','TM23','TM27','TM28','TM32','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM46','TM50'],
  arcanine: ['TM05','TM06','TM10','TM11','TM15','TM17','TM21','TM23','TM27','TM28','TM32','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM46','TM50'],
  poliwag: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM27','TM28','TM29','TM32','TM42','TM43','TM44','TM45','TM46'],
  poliwhirl: ['TM01','TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM26','TM27','TM28','TM29','TM31','TM32','TM42','TM43','TM44','TM45','TM46'],
  poliwrath: ['TM01','TM03','TM06','TM07','TM08','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM26','TM27','TM28','TM29','TM31','TM32','TM39','TM42','TM43','TM44','TM45','TM46'],
  abra: ['TM01','TM04','TM06','TM10','TM11','TM12','TM16','TM17','TM18','TM20','TM21','TM23','TM27','TM29','TM30','TM32','TM33','TM34','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  kadabra: ['TM01','TM04','TM06','TM10','TM11','TM12','TM16','TM17','TM18','TM20','TM21','TM23','TM27','TM29','TM30','TM32','TM33','TM34','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  alakazam: ['TM01','TM04','TM06','TM10','TM11','TM12','TM15','TM16','TM17','TM18','TM20','TM21','TM23','TM27','TM29','TM30','TM32','TM33','TM34','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  machop: ['TM01','TM06','TM08','TM10','TM11','TM17','TM18','TM21','TM26','TM27','TM28','TM31','TM32','TM35','TM38','TM39','TM42','TM43','TM44','TM45','TM46'],
  machoke: ['TM01','TM06','TM08','TM10','TM11','TM17','TM18','TM21','TM26','TM27','TM28','TM31','TM32','TM35','TM38','TM39','TM42','TM43','TM44','TM45','TM46'],
  machamp: ['TM01','TM06','TM08','TM10','TM11','TM15','TM17','TM18','TM21','TM26','TM27','TM28','TM31','TM32','TM35','TM38','TM39','TM42','TM43','TM44','TM45','TM46'],
  bellsprout: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45','TM46'],
  weepinbell: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45','TM46'],
  victreebel: ['TM06','TM09','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45','TM46'],
  tentacool: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM19','TM21','TM27','TM32','TM36','TM42','TM43','TM44','TM45','TM46'],
  tentacruel: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM19','TM21','TM27','TM32','TM36','TM42','TM43','TM44','TM45','TM46'],
  geodude: ['TM01','TM06','TM10','TM11','TM17','TM21','TM26','TM27','TM28','TM31','TM32','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45'],
  graveler: ['TM01','TM06','TM10','TM11','TM17','TM21','TM26','TM27','TM28','TM31','TM32','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45'],
  golem: ['TM01','TM05','TM06','TM10','TM11','TM15','TM17','TM21','TM26','TM27','TM28','TM31','TM32','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45'],
  ponyta: ['TM06','TM10','TM11','TM17','TM21','TM22','TM23','TM27','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM50'],
  rapidash: ['TM06','TM10','TM11','TM15','TM17','TM21','TM22','TM23','TM27','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM50'],
  slowpoke: ['TM03','TM04','TM06','TM07','TM10','TM11','TM13','TM14','TM17','TM18','TM20','TM21','TM23','TM26','TM27','TM28','TM29','TM30','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM48'],
  slowbro: ['TM01','TM03','TM04','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM23','TM26','TM27','TM28','TM29','TM30','TM31','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM48'],
  magnemite: ['TM06','TM10','TM11','TM17','TM18','TM21','TM24','TM25','TM27','TM32','TM33','TM34','TM42','TM43','TM44'],
  magneton: ['TM06','TM10','TM11','TM15','TM17','TM18','TM21','TM24','TM25','TM27','TM32','TM33','TM34','TM42','TM43','TM44'],
  farfetchd: ['TM06','TM10','TM11','TM17','TM21','TM23','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  doduo: ['TM06','TM10','TM11','TM17','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  dodrio: ['TM06','TM10','TM11','TM12','TM15','TM17','TM21','TM27','TM32','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47'],
  seel: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM20','TM21','TM27','TM32','TM42','TM43','TM44','TM45','TM46'],
  dewgong: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM27','TM32','TM42','TM43','TM44','TM45','TM46'],
  grimer: ['TM06','TM10','TM11','TM12','TM17','TM18','TM19','TM21','TM24','TM25','TM27','TM28','TM32','TM34','TM35','TM36','TM38','TM39','TM41','TM42','TM43','TM44','TM45','TM46'],
  muk: ['TM01','TM06','TM10','TM11','TM12','TM15','TM17','TM18','TM19','TM21','TM24','TM25','TM27','TM28','TM31','TM32','TM34','TM35','TM36','TM38','TM39','TM41','TM42','TM43','TM44','TM45','TM46'],
  shellder: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM27','TM32','TM42','TM43','TM44','TM45'],
  cloyster: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM27','TM32','TM41','TM42','TM43','TM44','TM45'],
  gastly: ['TM06','TM10','TM11','TM12','TM17','TM18','TM19','TM21','TM24','TM27','TM29','TM30','TM32','TM36','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  haunter: ['TM06','TM10','TM11','TM12','TM17','TM18','TM19','TM21','TM24','TM27','TM29','TM30','TM32','TM36','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  gengar: ['TM01','TM06','TM10','TM11','TM12','TM15','TM17','TM18','TM19','TM21','TM24','TM25','TM27','TM29','TM30','TM31','TM32','TM36','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  onix: ['TM05','TM06','TM10','TM11','TM12','TM17','TM21','TM23','TM26','TM27','TM28','TM32','TM37','TM39','TM41','TM42','TM43','TM44','TM45'],
  drowzee: ['TM01','TM04','TM06','TM10','TM11','TM12','TM16','TM17','TM18','TM20','TM21','TM27','TM29','TM30','TM31','TM32','TM33','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  hypno: ['TM01','TM04','TM06','TM10','TM11','TM12','TM15','TM16','TM17','TM18','TM20','TM21','TM27','TM29','TM30','TM31','TM32','TM33','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  krabby: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM27','TM28','TM32','TM39','TM42','TM43','TM44','TM45','TM46'],
  kingler: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM27','TM28','TM32','TM39','TM42','TM43','TM44','TM45','TM46'],
  voltorb: ['TM06','TM10','TM12','TM16','TM17','TM18','TM21','TM24','TM25','TM27','TM32','TM34','TM41','TM42','TM43','TM44','TM46'],
  electrode: ['TM06','TM10','TM12','TM15','TM16','TM17','TM18','TM21','TM24','TM25','TM27','TM32','TM34','TM41','TM42','TM43','TM44','TM46'],
  exeggcute: ['TM06','TM09','TM10','TM11','TM16','TM17','TM19','TM21','TM22','TM27','TM29','TM32','TM33','TM36','TM42','TM43','TM44','TM45','TM46','TM48'],
  exeggutor: ['TM06','TM09','TM10','TM11','TM15','TM16','TM17','TM19','TM21','TM22','TM27','TM29','TM32','TM33','TM36','TM42','TM43','TM44','TM45','TM46','TM48'],
  cubone: ['TM01','TM06','TM10','TM11','TM13','TM14','TM17','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM35','TM37','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  marowak: ['TM01','TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM35','TM37','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  hitmonlee: ['TM01','TM06','TM08','TM10','TM11','TM17','TM18','TM21','TM26','TM27','TM31','TM32','TM39','TM42','TM43','TM44','TM45','TM46'],
  hitmonchan: ['TM01','TM06','TM08','TM10','TM11','TM17','TM18','TM21','TM26','TM27','TM31','TM32','TM39','TM42','TM43','TM44','TM45','TM46'],
  lickitung: ['TM01','TM03','TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM28','TM30','TM31','TM32','TM34','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45','TM46'],
  koffing: ['TM06','TM10','TM11','TM12','TM17','TM18','TM21','TM24','TM25','TM27','TM30','TM32','TM34','TM35','TM36','TM38','TM41','TM42','TM43','TM44','TM45','TM46'],
  weezing: ['TM06','TM10','TM11','TM12','TM15','TM17','TM18','TM21','TM24','TM25','TM27','TM30','TM32','TM34','TM35','TM36','TM38','TM41','TM42','TM43','TM44','TM45','TM46'],
  rhyhorn: ['TM05','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM32','TM34','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45','TM46'],
  rhydon: ['TM01','TM05','TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM31','TM32','TM34','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45','TM46'],
  chansey: ['TM01','TM03','TM04','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM29','TM30','TM31','TM32','TM34','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45','TM48','TM49'],
  tangela: ['TM06','TM09','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45','TM46'],
  kangaskhan: ['TM01','TM03','TM05','TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM28','TM30','TM31','TM32','TM34','TM35','TM37','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  horsea: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM27','TM32','TM42','TM43','TM44','TM45'],
  seadra: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM27','TM32','TM42','TM43','TM44','TM45'],
  goldeen: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM27','TM32','TM42','TM43','TM44','TM45'],
  seaking: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM27','TM32','TM42','TM43','TM44','TM45'],
  staryu: ['TM03','TM06','TM07','TM10','TM13','TM14','TM16','TM17','TM18','TM21','TM24','TM25','TM27','TM29','TM32','TM33','TM42','TM43','TM44'],
  starmie: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM16','TM17','TM18','TM21','TM24','TM25','TM27','TM29','TM32','TM33','TM42','TM43','TM44','TM48'],
  mrmime: ['TM01','TM04','TM06','TM10','TM11','TM12','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM24','TM25','TM27','TM29','TM30','TM31','TM32','TM33','TM34','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
  scyther: ['TM06','TM10','TM11','TM15','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
  jynx: ['TM01','TM03','TM04','TM06','TM07','TM10','TM12','TM13','TM14','TM15','TM16','TM17','TM18','TM21','TM27','TM29','TM30','TM31','TM32','TM33','TM41','TM42','TM43','TM44','TM45','TM46','TM48'],
  electabuzz: ['TM01','TM06','TM10','TM15','TM16','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM29','TM31','TM32','TM34','TM42','TM43','TM44','TM45','TM46'],
  magmar: ['TM01','TM06','TM10','TM11','TM15','TM17','TM21','TM23','TM27','TM29','TM31','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM46'],
  pinsir: ['TM01','TM06','TM08','TM10','TM11','TM15','TM17','TM18','TM21','TM26','TM27','TM28','TM31','TM32','TM39','TM42','TM43','TM44','TM45','TM46'],
  tauros: ['TM03','TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM32','TM34','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45'],
  magikarp: [], ditto: [],
  gyarados: ['TM03','TM05','TM06','TM07','TM10','TM12','TM13','TM14','TM15','TM17','TM18','TM21','TM24','TM25','TM26','TM27','TM32','TM35','TM37','TM38','TM41','TM42','TM43','TM44','TM45'],
  lapras: ['TM03','TM05','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM23','TM24','TM25','TM27','TM29','TM32','TM34','TM42','TM43','TM44','TM45'],
  eevee: ['TM06','TM10','TM11','TM17','TM18','TM21','TM23','TM27','TM28','TM30','TM32','TM42','TM43','TM44','TM45'],
  vaporeon: ['TM03','TM05','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM27','TM28','TM32','TM42','TM43','TM44','TM45'],
  jolteon: ['TM05','TM06','TM10','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM42','TM43','TM44','TM45'],
  flareon: ['TM05','TM06','TM10','TM11','TM15','TM17','TM18','TM21','TM23','TM27','TM28','TM30','TM32','TM35','TM38','TM42','TM43','TM44','TM45','TM50'],
  porygon: ['TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM22','TM23','TM24','TM25','TM27','TM29','TM30','TM32','TM34','TM40','TM42','TM43','TM44','TM46'],
  omanyte: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM27','TM32','TM37','TM39','TM42','TM43','TM44','TM45','TM46'],
  omastar: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM27','TM32','TM37','TM39','TM42','TM43','TM44','TM45','TM46'],
  kabuto: ['TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM19','TM21','TM27','TM28','TM32','TM37','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  kabutops: ['TM03','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM19','TM21','TM27','TM28','TM31','TM32','TM37','TM39','TM40','TM42','TM43','TM44','TM45','TM46'],
  aerodactyl: ['TM02','TM05','TM06','TM10','TM11','TM12','TM15','TM17','TM18','TM21','TM23','TM26','TM27','TM32','TM35','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47'],
  snorlax: ['TM01','TM03','TM06','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM22','TM24','TM25','TM26','TM27','TM29','TM30','TM31','TM32','TM34','TM35','TM37','TM38','TM39','TM42','TM43','TM44','TM45'],
  articuno: ['TM03','TM05','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM27','TM32','TM33','TM37','TM40','TM42','TM43','TM44','TM47'],
  zapdos: ['TM05','TM06','TM10','TM11','TM15','TM16','TM17','TM18','TM21','TM24','TM25','TM27','TM32','TM34','TM37','TM40','TM42','TM43','TM44','TM47'],
  moltres: ['TM05','TM06','TM10','TM11','TM15','TM17','TM18','TM20','TM21','TM27','TM32','TM35','TM37','TM38','TM40','TM42','TM43','TM44','TM47','TM50'],
  dratini: ['TM03','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM23','TM24','TM25','TM27','TM32','TM34','TM35','TM38','TM42','TM43','TM44','TM45'],
  dragonair: ['TM03','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM23','TM24','TM25','TM27','TM32','TM34','TM35','TM38','TM42','TM43','TM44','TM45'],
  dragonite: ['TM01','TM02','TM03','TM05','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM23','TM24','TM25','TM26','TM27','TM31','TM32','TM34','TM35','TM37','TM38','TM39','TM40','TM42','TM43','TM44','TM45','TM47'],
  mewtwo: ['TM01','TM03','TM04','TM06','TM07','TM10','TM11','TM12','TM13','TM14','TM15','TM16','TM17','TM18','TM19','TM20','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM48','TM49','TM50'],
  mew: ['TM01','TM02','TM03','TM04','TM05','TM06','TM07','TM08','TM09','TM10','TM11','TM12','TM13','TM14','TM15','TM16','TM17','TM18','TM19','TM20','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM36','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47','TM48','TM49','TM50']
};

export const BABY_POKEMON = [
  "azurill", "bonsly", "budew", "chingling", "cleffa", "elekid", "happiny", "igglybuff", "magby", "mantyke", 
  "mimejr", "munchlax", "pichu", "poipole", "riolu", "smoochum", "togepi", "toxel", "tyrogue", "wynaut"
] as const;
export type BabyPokemonSpeciesId = (typeof BABY_POKEMON)[number];

export const LEGENDARY_POKEMON = [
  "arceus", "arceusbug", "arceusdark", "arceusdragon", "arceuselectric", "arceusfairy", "arceusfighting", 
  "arceusfire", "arceusflying", "arceusghost", "arceusgrass", "arceusground", "arceusice", "arceuspoison", 
  "arceuspsychic", "arceusrock", "arceussteel", "arceuswater", "articuno", "articunogalar", "azelf", "calyrex", 
  "calyrexice", "calyrexshadow", "celebi", "chienpao", "chiyu", "cobalion", "cosmoem", "cosmog", "cresselia", 
  "darkrai", "darkraimega", "deoxys", "deoxysattack", "deoxysdefense", "deoxysspeed", "dialga", "dialgaorigin", 
  "diancie", "dianciemega", "enamorus", "enamorustherian", "entei", "eternatus", "eternatuseternamax", "fezandipiti", 
  "genesect", "genesectburn", "genesectchill", "genesectdouse", "genesectshock", "giratina", "giratinaorigin", 
  "glastrier", "groudon", "groudonprimal", "heatran", "heatranmega", "hooh", "hoopa", "hoopaunbound", "jirachi", 
  "keldeo", "keldeoresolute", "koraidon", "kubfu", "kyogre", "kyogreprimal", "kyurem", "kyuremblack", "kyuremwhite", 
  "landorus", "landorustherian", "latias", "latiasmega", "latios", "latiosmega", "lugia", "lunala", "magearna", 
  "magearnamega", "magearnaoriginal", "magearnaoriginalmega", "manaphy", "marshadow", "melmetal", "melmetalgmax", 
  "meloetta", "meloettapirouette", "meltan", "mesprit", "mew", "mewtwo", "mewtwomegax", "mewtwomegay", "miraidon", 
  "moltres", "moltresgalar", "munkidori", "necrozma", "necrozmadawnwings", "necrozmaduskmane", "necrozmaultra", 
  "ogerpon", "ogerponcornerstone", "ogerponcornerstonetera", "ogerponhearthflame", "ogerponhearthflametera", 
  "ogerpontealtera", "ogerponwellspring", "ogerponwellspringtera", "okidogi", "palkia", "palkiaorigin", "pecharunt", 
  "phione", "raikou", "rayquaza", "rayquazamega", "regice", "regidrago", "regieleki", "regigigas", "regirock", 
  "registeel", "reshiram", "shaymin", "shayminsky", "silvally", "silvallybug", "silvallydark", "silvallydragon", 
  "silvallyelectric", "silvallyfairy", "silvallyfighting", "silvallyfire", "silvallyflying", "silvallyghost", 
  "silvallygrass", "silvallyground", "silvallyice", "silvallypoison", "silvallypsychic", "silvallyrock", 
  "silvallysteel", "silvallywater", "solgaleo", "spectrier", "suicune", "tapubulu", "tapufini", "tapukoko", 
  "tapulele", "terapagos", "terapagosstellar", "terapagosterastal", "terrakion", "thundurus", "thundurustherian", 
  "tinglu", "tornadus", "tornadustherian", "typenull", "urshifu", "urshifugmax", "urshifurapidstrike", 
  "urshifurapidstrikegmax", "uxie", "victini", "virizion", "volcanion", "wochien", "xerneas", "xerneasneutral", 
  "yveltal", "zacian", "zaciancrowned", "zamazenta", "zamazentacrowned", "zapdos", "zapdosgalar", "zarude", 
  "zarudedada", "zekrom", "zeraora", "zeraoramega", "zygarde", "zygarde10", "zygardecomplete", "zygardemega"
] as const;
export type LegendaryPokemonSpeciesId = (typeof LEGENDARY_POKEMON)[number];

const FOSSIL_POKEMON = [
  "omanyte", "omastar", "kabuto", "kabutops", "aerodactyl", "lileep", "cradily", "anorith", "armaldo", 
  "cranidos", "rampardos", "shieldon", "bastiodon", "tirtouga", "carracosta", "archen", "archeops", 
  "tyrunt", "tyrantrum", "amaura", "aurorus", "dracozolt", "arctozolt", "dracovish", "arctovish"
] as const;
export type FossilPokemonSpeciesId = (typeof FOSSIL_POKEMON)[number];

export type PokemonSpeciesId = SpeciesMetadataId;
export type TmId = (typeof GAME_TMS)[number]['id'];
export type TmCompatibleSpeciesId = keyof typeof TM_COMPAT;

function isTmId(value: string): value is TmId {
  return GAME_TMS.some(tm => tm.id === value);
}

function requireTmId(value: string): TmId {
  if (isTmId(value)) return value;
  throw new Error(`Invalid TM id: ${value}`);
}

export function isPokemonSpeciesId(value: string): value is PokemonSpeciesId {
  return value in SPECIES_METADATA;
}

export function requirePokemonSpeciesId(value: string): PokemonSpeciesId {
  if (isPokemonSpeciesId(value)) return value;
  throw new Error(`Invalid Pokemon species id: ${value}`);
}

function isTmCompatibleSpeciesId(value: PokemonSpeciesId): value is TmCompatibleSpeciesId {
  return value in TM_COMPAT;
}

export function getCompatibleTmIds(speciesId: PokemonSpeciesId): readonly TmId[] {
  if (!isTmCompatibleSpeciesId(speciesId)) return [];
  return TM_COMPAT[speciesId].map(requireTmId);
}

function isPokedexOrderSpeciesId(value: string): value is PokedexOrderSpeciesId {
  return PDEX_ORDER.some(id => id === value) || GEN2_PDEX_ORDER.some(id => id === value);
}

export function getPokedexOrderIndex(value: string): number {
  if (!isPokedexOrderSpeciesId(value)) return -1;

  for (let index = 0; index < PDEX_ORDER.length; index += 1) {
    if (PDEX_ORDER[index] === value) return index;
  }

  for (let index = 0; index < GEN2_PDEX_ORDER.length; index += 1) {
    if (GEN2_PDEX_ORDER[index] === value) return PDEX_ORDER.length + index;
  }

  return -1;
}

export function isLegendaryPokemonSpeciesId(value: string): value is LegendaryPokemonSpeciesId {
  return LEGENDARY_POKEMON.some(id => id === value);
}

export function isBabyPokemonSpeciesId(value: string): value is BabyPokemonSpeciesId {
  return BABY_POKEMON.some(id => id === value);
}

export function isFossilPokemonSpeciesId(value: string): value is FossilPokemonSpeciesId {
  return FOSSIL_POKEMON.some(id => id === value);
}

export type TMData = (typeof GAME_TMS)[number];
