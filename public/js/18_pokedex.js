// Pokedex System for PokeBorrador
// This file handles the rendering and logic for the Pokedex tab.

var POKEMON_SPRITE_IDS = {
  bulbasaur: 1, ivysaur: 2, venusaur: 3,
  charmander: 4, charmeleon: 5, charizard: 6,
  squirtle: 7, wartortle: 8, blastoise: 9,
  caterpie: 10, metapod: 11, butterfree: 12,
  weedle: 13, kakuna: 14, beedrill: 15,
  pidgey: 16, pidgeotto: 17, pidgeot: 18,
  rattata: 19, raticate: 20,
  spearow: 21, fearow: 22,
  ekans: 23, arbok: 24,
  pikachu: 25, raichu: 26,
  sandshrew: 27, sandslash: 28,
  nidoran_f: 29, nidorina: 30, nidoqueen: 31,
  nidoran_m: 32, nidorino: 33, nidoking: 34,
  clefairy: 35, clefable: 36,
  vulpix: 37, ninetales: 38,
  jigglypuff: 39, wigglytuff: 40,
  zubat: 41, golbat: 42,
  oddish: 43, gloom: 44, vileplume: 45,
  paras: 46, parasect: 47,
  venonat: 48, venomoth: 49,
  diglett: 50, dugtrio: 51,
  meowth: 52, persian: 53,
  psyduck: 54, golduck: 55,
  mankey: 56, primeape: 57,
  growlithe: 58, arcanine: 59,
  poliwag: 60, poliwhirl: 61, poliwrath: 62,
  abra: 63, kadabra: 64, alakazam: 65,
  machop: 66, machoke: 67, machamp: 68,
  bellsprout: 69, weepinbell: 70, victreebel: 71,
  tentacool: 72, tentacruel: 73,
  geodude: 74, graveler: 75, golem: 76,
  ponyta: 77, rapidash: 78,
  slowpoke: 79, slowbro: 80,
  magnemite: 81, magneton: 82,
  farfetchd: 83,
  doduo: 84, dodrio: 85,
  seel: 86, dewgong: 87,
  grimer: 88, muk: 89,
  shellder: 90, cloyster: 91,
  gastly: 92, haunter: 93, gengar: 94,
  onix: 95,
  drowzee: 96, hypno: 97,
  krabby: 98, kingler: 99,
  voltorb: 100, electrode: 101,
  exeggcute: 102, exeggutor: 103,
  cubone: 104, marowak: 105,
  hitmonlee: 106, hitmonchan: 107,
  lickitung: 108,
  koffing: 109, weezing: 110,
  rhyhorn: 111, rhydon: 112,
  chansey: 113,
  tangela: 114,
  kangaskhan: 115,
  horsea: 116, seadra: 117,
  goldeen: 118, seaking: 119,
  staryu: 120, starmie: 121,
  mr_mime: 122,
  scyther: 123,
  jynx: 124,
  electabuzz: 125,
  magmar: 126,
  pinsir: 127,
  tauros: 128,
  magikarp: 129, gyarados: 130,
  lapras: 131,
  ditto: 132,
  eevee: 133, vaporeon: 134, jolteon: 135, flareon: 136,
  porygon: 137,
  omanyte: 138, omastar: 139,
  kabuto: 140, kabutops: 141,
  aerodactyl: 142,
  snorlax: 143,
  articuno: 144, zapdos: 145, moltres: 146,
  dratini: 147, dragonair: 148, dragonite: 149,
  mewtwo: 150, mew: 151,
  // Babies & Gen 2 basics
  pichu: 172, cleffa: 173, igglybuff: 174, togepi: 175, togetic: 176, tyrogue: 236, smoochum: 238, elekid: 239, magby: 240
};

var PDEX_ORDER = [
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
  'nidoran_f','nidorina','nidoqueen',
  'nidoran_m','nidorino','nidoking',
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
  'mr_mime',
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
];

var GEN2_PDEX_ORDER = [
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
  'suicune', 'larvitar', 'pupitar', 'tyranitar', 'lugia', 'ho-oh', 'celebi'
];

