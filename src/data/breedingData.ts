export const EGG_GROUPS = {
  abra: ['humanshape'], aerodactyl: ['flying'], alakazam: ['humanshape'],
  arbok: ['dragon', 'ground'], arcanine: ['ground'], articuno: ['no-eggs'],
  beedrill: ['bug'], bellsprout: ['plant'], blastoise: ['monster', 'water1'],
  bulbasaur: ['monster', 'plant'], butterfree: ['bug'], caterpie: ['bug'],
  chansey: ['fairy'], charizard: ['dragon', 'monster'], charmander: ['dragon', 'monster'],
  charmeleon: ['dragon', 'monster'], clefable: ['fairy'], clefairy: ['fairy'],
  cleffa: ['no-eggs'], cloyster: ['water3'], cubone: ['monster'],
  dewgong: ['ground', 'water1'], diglett: ['ground'], ditto: ['ditto'],
  dodrio: ['flying'], doduo: ['flying'], dragonair: ['dragon', 'water1'],
  dragonite: ['dragon', 'water1'], dratini: ['dragon', 'water1'],
  drowzee: ['humanshape'], dugtrio: ['ground'], eevee: ['ground'],
  ekans: ['dragon', 'ground'], electabuzz: ['humanshape'], electrode: ['mineral'],
  elekid: ['no-eggs'], exeggcute: ['plant'], exeggutor: ['plant'],
  farfetchd: ['flying', 'ground'], fearow: ['flying'], flareon: ['ground'],
  gastly: ['indeterminate'], gengar: ['indeterminate'], geodude: ['mineral'],
  gloom: ['plant'], golbat: ['flying'], goldeen: ['water2'],
  golduck: ['ground', 'water1'], golem: ['mineral'], graveler: ['mineral'],
  grimer: ['indeterminate'], growlithe: ['ground'], gyarados: ['dragon', 'water2'],
  haunter: ['indeterminate'], hitmonchan: ['humanshape'], hitmonlee: ['humanshape'],
  horsea: ['dragon', 'water1'], hypno: ['humanshape'], igglybuff: ['no-eggs'],
  ivysaur: ['monster', 'plant'], jigglypuff: ['fairy'], jolteon: ['ground'],
  jynx: ['humanshape'], kabuto: ['water1', 'water3'], kabutops: ['water1', 'water3'],
  kadabra: ['humanshape'], kakuna: ['bug'], kangaskhan: ['monster'],
  kingler: ['water3'], koffing: ['indeterminate'], krabby: ['water3'],
  lapras: ['monster', 'water1'], lickitung: ['monster'], machamp: ['humanshape'],
  machoke: ['humanshape'], machop: ['humanshape'], magby: ['no-eggs'],
  magikarp: ['dragon', 'water2'], magmar: ['humanshape'], magnemite: ['mineral'],
  magneton: ['mineral'], mankey: ['ground'], marowak: ['monster'],
  meowth: ['ground'], metapod: ['bug'], mew: ['no-eggs'],
  mewtwo: ['no-eggs'], moltres: ['no-eggs'], mr_mime: ['humanshape'],
  muk: ['indeterminate'], nidoking: ['ground', 'monster'], nidoqueen: ['no-eggs'],
  nidoran_f: ['ground', 'monster'], nidoran_m: ['ground', 'monster'], nidorina: ['no-eggs'],
  nidorino: ['ground', 'monster'], ninetales: ['ground'], oddish: ['plant'],
  omanyte: ['water1', 'water3'], omastar: ['water1', 'water3'], onix: ['mineral'],
  paras: ['bug', 'plant'], parasect: ['bug', 'plant'], persian: ['ground'],
  pichu: ['no-eggs'], pidgeot: ['flying'], pidgeotto: ['flying'],
  pidgey: ['flying'], pikachu: ['fairy', 'ground'], pinsir: ['bug'],
  poliwag: ['water1'], poliwhirl: ['water1'], poliwrath: ['water1'],
  ponyta: ['ground'], porygon: ['mineral'], primeape: ['ground'],
  psyduck: ['ground', 'water1'], raichu: ['fairy', 'ground'], rapidash: ['ground'],
  raticate: ['ground'], rattata: ['ground'], rhydon: ['ground', 'monster'],
  rhyhorn: ['ground', 'monster'], sandshrew: ['ground'], sandslash: ['ground'],
  scyther: ['bug'], seadra: ['dragon', 'water1'], seaking: ['water2'],
  seel: ['ground', 'water1'], shellder: ['water3'], slowbro: ['monster', 'water1'],
  slowpoke: ['monster', 'water1'], snorlax: ['monster'], spearow: ['flying'],
  squirtle: ['monster', 'water1'], starmie: ['water3'], staryu: ['water3'],
  tangela: ['plant'], tauros: ['ground'], tentacool: ['water3'],
  tentacruel: ['water3'], togepi: ['no-eggs'], vaporeon: ['ground'],
  venomoth: ['bug'], venonat: ['bug'], venusaur: ['monster', 'plant'],
  victreebel: ['plant'], vileplume: ['plant'], voltorb: ['mineral'],
  vulpix: ['ground'], wartortle: ['monster', 'water1'], weedle: ['bug'],
  weepinbell: ['plant'], weezing: ['indeterminate'], wigglytuff: ['fairy'],
  zapdos: ['no-eggs'], zubat: ['flying'],
};

export const COMPAT_TEXT = {
  0: { label: '❌ Incompatibles', color: '#ff5252' },
  1: { label: '😐 Poco interés', color: '#ffb142' },
  2: { label: '🙂 Compatibles', color: '#33d9b2' },
  3: { label: '❤️ Muy compatibles', color: '#ff793f' },
};

export const EGG_GROUP_TRANSLATIONS = {
  'monster': 'Monstruo', 'water1': 'Agua 1', 'water2': 'Agua 2', 'water3': 'Agua 3',
  'bug': 'Bicho', 'flying': 'Volador', 'ground': 'Campo', 'fairy': 'Hada',
  'plant': 'Planta', 'humanshape': 'Humanoide', 'mineral': 'Mineral',
  'indeterminate': 'Amorfo', 'dragon': 'Dragón', 'ditto': 'Ditto', 'no-eggs': 'Desconocido'
};

export const EGG_MOVES_DB = {
  bulbasaur: ['leaf_storm', 'power_whip', 'ingrain'],
  charmander: ['dragon_rage', 'flare_blitz', 'dragon_dance'],
  squirtle: ['aqua_jet', 'mirror_coat', 'water_spout'],
  pikachu: ['volt_tackle', 'fake_out', 'encore'],
  eevee: ['wish', 'synchronoise', 'detect'],
  meowth: ['payday', 'hypnosis'],
  machop: ['dynamic_punch', 'bullet_punch'],
  gastly: ['perish_song', 'disable'],
  snorlax: ['pursuit', 'curse'],
  lapras: ['freeze_dry', 'ancient_power']
};

export const BABY_MAP = {
  pikachu:    'pichu',
  clefairy:   'cleffa',
  jigglypuff: 'igglybuff',
  electabuzz: 'elekid',
  magmar:     'magby',
};

export const EGG_SPAWN_INTERVAL_MS = {
  1: 14400000, // 4h
  2: 28800000, // 8h
  3: 43200000  // 12h
};
