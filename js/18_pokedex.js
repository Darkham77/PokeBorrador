// ===== POKÉDEX (18_pokedex.js) =====

// The canonical Pokédex order for the first 151 pokémon
const POKEDEX_ORDER = [
  'bulbasaur','ivysaur','venusaur',
  'charmander','charmeleon','charizard',
  'squirtle','wartortle','blastoise',
  'caterpie','metapod','butterfree',
  'weedle','kakuna','beedrill',
  'pidgey','pidgeotto','pidgeot',
  'rattata','raticate',
  'spearow','fearow',
  'ekans','arbok',
  'pikachu','raichu',
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
  'farfetchd','doduo','dodrio',
  'seel','dewgong',
  'grimer','muk',
  'shellder','cloyster',
  'gastly','haunter','gengar',
  'onix','drowzee','hypno',
  'krabby','kingler',
  'voltorb','electrode',
  'exeggcute','exeggutor',
  'cubone','marowak',
  'hitmonlee','hitmonchan','lickitung',
  'koffing','weezing',
  'rhyhorn','rhydon',
  'chansey','tangela','kangaskhan',
  'horsea','seadra',
  'goldeen','seaking',
  'staryu','starmie',
  'mr_mime','scyther','jynx','electabuzz','magmar','pinsir','tauros',
  'magikarp','gyarados','lapras','ditto',
  'eevee','vaporeon','jolteon','flareon',
  'porygon','omanyte','omastar','kabuto','kabutops','aerodactyl',
  'snorlax','articuno','zapdos','moltres',
  'dratini','dragonair','dragonite',
  'mewtwo','mew'
];

