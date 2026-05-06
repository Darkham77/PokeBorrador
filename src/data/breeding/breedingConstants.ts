/**
 * breedingConstants.js
 * Timers, compatibility labels, and baby mappings for the Daycare system.
 */

export const COMPAT_TEXT = {
  0: { label: '❌ Incompatibles', color: '#ff5252' },
  1: { label: '😐 Poco interés', color: '#ffb142' },
  2: { label: '🙂 Compatibles', color: '#33d9b2' },
  3: { label: '❤️ Muy compatibles', color: '#ff793f' },
};

/**
 * Seconds needed for an egg to appear based on compatibility level.
 */
export const EGG_SPAWN_INTERVALS = {
  1: 12 * 60 * 60, // 12h
  2: 9 * 60 * 60,  // 9h
  3: 6 * 60 * 60,  // 6h
};

/**
 * Map of base forms to their baby equivalents.
 */
export const BABY_MAP = {
  pikachu:    'pichu',
  clefairy:   'cleffa',
  jigglypuff: 'igglybuff',
  electabuzz: 'elekid',
  magmar:     'magby',
};

/**
 * Map for resolving evolved forms back to their base breeding form.
 * This is specific to breeding logic for Gen 1/2 scope.
 */
export const BREEDING_BASE_MAP = {
  // Bulbasaur line
  ivysaur: 'bulbasaur', venusaur: 'bulbasaur',
  // Charmander line
  charmeleon: 'charmander', charizard: 'charmander',
  // Squirtle line
  wartortle: 'squirtle', blastoise: 'squirtle',
  // Caterpie line
  metapod: 'caterpie', butterfree: 'caterpie',
  // Weedle line
  kakuna: 'weedle', beedrill: 'weedle',
  // Pidgey line
  pidgeotto: 'pidgey', pidgeot: 'pidgey',
  raticate: 'rattata',
  fearow: 'spearow',
  arbok: 'ekans',
  raichu: 'pikachu',
  sandslash: 'sandshrew',
  nidorina: 'nidoran_f', nidoqueen: 'nidoran_f',
  nidorino: 'nidoran_m', nidoking: 'nidoran_m',
  clefable: 'clefairy',
  ninetales: 'vulpix',
  wigglytuff: 'jigglypuff',
  golbat: 'zubat',
  gloom: 'oddish', vileplume: 'oddish',
  parasect: 'paras',
  venomoth: 'venonat',
  dugtrio: 'diglett',
  persian: 'meowth',
  golduck: 'psyduck',
  primeape: 'mankey',
  arcanine: 'growlithe',
  poliwhirl: 'poliwag', poliwrath: 'poliwag',
  kadabra: 'abra', alakazam: 'abra',
  machoke: 'machop', machamp: 'machop',
  weepinbell: 'bellsprout', victreebel: 'bellsprout',
  tentacruel: 'tentacool',
  graveler: 'geodude', golem: 'geodude',
  rapidash: 'ponyta',
  slowbro: 'slowpoke',
  magneton: 'magnemite',
  dodrio: 'doduo',
  dewgong: 'seel',
  muk: 'grimer',
  cloyster: 'shellder',
  haunter: 'gastly', gengar: 'gastly',
  hypno: 'drowzee',
  kingler: 'krabby',
  electrode: 'voltorb',
  exeggutor: 'exeggcute',
  marowak: 'cubone',
  weezing: 'koffing',
  rhydon: 'rhyhorn',
  seadra: 'horsea',
  seaking: 'goldeen',
  starmie: 'staryu',
  vaporeon: 'eevee', jolteon: 'eevee', flareon: 'eevee',
  kabutops: 'kabuto',
  omastar: 'omanyte',
  dragonair: 'dratini', dragonite: 'dratini',
  gyarados: 'magikarp',
};