let currentPdexCategory = 'gen1';

// Type colors mapping for badges
var PDEX_TYPE_COLORS = {
  normal:'#aaa', fire:'#FF6B35', water:'#3B8BFF', grass:'#6BCB77',
  electric:'#FFD93D', ice:'#7DF9FF', fighting:'#FF3B3B', poison:'#C77DFF',
  ground:'#c8a060', flying:'#89CFF0', psychic:'#FF6EFF', bug:'#8BC34A',
  rock:'#c8a060', ghost:'#7B2FBE', dragon:'#5C16C5', dark:'#555', steel:'#9E9E9E'
};

// TMs that exist in the game for future completion
const GAME_TMS = [
  { id: 'TM01', name: 'Puño Certero', type: 'fighting' },
  { id: 'TM02', name: 'Garra Dragón', type: 'dragon' },
  { id: 'TM03', name: 'Hidropulso', type: 'water' },
  { id: 'TM04', name: 'Paz Mental', type: 'psychic' },
  { id: 'TM05', name: 'Rugido', type: 'normal' },
  { id: 'TM06', name: 'Tóxico', type: 'poison' },
  { id: 'TM07', name: 'Granizo', type: 'ice' },
  { id: 'TM08', name: 'Corpulencia', type: 'fighting' },
  { id: 'TM09', name: 'Recurrente', type: 'grass' },
  { id: 'TM10', name: 'Poder Oculto', type: 'normal' },
  { id: 'TM11', name: 'Día Soleado', type: 'fire' },
  { id: 'TM12', name: 'Mofa', type: 'dark' },
  { id: 'TM13', name: 'Rayo Hielo', type: 'ice' },
  { id: 'TM14', name: 'Ventisca', type: 'ice' },
  { id: 'TM15', name: 'Hiperrayo', type: 'normal' },
  { id: 'TM16', name: 'Pantalla de Luz', type: 'psychic' },
  { id: 'TM17', name: 'Protección', type: 'normal' },
  { id: 'TM18', name: 'Danza Lluvia', type: 'water' },
  { id: 'TM19', name: 'Gigadrenado', type: 'grass' },
  { id: 'TM20', name: 'Velo Sagrado', type: 'normal' },
  { id: 'TM21', name: 'Frustración', type: 'normal' },
  { id: 'TM22', name: 'Rayo Solar', type: 'grass' },
  { id: 'TM23', name: 'Cola Férrea', type: 'steel' },
  { id: 'TM24', name: 'Rayo', type: 'electric' },
  { id: 'TM25', name: 'Trueno', type: 'electric' },
  { id: 'TM26', name: 'Terremoto', type: 'ground' },
  { id: 'TM27', name: 'Retribución', type: 'normal' },
  { id: 'TM28', name: 'Excavar', type: 'ground' },
  { id: 'TM29', name: 'Psíquico', type: 'psychic' },
  { id: 'TM30', name: 'Bola Sombra', type: 'ghost' },
  { id: 'TM31', name: 'Demolición', type: 'fighting' },
  { id: 'TM32', name: 'Doble Equipo', type: 'normal' },
  { id: 'TM33', name: 'Reflejo', type: 'psychic' },
  { id: 'TM34', name: 'Onda Voltio', type: 'electric' },
  { id: 'TM35', name: 'Lanzallamas', type: 'fire' },
  { id: 'TM36', name: 'Bomba Lodo', type: 'poison' },
  { id: 'TM37', name: 'Tormenta de Arena', type: 'rock' },
  { id: 'TM38', name: 'Llamarada', type: 'fire' },
  { id: 'TM39', name: 'Tumba Rocas', type: 'rock' },
  { id: 'TM40', name: 'Golpe Aéreo', type: 'flying' },
  { id: 'TM41', name: 'Tormento', type: 'dark' },
  { id: 'TM42', name: 'Imagen', type: 'normal' },
  { id: 'TM43', name: 'Daño Secreto', type: 'normal' },
  { id: 'TM44', name: 'Descanso', type: 'psychic' },
  { id: 'TM45', name: 'Atracción', type: 'normal' },
  { id: 'TM46', name: 'Ladrón', type: 'dark' },
  { id: 'TM47', name: 'Ala de Acero', type: 'steel' },
  { id: 'TM48', name: 'Intercambio', type: 'psychic' },
  { id: 'TM49', name: 'Robo', type: 'dark' },
  { id: 'TM50', name: 'Sofoco', type: 'fire' },
];