// Type colors mapping for badges
const PDEX_TYPE_COLORS = {
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

// TM compatibility (pokémon that can learn each TM). Placeholder data ready to fill.
const TM_COMPAT = {
  bulbasaur: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  ivysaur: ['TM06','TM09','TM10','TM11','TM17','TM19','TM21','TM22','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  venusaur: ['TM05','TM06','TM09','TM10','TM11','TM15','TM17','TM19','TM21','TM22','TM26','TM27','TM32','TM36','TM42','TM43','TM44','TM45'],
  charmander: ['TM01','TM02','TM06','TM10','TM11','TM17','TM21','TM23','TM27','TM28','TM31','TM32','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM50'],
  charmeleon: ['TM01','TM02','TM06','TM10','TM11','TM17','TM21','TM23','TM27','TM28','TM31','TM32','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM50'],
  charizard: ['TM01','TM02','TM05','TM06','TM10','TM11','TM15','TM17','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM35','TM38','TM40','TM42','TM43','TM44','TM45','TM47','TM50'],
  squirtle: ['TM01','TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM23','TM27','TM28','TM31','TM32','TM42','TM43','TM44','TM45'],
  wartortle: ['TM01','TM03','TM06','TM07','TM10','TM13','TM14','TM17','TM18','TM21','TM23','TM27','TM28','TM31','TM32','TM42','TM43','TM44','TM45'],
  blastoise: ['TM01','TM03','TM05','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM26','TM27','TM28','TM31','TM32','TM42','TM43','TM44','TM45'],
  caterpie: [],
  metapod: [],
  butterfree: ['TM06','TM10','TM11','TM15','TM17','TM18','TM19','TM20','TM21','TM22','TM27','TM29','TM30','TM32','TM40','TM42','TM43','TM44','TM45','TM46','TM48'],
  weedle: [],
  kakuna: [],
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
  raichu: ['TM01','TM06','TM10','TM15','TM16','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM31','TM32','TM34','TM42','TM43','TM44','TM45','TM46'],
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
  magikarp: [],
  gyarados: ['TM03','TM05','TM06','TM07','TM10','TM12','TM13','TM14','TM15','TM17','TM18','TM21','TM24','TM25','TM26','TM27','TM32','TM35','TM37','TM38','TM41','TM42','TM43','TM44','TM45'],
  lapras: ['TM03','TM05','TM06','TM07','TM10','TM13','TM14','TM15','TM17','TM18','TM20','TM21','TM23','TM24','TM25','TM27','TM29','TM32','TM34','TM42','TM43','TM44','TM45'],
  ditto: [],
  eevee: ['TM06','TM10','TM11','TM17','TM18','TM21','TM23','TM27','TM28','TM30','TM32','TM42','TM43','TM44','TM45'],
  vaporeon: ['TM03','TM05','TM06','TM07','TM10','TM11','TM13','TM14','TM15','TM17','TM18','TM21','TM23','TM27','TM28','TM30','TM32','TM42','TM43','TM44','TM45'],
  jolteon: ['TM05','TM06','TM10','TM11','TM15','TM17','TM18','TM21','TM23','TM24','TM25','TM27','TM28','TM30','TM32','TM34','TM42','TM43','TM44','TM45'],
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
  mewtwo: ['TM01','TM03','TM04','TM06','TM07','TM08','TM10','TM11','TM12','TM13','TM14','TM15','TM16','TM17','TM18','TM20','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM48','TM49'],
  mew: ['TM01','TM02','TM03','TM04','TM05','TM06','TM07','TM08','TM09','TM10','TM11','TM12','TM13','TM14','TM15','TM16','TM17','TM18','TM19','TM20','TM21','TM22','TM23','TM24','TM25','TM26','TM27','TM28','TM29','TM30','TM31','TM32','TM33','TM34','TM35','TM36','TM37','TM38','TM39','TM40','TM41','TM42','TM43','TM44','TM45','TM46','TM47','TM48','TM49','TM50'],
};

function renderPokedex() {
  const grid = document.getElementById('pokedex-grid');
  if (!grid) return;

  const caught = state.pokedex || [];
  const seen = state.seenPokedex || [];

  // Update counters
  const seenCount = POKEDEX_ORDER.filter(id => seen.includes(id) && !caught.includes(id)).length;
  const caughtCount = POKEDEX_ORDER.filter(id => caught.includes(id)).length;
  const seenEl = document.getElementById('pokedex-seen-count');
  const caughtEl = document.getElementById('pokedex-caught-count');
  if (seenEl) seenEl.textContent = seenCount + caughtCount; // seen includes caught
  if (caughtEl) caughtEl.textContent = caughtCount;

  grid.innerHTML = POKEDEX_ORDER.map((id, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    const isCaught = caught.includes(id);
    const isSeen = seen.includes(id);
    const spriteId = POKEMON_SPRITE_IDS[id];
    const pData = POKEMON_DB[id];
    const name = pData ? pData.name : id;

    if (!isCaught && !isSeen) {
      // Unseen: question mark
      return `<div class="pdex-cell pdex-unseen" title="#${num}">
        <div class="pdex-num">#${num}</div>
        <div class="pdex-sprite-wrap">
          <div class="pdex-question">?</div>
        </div>
        <div class="pdex-name pdex-name-hidden">???</div>
      </div>`;
    }

    const spriteUrl = spriteId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
      : '';

    const filterStyle = isCaught ? '' : 'filter:brightness(0);';
    const clickHandler = isCaught ? `onclick="showPokedexDetail('${id}')"` : '';
    const cursorStyle = isCaught ? 'cursor:pointer;' : 'cursor:default;';

    return `<div class="pdex-cell ${isCaught ? 'pdex-caught' : 'pdex-seen'}" 
                title="${isCaught ? name + ' #' + num : '#' + num + ' (Visto)'}" 
                style="${cursorStyle}" ${clickHandler}>
        <div class="pdex-num">#${num}</div>
        <div class="pdex-sprite-wrap">
          ${spriteUrl
            ? `<img src="${spriteUrl}" alt="${name}" style="width:56px;height:56px;image-rendering:pixelated;${filterStyle}" onerror="this.style.display='none'">`
            : `<div style="font-size:32px;line-height:56px;">${pData?.emoji || '?'}</div>`
          }
        </div>
        <div class="pdex-name ${isCaught ? '' : 'pdex-name-hidden'}">${isCaught ? name : '???'}</div>
      </div>`;
  }).join('');
}

function showPokedexDetail(pokemonId) {
  const pData = POKEMON_DB[pokemonId];
  if (!pData) return;

  const caught = state.pokedex || [];
  if (!caught.includes(pokemonId)) return; // only show info if caught

  const idx = POKEDEX_ORDER.indexOf(pokemonId);
  const num = idx >= 0 ? String(idx + 1).padStart(3, '0') : '???';
  const spriteId = POKEMON_SPRITE_IDS[pokemonId];
  const spriteUrl = spriteId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
    : '';

  const typeColors = PDEX_TYPE_COLORS;
  const type2Key = pokemonId in (typeof POKE_TYPE2 !== 'undefined' ? POKE_TYPE2 : {})
    ? POKE_TYPE2[pokemonId]
    : null;

  const typeBadge = (t) => t
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;
        background:${typeColors[t] || '#777'}22;border:1px solid ${typeColors[t] || '#777'};color:${typeColors[t] || '#eee'};
        text-transform:capitalize;">${t}</span>`
    : '';

  // Stats
  const STAT_LABELS = [
    { key: 'hp', label: 'HP', color: '#6BCB77' },
    { key: 'atk', label: 'Ataque', color: '#FF6B35' },
    { key: 'def', label: 'Defensa', color: '#3B8BFF' },
    { key: 'spa', label: 'At. Esp', color: '#C77DFF' },
    { key: 'spd', label: 'Def. Esp', color: '#89CFF0' },
    { key: 'spe', label: 'Velocidad', color: '#FFD93D' },
  ];
  const maxStat = 255;
  const statsHtml = STAT_LABELS.map(s => {
    const val = pData[s.key] || 0;
    const pct = Math.round((val / maxStat) * 100);
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <div style="width:70px;font-size:10px;color:#aaa;text-align:right;">${s.label}</div>
      <div style="font-size:11px;font-weight:700;color:${s.color};width:30px;text-align:right;">${val}</div>
      <div style="flex:1;background:rgba(255,255,255,0.08);border-radius:10px;height:8px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${s.color};border-radius:10px;transition:width 0.6s;"></div>
      </div>
    </div>`;
  }).join('');

  // Abilities
  const abilityList = ABILITIES[pokemonId] || [];
  const abilitiesHtml = abilityList.map(ab => {
    const desc = (typeof ABILITY_DATA !== 'undefined' && ABILITY_DATA[ab]) || '';
    return `<div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:8px 12px;margin-bottom:6px;">
      <div style="font-weight:700;font-size:12px;color:#fff;">${ab}</div>
      ${desc ? `<div style="font-size:10px;color:#aaa;margin-top:2px;">${desc}</div>` : ''}
    </div>`;
  }).join('') || '<div style="color:#777;font-size:11px;">—</div>';


  // Learnset table
  const learnset = pData.learnset || [];
  const learnsetHtml = learnset.length > 0
    ? `<table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="color:#aaa;border-bottom:1px solid rgba(255,255,255,0.1);">
            <th style="text-align:left;padding:4px 6px;font-weight:600;">Nv.</th>
            <th style="text-align:left;padding:4px 6px;font-weight:600;">Movimiento</th>
            <th style="text-align:right;padding:4px 6px;font-weight:600;">PP</th>
          </tr>
        </thead>
        <tbody>
          ${learnset.map(m => {
            const md = (typeof MOVE_DATA !== 'undefined' && MOVE_DATA[m.name]) || {};
            const mColor = typeColors[md.type] || '#aaa';
            return `<tr onclick="showMoveDetail('${m.name.replace(/'/g, "\\'")}')" 
                style="border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background 0.2s;"
                onmouseover="this.style.background='rgba(255,255,255,0.05)'" 
                onmouseout="this.style.background='transparent'">
              <td style="padding:5px 6px;color:var(--yellow);font-weight:700;">${m.lv}</td>
              <td style="padding:5px 6px;">
                <span style="font-weight:600;color:#fff;">${m.name}</span>
                ${md.type ? `<span style="margin-left:6px;font-size:9px;padding:1px 6px;border-radius:10px;background:${mColor}33;color:${mColor};text-transform:capitalize;">${md.type}</span>` : ''}
              </td>
              <td style="padding:5px 6px;text-align:right;color:#aaa;">${m.pp}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<div style="color:#777;font-size:11px;">Sin movimientos registrados</div>';

  // TM section
  const pokeTMs = TM_COMPAT[pokemonId] || [];
  const tmsHtml = GAME_TMS.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${GAME_TMS.map(tm => {
          const learnsTM = pokeTMs.includes(tm.id);
          const tmColor = typeColors[tm.type] || '#aaa';
          return `<div title="${tm.name}" style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;
            background:${learnsTM ? tmColor + '22' : 'rgba(255,255,255,0.04)'};
            border:1px solid ${learnsTM ? tmColor : 'rgba(255,255,255,0.1)'};
            opacity:${learnsTM ? '1' : '0.4'};">
            <span style="font-size:9px;font-weight:700;color:${learnsTM ? tmColor : '#666'};">${tm.id}</span>
            <span style="font-size:9px;color:${learnsTM ? '#eee' : '#555'};">${tm.name}</span>
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
    possibleEvos.push({ 
      method: `Nivel ${evoTable[pokemonId].level}`, 
      toId: evoTable[pokemonId].to 
    });
  }
  
  // Stone
  if (pokemonId === 'eevee') {
    possibleEvos.push({ method: '💧 Piedra Agua', toId: 'vaporeon' });
    possibleEvos.push({ method: '⚡ Piedra Trueno', toId: 'jolteon' });
    possibleEvos.push({ method: '🔥 Piedra Fuego', toId: 'flareon' });
  } else if (stoneEvoTable[pokemonId]) {
    possibleEvos.push({ 
      method: stoneEvoTable[pokemonId].stone, 
      toId: stoneEvoTable[pokemonId].to 
    });
  }
  
  // Trade
  if (tradeEvoTable[pokemonId]) {
    possibleEvos.push({ 
      method: 'Intercambio', 
      toId: tradeEvoTable[pokemonId] 
    });
  }

  const evosHtml = possibleEvos.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;">
        ${possibleEvos.map(evo => {
          const toData = POKEMON_DB[evo.toId] || {};
          const toName = toData.name || evo.toId;
          const isCaught = caught.includes(evo.toId);
          const evoSpriteId = POKEMON_SPRITE_IDS[evo.toId];
          const evoSpriteUrl = evoSpriteId 
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evoSpriteId}.png` 
            : '';
          
          return `<div style="display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;width:100px;">
            ${evoSpriteUrl 
              ? `<img src="${evoSpriteUrl}" alt="${toName}" style="width:64px;height:64px;image-rendering:pixelated;${isCaught ? '' : 'filter:brightness(0);opacity:0.6;'}">`
              : `<div style="font-size:32px;line-height:64px;">?</div>`
            }
            <div style="font-size:10px;font-weight:bold;color:${isCaught ? '#fff' : '#666'};margin-top:6px;text-align:center;">${isCaught ? toName : '???'}</div>
            <div style="font-size:8px;color:#aaa;margin-top:4px;text-align:center;background:rgba(0,0,0,0.2);padding:4px;border-radius:4px;width:100%;">${evo.method}</div>
          </div>`;
        }).join('')}
      </div>`
    : '<div style="color:#777;font-size:11px;">Este Pokémon no tiene evoluciones conocidas.</div>';

  const modalEl = document.getElementById('pokedex-modal');
  if (!modalEl) return;

  modalEl.innerHTML = `
    <div style="background:#16213e;border-radius:24px;padding:0;width:100%;max-width:540px;
        max-height:88vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);
        box-shadow:0 20px 60px rgba(0,0,0,0.8);position:relative;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:16px;padding:20px 20px 0;background:linear-gradient(180deg,rgba(255,255,255,0.05) 0%,transparent 100%);border-radius:24px 24px 0 0;">
        <div style="position:relative;">
          ${spriteUrl
            ? `<img src="${spriteUrl}" alt="${pData.name}" style="width:80px;height:80px;image-rendering:pixelated;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6));">`
            : `<div style="font-size:56px;width:80px;text-align:center;">${pData.emoji || '?'}</div>`
          }
          ${pData.isShiny ? `<span style="position:absolute;top:-4px;right:-4px;font-size:14px;">✨</span>` : ''}
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

      <!-- Tabs -->
      <div id="pdex-tabs" style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);margin-top:16px;">
        ${['stats','moves','tms','evos'].map((tab, i) => `
          <button onclick="switchPdexTab('${tab}')" id="pdex-tab-${tab}"
            style="flex:1;padding:10px;border:none;font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;
            background:${i===0?'rgba(255,255,255,0.06)':'transparent'};
            color:${i===0?'var(--yellow)':'#777'};
            border-bottom:${i===0?'2px solid var(--yellow)':'2px solid transparent'};
            transition:all 0.2s;">
            ${{stats:'📊 Stats',moves:'📖 Mov.',tms:'💿 MTs',evos:'✨ Evol.'}[tab]}
          </button>`).join('')}
      </div>

      <!-- Panels -->
      <div id="pdex-panel-stats" style="padding:20px;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">ESTADÍSTICAS BASE</div>
        ${statsHtml}
        <div style="margin-top:16px;">
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:10px;">HABILIDADES</div>
          ${abilitiesHtml}
        </div>
      </div>

      <div id="pdex-panel-moves" style="padding:20px;display:none;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">MOVIMIENTOS POR NIVEL</div>
        ${learnsetHtml}
      </div>

      <div id="pdex-panel-tms" style="padding:20px;display:none;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">MTs COMPATIBLES</div>
        <div style="font-size:10px;color:#666;margin-bottom:12px;">Las MTs resaltadas pueden ser aprendidas por este Pokémon.</div>
        ${tmsHtml}
      </div>

      <div id="pdex-panel-evos" style="padding:20px;display:none;">
        <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:14px;">EVOLUCIONES</div>
        ${evosHtml}
      </div>
    </div>
  `;

  modalEl.style.display = 'flex';
  modalEl.style.alignItems = 'center';
  modalEl.style.justifyContent = 'center';
  // Close on backdrop click
  modalEl.onclick = function(e) {
    if (e.target === modalEl) closePokedexModal();
  };
}

function closePokedexModal() {
  const modalEl = document.getElementById('pokedex-modal');
  if (modalEl) modalEl.style.display = 'none';
}

function switchPdexTab(tab) {
  ['stats','moves','tms','evos'].forEach(t => {
    const panel = document.getElementById(`pdex-panel-${t}`);
    const btn = document.getElementById(`pdex-tab-${t}`);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (btn) {
      btn.style.background = t === tab ? 'rgba(255,255,255,0.06)' : 'transparent';
      btn.style.color = t === tab ? 'var(--yellow)' : '#777';
      btn.style.borderBottom = t === tab ? '2px solid var(--yellow)' : '2px solid transparent';
    }
  });
}

// Hook into the showTab function to render pokédex when tab is opened
(function() {
  const _origShowTab = typeof showTab === 'function' ? showTab : null;
  // Use a MutationObserver or override after page load
  window.addEventListener('DOMContentLoaded', () => {
    // Nothing extra needed — renderPokedex is called in 05_render.js when tab=pokedex
  });
})();

function syncRetroactivePokedex() {
  if (!state.pokedex) state.pokedex = [];
  if (!state.seenPokedex) state.seenPokedex = [];

  let updated = false;
  const registerOwned = (p) => {
    if (!p || !p.id) return;
    const baseId = p.id;
    if (!state.seenPokedex.includes(baseId)) {
      state.seenPokedex.push(baseId);
      updated = true;
    }
    if (!state.pokedex.includes(baseId)) {
      state.pokedex.push(baseId);
      updated = true;
    }
  };

  if (state.team) state.team.forEach(registerOwned);
  if (state.box) state.box.forEach(registerOwned);

  if (updated) {
    console.log("[POKEDEX] Retroactive sync applied. Updated Pokédex entries.");
  }
}