// TM compatibility (pokémon that can learn each TM).
const TM_COMPAT = {
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
  pidgeot: ['TM06','TM10','TM11','TM15','TM17','TM18','TM21','TM27','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM47'],
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
  nidoran_f: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  nidorina: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM40','TM42','TM43','TM44','TM45','TM46'],
  nidoqueen: ['TM01','TM03','TM05','TM06','TM10','TM11','TM12','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM26','TM27','TM28','TM30','TM31','TM32','TM34','TM35','TM36','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM45','TM46'],
  nidoran_m: ['TM03','TM06','TM10','TM11','TM13','TM14','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM32','TM34','TM36','TM42','TM43','TM44','TM45','TM46'],
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
  mr_mime: ['TM01','TM04','TM06','TM10','TM11','TM12','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM24','TM25','TM27','TM29','TM30','TM31','TM32','TM33','TM34','TM41','TM42','TM43','TM44','TM45','TM46','TM48','TM49'],
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
  mewtwo: ['TM01','TM03','TM04','TM06','TM10','TM11','TM13','TM14','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM24','TM25','TM26','TM27','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM48','TM49','TM50'],
  mew: ['TM01','TM02','TM03','TM04','TM05','TM06','TM07','TM08','TM09','TM10','TM11','TM12','TM13','TM14','TM15','TM16','TM17','TM18','TM19','TM20','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM36','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47','TM48','TM49','TM50']
};

window.switchPdexCategory = function(cat) {
  currentPdexCategory = cat;
  
  // UI update
  const totalCountEl = document.getElementById('pdex-total-count');
  if (totalCountEl) totalCountEl.textContent = (cat === 'gen1' ? '151' : '100');
  
  const gen1Btn = document.getElementById('pdex-cat-gen1');
  const gen2Btn = document.getElementById('pdex-cat-gen2');
  
  if (gen1Btn) {
    if (cat === 'gen1') {
      gen1Btn.classList.add('active');
      gen1Btn.style.background = 'var(--yellow)';
      gen1Btn.style.color = '#000';
    } else {
      gen1Btn.classList.remove('active');
      gen1Btn.style.background = 'transparent';
      gen1Btn.style.color = 'var(--gray)';
    }
  }
  
  if (gen2Btn) {
    if (cat === 'gen2') {
      gen2Btn.classList.add('active');
      gen2Btn.style.background = 'var(--yellow)';
      gen2Btn.style.color = '#000';
    } else {
      gen2Btn.classList.remove('active');
      gen2Btn.style.background = 'transparent';
      gen2Btn.style.color = 'var(--gray)';
    }
  }
  
  renderPokedex();
};

window.switchPdexTab = function(tabName, pokemonId) {
  const tabs = ['info', 'learnset', 'tms', 'evo'];
  tabs.forEach(t => {
    const el = document.getElementById(`pdex-tab-${t}`);
    if (el) el.style.display = (t === tabName) ? 'block' : 'none';
    const btn = document.getElementById(`pdex-btn-${t}`);
    if (btn) btn.style.borderBottom = (t === tabName) ? '2px solid var(--yellow)' : 'none';
  });
};

window.renderPokedex = function() {
  const container = document.getElementById('pokedex-grid');
  if (!container) return;

  const caught = state.pokedex || [];
  const seen = state.seenPokedex || [];
  
  // Update counts based on current category
  const order = (currentPdexCategory === 'gen1' ? PDEX_ORDER : GEN2_PDEX_ORDER);
  const totalSeen = seen.filter(id => order.includes(id));
  const totalCaught = caught.filter(id => order.includes(id));

  const seenEl = document.getElementById('pokedex-seen-count');
  const caughtEl = document.getElementById('pokedex-caught-count');
  if (seenEl) seenEl.textContent = totalSeen.length;
  if (caughtEl) caughtEl.textContent = totalCaught.length;

  container.innerHTML = order.map((id, index) => {
    const isCaught = caught.includes(id);
    const isSeen = seen.includes(id) || isCaught;
    const pData = (typeof POKEMON_DB !== 'undefined' ? POKEMON_DB[id] : null);
    
    // Dex number calculation
    const numValue = (currentPdexCategory === 'gen1' ? index + 1 : index + 152);
    const num = String(numValue).padStart(3, '0');
    
    // Resolve sprite using the registries
    const spriteId = window.POKEMON_SPRITE_IDS[id] || POKEMON_SPRITE_IDS[id];
    const spriteUrl = spriteId 
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png` 
      : (isSeen ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${numValue}.png` : '');

    // If not seen or not even in DB yet, show placeholder
    const spriteHtml = (isSeen && spriteUrl)
      ? `<img src="${spriteUrl}" style="width:50px;height:50px;image-rendering:pixelated;${isCaught ? '' : 'filter:brightness(0) opacity(0.5);'}" alt="${id}">`
      : `<div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-size:20px;color:#333;">?</div>`;

    const displayName = (isSeen && pData) ? pData.name : id.charAt(0).toUpperCase() + id.slice(1);
    const nameToShow = isSeen ? displayName : '???';

    return `
      <div class="pokedex-card" onclick="${(isSeen && pData) ? `showPokedexDetail('${id}')` : ''}" 
        style="background:rgba(255,255,255,0.03);border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;border:1px solid ${isCaught ? 'rgba(255,214,10,0.2)' : 'rgba(255,255,255,0.05)'};cursor:${(isSeen && pData) ? 'pointer' : 'default'};">
        <div style="font-size:8px;color:#555;margin-bottom:4px;font-family:'Press Start 2P',monospace;">#${num}</div>
        <div style="height:50px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;">
          ${spriteHtml}
        </div>
        <div style="font-size:9px;font-weight:700;color:${isCaught ? 'var(--yellow)' : (isSeen ? '#aaa' : '#444')};text-align:center;text-transform:capitalize;">
          ${nameToShow}
        </div>
      </div>
    `;
  }).join('');
};

window.showPokedexDetail = function(pokemonId) {
  const pData = POKEMON_DB[pokemonId];
  if (!pData) return;

  const num = String(POKEMON_SPRITE_IDS[pokemonId] || '???').padStart(3, '0');
  const spriteId = POKEMON_SPRITE_IDS[pokemonId];
  const spriteUrl = spriteId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
    : '';

  const typeColors = PDEX_TYPE_COLORS;
  const type2Key = pokemonId in (typeof POKE_TYPE2 !== 'undefined' ? POKE_TYPE2 : {})
    ? POKE_TYPE2[pokemonId]
    : null;

  const typeBadge = (t) => t
    ? `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
    : '';

  // Stats
  const STAT_LABELS = [
    { key: 'hp', label: 'HP', color: '#6BCB77' },
    { key: 'atk', label: 'ATK', color: '#FF6B35' },
    { key: 'def', label: 'DEF', color: '#3B8BFF' },
    { key: 'spa', label: 'SPA', color: '#C77DFF' },
    { key: 'spd', label: 'SPD', color: '#7DF9FF' },
    { key: 'spe', label: 'SPE', color: '#FFD93D' }
  ];

  const statsHtml = STAT_LABELS.map(s => {
    const val = pData[s.key] || 0;
    const percent = Math.min(100, (val / 150) * 100);
    return `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;">
          <span style="color:#aaa;font-weight:700;">${s.label}</span>
          <span style="color:#fff;font-weight:700;">${val}</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${percent}%;background:${s.color};border-radius:3px;"></div>
        </div>
      </div>
    `;
  }).join('');

  // Abilities
  const abilityList = (typeof ABILITIES !== 'undefined' && ABILITIES[pokemonId]) || [];
  const abilitiesHtml = abilityList.map(ab => {
    const desc = (typeof ABILITY_DATA !== 'undefined' && ABILITY_DATA[ab]) || '';
    return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px 12px;margin-bottom:6px;">
      <div style="font-weight:700;font-size:12px;color:#fff;">${ab}</div>
      ${desc ? `<div style="font-size:10px;color:#aaa;margin-top:2px;">${desc}</div>` : ''}
    </div>`;
  }).join('') || '<div style="color:#777;font-size:11px;">—</div>';

  // Learnset
  const learnset = pData.learnset || [];
  const learnsetHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:#777;font-size:9px;text-transform:uppercase;">
          <th style="text-align:left;padding:4px 6px;font-weight:600;">Nv</th>
          <th style="text-align:left;padding:4px 6px;font-weight:600;">Movimiento</th>
          <th style="text-align:right;padding:4px 6px;font-weight:600;">PP</th>
        </tr>
      </thead>
      <tbody>
        ${learnset.map(m => {
          const moveName = m.name || m.move;
          const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[moveName]) || {};
          const pp = m.pp || md.pp || '—';
          return `<tr onclick="showMoveDetail('${moveName.replace(/'/g, "\\'")}')" 
              style="border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.2s;"
              onmouseover="this.style.background='rgba(255,255,255,0.05)'" 
              onmouseout="this.style.background='transparent'">
            <td style="padding:5px 6px;color:var(--yellow);font-weight:700;">${m.lv}</td>
            <td style="padding:5px 6px;">
              <span style="font-weight:600;color:#fff;">${moveName}</span>
              ${md.type ? `<span class="type-badge type-${md.type.toLowerCase()}" style="margin-left:6px;font-size:9px;padding:1px 6px;">${md.type}</span>` : ''}
            </td>
            <td style="padding:5px 6px;text-align:right;color:#aaa;">${pp}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  // TM section
  const pokeTMs = TM_COMPAT[pokemonId] || [];
  const tmsHtml = GAME_TMS.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${GAME_TMS.map(tm => {
          const learnsTM = pokeTMs.includes(tm.id);
          return `<div title="${tm.name}" class="type-badge type-${tm.type.toLowerCase()}" style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;
            ${!learnsTM ? 'background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.1); opacity:0.4;' : ''}">
            <span style="font-size:9px;font-weight:700; ${!learnsTM ? 'color:#666;' : ''}">${tm.id}</span>
          </div>`;
        }).join('')}
      </div>`
    : '<div style="color:#777;font-size:11px;">Próximamente</div>';

  // Evolutions section
  const evoTable = typeof EVOLUTION_TABLE !== 'undefined' ? EVOLUTION_TABLE : {};
  const stoneEvoTable = typeof STONE_EVOLUTIONS !== 'undefined' ? STONE_EVOLUTIONS : {};
  const tradeEvoTable = typeof TRADE_EVOLUTIONS !== 'undefined' ? TRADE_EVOLUTIONS : {};
  
  const possibleEvos = [];
  
  // Level up
  if (evoTable[pokemonId]) {
    possibleEvos.push({ method: `Nv. ${evoTable[pokemonId].level}`, toId: evoTable[pokemonId].to });
  }
  // Special cases (eevee)
  if (pokemonId === 'eevee') {
    possibleEvos.push({ method: '💧 Piedra Agua', stoneName: 'Piedra Agua', toId: 'vaporeon' });
    possibleEvos.push({ method: '⚡ Piedra Trueno', stoneName: 'Piedra Trueno', toId: 'jolteon' });
    possibleEvos.push({ method: '🔥 Piedra Fuego',  stoneName: 'Piedra Fuego',  toId: 'flareon' });
  } else if (stoneEvoTable[pokemonId]) {
    const sName = stoneEvoTable[pokemonId].stone;
    const shopItem = (typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS.find(i => i.name === sName) : null;
    const stoneIcon = shopItem ? shopItem.icon : '💎';
    possibleEvos.push({ 
      method: `${stoneIcon} ${sName}`,
      stoneName: sName,
      toId: stoneEvoTable[pokemonId].to 
    });
  }
  // Trade
  if (tradeEvoTable[pokemonId]) {
    possibleEvos.push({ method: '🤝 Intercambio', toId: tradeEvoTable[pokemonId] });
  }

  const evosHtml = possibleEvos.length > 0
    ? `<div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;">
        ${possibleEvos.map(evo => {
          const evoSpriteId = POKEMON_SPRITE_IDS[evo.toId];
          const evoSpriteUrl = evoSpriteId 
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evoSpriteId}.png` 
            : '';
          const shopItem = (evo.stoneName && typeof SHOP_ITEMS !== 'undefined') ? SHOP_ITEMS.find(i => i.name === evo.stoneName) : null;
          const methodHtml = shopItem
            ? `<div style="display:flex;align-items:center;justify-content:center;gap:4px;"><img src="${shopItem.sprite}" style="width:16px;height:16px;image-rendering:pixelated;" onerror="this.outerHTML='<span>${shopItem.icon}</span>'">${shopItem.name}</div>`
            : evo.method;
          
          return `<div style="display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;width:100px;">
            <img src="${evoSpriteUrl}" style="width:50px;height:50px;image-rendering:pixelated;margin-bottom:8px;">
            <div style="font-size:9px;color:#aaa;text-align:center;margin-bottom:4px;">${methodHtml}</div>
            <div style="font-size:10px;font-weight:700;color:var(--yellow);text-transform:capitalize;">${evo.toId}</div>
          </div>`;
        }).join('')}
      </div>`
    : '<div style="color:#777;font-size:11px;">No tiene evoluciones conocidas</div>';

  const modalHtml = `
    <div id="pokedex-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;">
      <div style="background:var(--card);width:100%;max-width:450px;max-height:90vh;border-radius:24px;border:1px solid rgba(255,255,255,0.1);position:relative;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="padding:24px;background:linear-gradient(to bottom, rgba(255,255,255,0.05), transparent);display:flex;align-items:center;gap:20px;">
          <div style="width:100px;height:100px;background:rgba(255,255,255,0.03);border-radius:20px;display:flex;align-items:center;justify-content:center;position:relative;">
            <img src="${spriteUrl}" style="width:90px;height:90px;image-rendering:pixelated;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
          </div>
          <div style="flex:1;">
            <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--gray);margin-bottom:4px;">#${num}</div>
            <div style="font-family:'Press Start 2P',monospace;font-size:13px;color:var(--yellow);margin-bottom:8px;">${pData.name}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${typeBadge(pData.type)}
              ${typeBadge(type2Key)}
            </div>
          </div>
          <button onclick="closePokedexModal()" 
            style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.1);border:none;color:#aaa;
            font-size:18px;cursor:pointer;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <!-- Content -->
        <div style="flex:1;overflow-y:auto;padding:0 24px 24px;">
          
          <!-- Tabs-like sections -->
          <div style="margin-bottom:24px;">
            <div style="font-size:10px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Estadísticas Base</div>
            ${statsHtml}
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:10px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Habilidades</div>
            ${abilitiesHtml}
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:10px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Evoluciones</div>
            ${evosHtml}
          </div>

          <div style="margin-bottom:24px;">
            <div style="font-size:10px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Compatibilidad TMs</div>
            ${tmsHtml}
          </div>

          <div>
            <div style="font-size:10px;font-weight:800;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Movimientos por Nivel</div>
            <div style="background:rgba(0,0,0,0.2);border-radius:16px;padding:8px;border:1px solid rgba(255,255,255,0.03);">
              ${learnsetHtml}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closePokedexModal = function() {
  const modal = document.getElementById('pokedex-modal');
  if (modal) modal.remove();
};
