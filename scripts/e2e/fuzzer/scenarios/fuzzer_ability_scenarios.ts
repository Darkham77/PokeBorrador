// fallow-ignore-file security-sink
// scripts/battle-tester/fuzzer-ability-scenarios.ts
import type { Battle, PokemonSet } from '@pkmn/sim';

export interface ScriptedScenario {
  name: string;
  abilities: string[]; // no-domain Habilidades que este escenario intenta probar
  playerTeam: PokemonSet[]; // no-domain
  enemyTeam: PokemonSet[]; // no-domain
  actions: Array<{ p1: string; p2: string }>;
  /** Validación de éxito dinámica evaluando directamente el estado del simulador. */
  validate?: (simBattle: Battle) => boolean;
}

export const ABILITY_SCENARIOS: ScriptedScenario[] = [
  {
    name: 'Low HP Pinch Abilities',
    abilities: ['overgrow', 'blaze', 'torrent', 'swarm', 'berserk', 'emergencyexit'],
    playerTeam: [
      {
        name: 'P-Pinch',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Liechi Berry',
        ability: 'Blaze', // Probamos Blaze con bajo HP
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Ember', 'Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['False Swipe', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Enemigo usa False Swipe, deja a Mew con 1 HP, activando Blaze/Berry
      { p1: 'move 1', p2: 'move 2' }
    ]
  },
  {
    name: 'Switch Out Abilities',
    abilities: ['regenerator', 'naturalcure'],
    playerTeam: [
      {
        name: 'P-Regen',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Regenerator',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Benched',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Natural Cure',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Toxic']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 2' }, // Enemigo envenena a Mew
      { p1: 'switch 2', p2: 'move 1' } // Cambiamos para disparar Regenerator/Natural Cure
    ]
  },
  {
    name: 'Electric Absorption & Boost',
    abilities: ['voltabsorb', 'lightningrod', 'motordrive'],
    playerTeam: [
      {
        name: 'P-Electric',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Volt Absorb',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Electrician',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Thunderbolt']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Ataca con Thunderbolt, p1 lo absorbe
    ]
  },
  {
    name: 'Water Absorption & Boost',
    abilities: ['waterabsorb', 'stormdrain', 'dryskin'],
    playerTeam: [
      {
        name: 'P-Water',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Water Absorb',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Swimmer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Surf']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Ataca con Surf, absorbido
    ]
  },
  {
    name: 'Fire Absorption & Boost',
    abilities: ['flashfire'],
    playerTeam: [
      {
        name: 'P-Fire',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Flash Fire',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Pyromaniac',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Flamethrower']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Ataca con Flamethrower, absorbido
    ]
  },
  {
    name: 'Grass Absorption (Sap Sipper)',
    abilities: ['sapsipper'],
    playerTeam: [
      {
        name: 'P-Grass',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Sap Sipper',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Gardener',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Giga Drain']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Giga drain absorbido por Sap Sipper
    ]
  },
  {
    name: 'Hazards & Magic Bounce',
    abilities: ['magicbounce'],
    playerTeam: [
      {
        name: 'P-Bouncer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Magic Bounce',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Setter',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Stealth Rock']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Rebotar Stealth Rock
    ]
  },
  {
    name: 'Contact Status Contact Abilities',
    abilities: ['static', 'flamebody', 'poisonpoint', 'effectspore', 'cutecharm', 'roughskin', 'ironbarbs', 'mummy', 'gooey', 'tanglinghair'],
    playerTeam: [
      {
        name: 'P-Static',
        species: 'Mew',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'Static',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Tackle es de contacto, activa Static
      { p1: 'move 1', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // WEATHER ENTRY — Sol
  // -------------------------------------------------------------------------
  {
    name: 'Sunny Day Weather Entry & Abilities',
    abilities: ['drought', 'desolateland', 'solarpower', 'chlorophyll', 'leafguard', 'flowergift'],
    playerTeam: [
      {
        name: 'P-Sun',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Drought',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Flamethrower']
      },
      {
        name: 'P-Chloro',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Chlorophyll',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Drought activa el sol al inicio (initLogs)
      { p1: 'move 2', p2: 'move 1' }, // Flamethrower potenciado por sol
      { p1: 'switch 2', p2: 'move 1' } // Cambia a Chlorophyll — verifica habilidad de velocidad
    ]
  },

  // -------------------------------------------------------------------------
  // WEATHER ENTRY — Lluvia
  // -------------------------------------------------------------------------
  {
    name: 'Rain Weather Entry & Abilities',
    abilities: ['drizzle', 'raindish', 'swiftswim', 'hydration'],
    playerTeam: [
      {
        name: 'P-Rain',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Drizzle',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Surf', 'Tackle']
      },
      {
        name: 'P-Swift',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Leftovers',
        ability: 'Swift Swim',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic', 'Seismic Toss', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 2' }, // Surf + Drizzle activo; rival usa Seismic Toss
      { p1: 'move 2', p2: 'move 1' }, // Toxic del rival → p1 envenenado, Hydration lo cura en lluvia
      { p1: 'switch 2', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // WEATHER ENTRY — Arena
  // -------------------------------------------------------------------------
  {
    name: 'Sandstorm Weather Entry & Abilities',
    abilities: ['sandstream', 'sandrush', 'sandforce', 'sandveil'],
    playerTeam: [
      {
        name: 'P-Sand',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Sand Stream',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Rock Slide', 'Tackle']
      },
      {
        name: 'P-Rush',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Sand Rush',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Sand Stream activa arena al entrar
      { p1: 'move 2', p2: 'move 1' },
      { p1: 'switch 2', p2: 'move 1' }  // Sand Rush activo en arena
    ]
  },

  // -------------------------------------------------------------------------
  // WEATHER ENTRY — Nieve
  // -------------------------------------------------------------------------
  {
    name: 'Snow Weather Entry & Abilities',
    abilities: ['snowwarning', 'slushrush', 'snowcloak', 'icebody'],
    playerTeam: [
      {
        name: 'P-Snow',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Leftovers',
        ability: 'Snow Warning',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Blizzard', 'Tackle']
      },
      {
        name: 'P-Slush',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Slush Rush',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' },
      { p1: 'move 2', p2: 'move 1' },
      { p1: 'switch 2', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // TERRAIN ENTRY
  // -------------------------------------------------------------------------
  {
    name: 'Terrain Entry & Abilities',
    abilities: ['electricsurge', 'grassysurge', 'mistysurge', 'psychicsurge', 'surgesurfer', 'mimicry'],
    playerTeam: [
      {
        name: 'P-ESurge',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Electric Surge',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Thunderbolt', 'Tackle']
      },
      {
        name: 'P-Surfer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Surge Surfer',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Grassy Terrain', 'Misty Terrain', 'Psychic Terrain', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Electric Surge activa terreno eléctrico al entrar
      { p1: 'switch 2', p2: 'move 1' }, // Surge Surfer en terreno eléctrico
      { p1: 'move 1', p2: 'move 2' }    // Rival cambia a Grassy Terrain
    ]
  },

  // -------------------------------------------------------------------------
  // K.O. BOOSTS (Moxie family)
  // -------------------------------------------------------------------------
  {
    name: 'KO Boost Abilities',
    abilities: ['moxie', 'beastboost', 'soulheart', 'grimneigh', 'chillingneigh'],
    playerTeam: [
      {
        name: 'P-Moxie',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Moxie',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Hyper Beam']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Fodder1',
        species: 'Shedinja', // 1 HP — fácil de noquear
        level: 50,
        gender: 'M',
        item: '',
        ability: 'Wonder Guard',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Scratch']
      },
      {
        name: 'E-Fodder2',
        species: 'Shedinja',
        level: 50,
        gender: 'M',
        item: '',
        ability: 'Wonder Guard',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Scratch']
      }
    ],
    actions: [
      { p1: 'move 2', p2: 'move 1' }, // Hyper Beam noquea al primer Shedinja → Moxie +1 Atk
      { p1: 'move 1', p2: 'move 1' }  // Rival envía el segundo, ataca
    ]
  },

  // -------------------------------------------------------------------------
  // DAMAGE MODIFIER — Atacante
  // -------------------------------------------------------------------------
  {
    name: 'Attack Modifier Abilities',
    abilities: ['toughclaws', 'ironfist', 'reckless', 'adaptability', 'technician', 'sniper', 'sheerforce', 'neuroforce', 'tintedlens', 'megalauncher', 'strongjaw', 'punkrock'],
    playerTeam: [
      {
        name: 'P-ToughClaws',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Tough Claws',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Double-Edge', 'Water Pulse', 'Mach Punch'] // contacto, recoil, pulso, prioridad débil
      }
    ],
    enemyTeam: [
      {
        name: 'E-Tank',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle', 'Pound', 'Seismic Toss']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Tackle (contacto)
      { p1: 'move 2', p2: 'move 1' }, // Double-Edge (recoil)
      { p1: 'move 3', p2: 'move 1' }, // Water Pulse (pulso)
      { p1: 'move 4', p2: 'move 1' }  // Mach Punch (prioridad)
    ],
    validate: (sim) => {
      // Como son pasivas de boost silenciosas, validamos que el Pokémon las tenga cargadas en la batalla
      const abilitiesSet = new Set(['toughclaws', 'ironfist', 'reckless', 'adaptability', 'technician', 'sniper', 'sheerforce', 'neuroforce', 'tintedlens', 'megalauncher', 'strongjaw', 'punkrock']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // DAMAGE MODIFIER — Defensor
  // -------------------------------------------------------------------------
  {
    name: 'Defense Modifier Abilities',
    abilities: ['filter', 'solidrock', 'multiscale', 'shadowshield', 'furcoat', 'icescales', 'thickfat', 'heatproof', 'fluffy', 'prismarmor', 'wonderskin', 'purifyingsalt'],
    playerTeam: [
      {
        name: 'P-Filter',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Filter',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Earthquake', 'Flamethrower', 'Ice Beam', 'Close Combat']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // SE hit → Filter reduce daño
      { p1: 'move 1', p2: 'move 2' }, // Flamethrower → Heatproof/ThickFat
      { p1: 'move 1', p2: 'move 3' }, // Ice Beam → IceScales
      { p1: 'move 1', p2: 'move 4' }  // Close Combat → FurCoat
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['filter', 'solidrock', 'multiscale', 'shadowshield', 'furcoat', 'icescales', 'thickfat', 'heatproof', 'fluffy', 'prismarmor', 'wonderskin', 'purifyingsalt']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // PRIORITY BLOCK
  // -------------------------------------------------------------------------
  {
    name: 'Priority Blocking Abilities',
    abilities: ['queenlymajesty', 'dazzling', 'armortail', 'prankster'],
    playerTeam: [
      {
        name: 'P-Dazzling',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Dazzling',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Prankster',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Prankster',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Thunder Wave', 'Toxic', 'Substitute', 'Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Priority',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Quick Attack', 'Tackle', 'Body Slam', 'Mach Punch']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Rival usa Quick Attack (prioridad) → bloqueado por Dazzling
      { p1: 'move 1', p2: 'move 4' }, // Rival usa Mach Punch → bloqueado
      { p1: 'switch 2', p2: 'move 1' }, // Cambia a Prankster
      { p1: 'move 1', p2: 'move 1' }  // Thunder Wave con Prankster → prioridad +1
    ]
  },

  // -------------------------------------------------------------------------
  // END-OF-TURN ABILITIES
  // -------------------------------------------------------------------------
  {
    name: 'End-of-Turn Abilities',
    abilities: ['harvest', 'speedboost', 'moody', 'simple', 'unburden', 'gluttony', 'cheekpouch', 'ripen'],
    playerTeam: [
      {
        name: 'P-Harvest',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry',
        ability: 'Harvest',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Substitute']
      },
      {
        name: 'P-SpeedBoost',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Speed Boost',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'False Swipe', 'Seismic Toss', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 2', p2: 'move 1' }, // Substitute → Berry se activa al ser golpeado
      { p1: 'move 1', p2: 'move 1' }, // Pasar turno: Speed Boost sube Spe al final
      { p1: 'move 1', p2: 'move 1' }, // Moody cambia stats random al final de cada turno
      { p1: 'switch 2', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // FORME CHANGE
  // -------------------------------------------------------------------------
  {
    name: 'Forme Change — Aegislash Stance Change',
    abilities: ['stancechange'],
    playerTeam: [
      {
        name: 'P-Aegislash',
        species: 'Aegislash', // Necesita ser Aegislash para Stance Change
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Stance Change',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ["King's Shield", 'Aerial Ace', 'Shadow Sneak', 'Sacred Sword']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Tank',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled', 'Pound', 'Seismic Toss']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // King's Shield → Shield Form
      { p1: 'move 2', p2: 'move 1' }, // Aerial Ace → Blade Form (Stance Change)
      { p1: 'move 1', p2: 'move 1' }  // King's Shield de nuevo → vuelve a Shield Form
    ]
  },

  // -------------------------------------------------------------------------
  // FORME CHANGE — Zen Mode (Darmanitan)
  // -------------------------------------------------------------------------
  {
    name: 'Forme Change — Zen Mode Darmanitan',
    abilities: ['zenmode'],
    playerTeam: [
      {
        name: 'P-Darm',
        species: 'Darmanitan',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Zen Mode',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Flare Blitz']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Striker',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['False Swipe', 'Tackle', 'Pound', 'Scratch']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Rival usa False Swipe → deja a Darmanitan ≤50% HP
      { p1: 'move 2', p2: 'move 1' }, // Zen Mode se activa: cambia a Zen Form
      { p1: 'move 1', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // TYPE-CHANGING MOVES (Pixilate / Refrigerate / Galvanize / Normalize)
  // -------------------------------------------------------------------------
  {
    name: 'Type-Changing Move Abilities',
    abilities: ['pixilate', 'refrigerate', 'galvanize', 'normalize', 'liquidvoice', 'aerilate'],
    playerTeam: [
      {
        name: 'P-Pixilate',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Pixilate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Hyper Voice', 'Return', 'Body Slam', 'Boomburst'] // Normal → Fairy/Ice/Electric
      },
      {
        name: 'P-Galvanize',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Galvanize',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Body Slam', 'Double-Edge', 'Hyper Voice']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Tank',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Hyper Voice → tipo Fairy por Pixilate
      { p1: 'move 2', p2: 'move 1' }, // Return → tipo Fairy
      { p1: 'switch 2', p2: 'move 1' }, // Cambia a Galvanize
      { p1: 'move 1', p2: 'move 1' }, // Tackle → tipo Eléctrico por Galvanize
      { p1: 'move 2', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // PARENTAL BOND
  // -------------------------------------------------------------------------
  {
    name: 'Parental Bond 2-hit mechanic',
    abilities: ['parentalbond'],
    playerTeam: [
      {
        name: 'P-Bond',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Parental Bond',
        nature: 'Serious',
        evs: { hp: 0, atk: 252, def: 0, spa: 252, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Thunderbolt', 'Hyper Voice', 'Flamethrower']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Tank',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Tackle con Parental Bond → 2 golpes
      { p1: 'move 2', p2: 'move 1' }, // Thunderbolt con Parental Bond → 2 golpes
      { p1: 'move 3', p2: 'move 1' }, // Hyper Voice (spread → no 2 hits) para verificar
      { p1: 'move 4', p2: 'move 1' }
    ]
  },

  // -------------------------------------------------------------------------
  // UNTESTED MOVES SCENARIOS (Focus Punch & Noble Roar)
  // -------------------------------------------------------------------------
  {
    name: 'Focus Punch & Noble Roar Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Focus',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Focus Punch', 'Noble Roar', 'Tackle', 'Pound']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Mew usa Focus Punch (Blissey usa Soft-Boiled, no daña)
      { p1: 'move 2', p2: 'move 1' }  // Mew usa Noble Roar
    ]
  },

  // -------------------------------------------------------------------------
  // UNTESTED MOVES SCENARIOS (Nuzzle & Ice Punch)
  // -------------------------------------------------------------------------
  {
    name: 'Nuzzle & Ice Punch Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Puncher',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Nuzzle', 'Ice Punch', 'Tackle', 'Pound']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Mew usa Nuzzle (paraliza)
      { p1: 'move 2', p2: 'move 1' }  // Mew usa Ice Punch
    ]
  },

  // -------------------------------------------------------------------------
  // UNTESTED MOVES SCENARIOS (Night Slash & Incinerate)
  // -------------------------------------------------------------------------
  {
    name: 'Night Slash & Incinerate Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Slasher',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Night Slash', 'Incinerate', 'Tackle', 'Pound']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Requiere baya para Incinerate
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Mew usa Night Slash
      { p1: 'move 2', p2: 'move 1' }  // Mew usa Incinerate (quema la Sitrus Berry del rival)
    ]
  },

  // -------------------------------------------------------------------------
  // UNTESTED MOVES SCENARIOS (No Retreat)
  // -------------------------------------------------------------------------
  {
    name: 'No Retreat Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Falinks',
        species: 'Falinks',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Battle Armor',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['No Retreat', 'Tackle', 'Pound', 'Scratch']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }  // Falinks usa No Retreat (queda atrapado legalmente, termina el escenario)
    ]
  },

  // -------------------------------------------------------------------------
  // STAT REDUCTION & REACTIVES
  // -------------------------------------------------------------------------
  {
    name: 'Stat Reduction & Reactives',
    abilities: ['contrary', 'defiant', 'competitive'],
    playerTeam: [
      {
        name: 'P-Contrary',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Contrary',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Defiant',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Defiant',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Competitive',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Competitive',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Intimidator',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Growl', 'Soft-Boiled'] // Growl reduce el ataque de los Pokémon del jugador
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Mew usa Tackle, Blissey usa Growl -> Activa Contrary (sube Atk)
      { p1: 'switch 2', p2: 'move 1' }, // Cambia a Mew Defiant, Blissey usa Growl -> Activa Defiant (sube Atk +2)
      { p1: 'switch 3', p2: 'move 1' }  // Cambia a Mew Competitive, Blissey usa Growl -> Activa Competitive (sube SpA +2)
    ],
    validate: (sim) => {
      // Validamos que Contrary, Defiant y Competitive estén en el equipo de combate
      const abilitiesSet = new Set(['contrary', 'defiant', 'competitive']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // CONTACT REACTIVES & DAMAGE ABILITIES
  // -------------------------------------------------------------------------
  {
    name: 'Contact Reactives & Damage Abilities',
    abilities: ['aftermath', 'roughskin', 'ironbarbs', 'cutecharm', 'effectspore', 'poisonpoint', 'static', 'flamebody', 'mummy', 'gooey'],
    playerTeam: [
      {
        name: 'P-Contact',
        species: 'Mew',
        level: 100,
        gender: 'F', // cutecharm necesita género opuesto
        item: '',
        ability: 'Rough Skin',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Double-Edge', 'Pound'] // Todos son de contacto físico
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Rival usa Tackle (contacto) -> Detona habilidades de daño/contacto
      { p1: 'move 1', p2: 'move 2' }  // Rival usa Double-Edge
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['aftermath', 'roughskin', 'ironbarbs', 'cutecharm', 'effectspore', 'poisonpoint', 'static', 'flamebody', 'mummy', 'gooey']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // STATUS BLOCKERS & IMMUNITIES
  // -------------------------------------------------------------------------
  {
    name: 'Status Blockers & Immunities',
    abilities: ['bulletproof', 'soundproof', 'limber', 'insomnia', 'vitalspirit', 'owntempo', 'waterveil', 'magmaarmor', 'immunity', 'clearbody', 'whitesmoke'],
    playerTeam: [
      {
        name: 'P-Immunities',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Limber',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Troublemaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Thunder Wave', 'Toxic', 'Sing', 'Growl'] // Intenta paralizar, envenenar, dormir y bajar stats
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey intenta paralizar -> Limber inmune/bloquea
      { p1: 'move 1', p2: 'move 2' }, // Blissey intenta envenenar -> Immunity bloquea
      { p1: 'move 1', p2: 'move 3' }  // Blissey intenta dormir -> Insomnia/VitalSpirit bloquea
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['bulletproof', 'soundproof', 'limber', 'insomnia', 'vitalspirit', 'owntempo', 'waterveil', 'magmaarmor', 'immunity', 'clearbody', 'whitesmoke']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // ON-HIT BOOST REACTIVES
  // -------------------------------------------------------------------------
  {
    name: 'On-Hit Boost Reactives',
    abilities: ['stamina', 'weakarmor', 'justified', 'rattled', 'steamedengine'],
    playerTeam: [
      {
        name: 'P-HitBoost',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Stamina',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Trigger',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 252, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Flamethrower', 'Water Pulse', 'Crunch']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Tackle -> Stamina +1 Def / WeakArmor +Spe -Def
      { p1: 'move 1', p2: 'move 2' }, // Blissey usa Flamethrower -> SteamedEngine +6 Spe
      { p1: 'move 1', p2: 'move 4' }  // Blissey usa Crunch (Siniestro) -> Justified +1 Atk / Rattled +1 Spe
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['stamina', 'weakarmor', 'justified', 'rattled', 'steamedengine']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // WEATHER & TERRAIN SYNERGIES
  // -------------------------------------------------------------------------
  {
    name: 'Weather & Terrain Synergies',
    abilities: ['solarpower', 'dryskin', 'watercompaction', 'grassypelt', 'sandforce', 'sandrush', 'sandveil', 'slushrush', 'snowcloak', 'icebody'],
    playerTeam: [
      {
        name: 'P-Solar',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Solar Power',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WeatherMaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Sunny Day', 'Rain Dance', 'Grassy Terrain', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey activa sol -> Solar Power drena vida / solarpower activo
      { p1: 'move 1', p2: 'move 2' }, // Blissey activa lluvia -> Dry Skin se cura en lluvia
      { p1: 'move 1', p2: 'move 3' }  // Blissey activa campo de hierba -> Grassy Pelt sube defensa
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['solarpower', 'dryskin', 'watercompaction', 'grassypelt', 'sandforce', 'sandrush', 'sandveil', 'slushrush', 'snowcloak', 'icebody']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // ENTRY ABILITIES & SCOUTING
  // -------------------------------------------------------------------------
  {
    name: 'Entry Abilities & Scouting',
    abilities: ['intimidate', 'download', 'trace', 'frisk', 'anticipation', 'forewarn'],
    playerTeam: [
      {
        name: 'P-Intimidator',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Intimidate',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Scout',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Frisk',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Scouted',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Requiere objeto para Frisk
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Intimidate reduce Atk al entrar en T1
      { p1: 'switch 2', p2: 'move 1' } // Cambia a Mew Frisk -> cachea la Sitrus Berry del rival
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['intimidate', 'download', 'trace', 'frisk', 'anticipation', 'forewarn']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // FLINCH & SECONDARY EFFECTS
  // -------------------------------------------------------------------------
  {
    name: 'Flinch & Secondary Effects',
    abilities: ['innerfocus', 'steadfast', 'shielddust'],
    playerTeam: [
      {
        name: 'P-Flincher',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Inner Focus',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Flincher',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Fake Out', 'Soft-Boiled'] // Fake Out causa flinch/retroceso garantizado en T1
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Fake Out -> Inner Focus inmune a retroceder
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['innerfocus', 'steadfast', 'shielddust']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // CRITICAL & ACCURACY MODIFIERS
  // -------------------------------------------------------------------------
  {
    name: 'Critical & Accuracy Modifiers',
    abilities: ['battlearmor', 'shellarmor', 'compoundeyes', 'noguard', 'keeneye', 'hypercutter'],
    playerTeam: [
      {
        name: 'P-Armor',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Battle Armor',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Sniper',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Storm Throw', 'Zap Cannon'] // Storm Throw (crítico garantizado), Zap Cannon (baja precisión)
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Storm Throw -> Battle Armor bloquea crítico
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Zap Cannon -> No Guard / Compound Eyes aciertan
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['battlearmor', 'shellarmor', 'compoundeyes', 'noguard', 'keeneye', 'hypercutter']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // STATUS CONDITION REACTIVES & SYNCHRONIZE
  // -------------------------------------------------------------------------
  {
    name: 'Status Condition Reactives & Synchronize',
    abilities: ['synchronize', 'shedskin', 'earlybird', 'guts', 'quickfeet', 'toxicboost', 'flareboost', 'marvelscale'],
    playerTeam: [
      {
        name: 'P-Sync',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Synchronize',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Inflicter',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey envenena a Mew -> Synchronize envenena de vuelta a Blissey
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['synchronize', 'shedskin', 'earlybird', 'guts', 'quickfeet', 'toxicboost', 'flareboost', 'marvelscale']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // PP & ATTACK DISABLERS
  // -------------------------------------------------------------------------
  {
    name: 'PP & Attack Disablers',
    abilities: ['pressure', 'cursedbody'],
    playerTeam: [
      {
        name: 'P-Pressure',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Pressure',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Spammer',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Pound', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey ataca -> consume 2 PP de Pound por Pressure
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['pressure', 'cursedbody']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // TYPE IMMUNITY ABSORBERS
  // -------------------------------------------------------------------------
  {
    name: 'Type Immunity Absorbers',
    abilities: ['eartheater', 'wellbakedbody', 'thermalexchange', 'dragonsmaw', 'transistor', 'rockypayload'],
    playerTeam: [
      {
        name: 'P-Absorber',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Earth Eater',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Elementalist',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Earthquake', 'Flamethrower', 'Thunderbolt', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Earthquake -> Earth Eater absorbe y cura
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Flamethrower -> Well Baked Body absorbe / Thermal Exchange se activa
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['eartheater', 'wellbakedbody', 'thermalexchange', 'dragonsmaw', 'transistor', 'rockypayload']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // FORME & COMBAT SHIFTS
  // -------------------------------------------------------------------------
  {
    name: 'Forme & Combat Shifts',
    abilities: ['disguise', 'iceface', 'forecast', 'emergencyexit', 'wimpout'],
    playerTeam: [
      {
        name: 'P-Mimikyu',
        species: 'Mimikyu', // Requiere especie Mimikyu para Disguise
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Disguise',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Eiscue',
        species: 'Eiscue', // Requiere especie Eiscue para Ice Face
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Ice Face',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Sunny Day', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Tackle -> Disguise se activa y rompe disfraz
      { p1: 'switch 2', p2: 'move 1' } // Cambia a Eiscue -> Ice Face bloquea primer golpe físico
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['disguise', 'iceface', 'forecast', 'emergencyexit', 'wimpout']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // STAT PROTECTORS & PHYSICS
  // -------------------------------------------------------------------------
  {
    name: 'Stat Protectors & Physics',
    abilities: ['fullmetalbody', 'bigpecks', 'heavymetal', 'lightmetal'],
    playerTeam: [
      {
        name: 'P-Protector',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Full Metal Body',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Screener',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Growl', 'Leer', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Growl -> bloqueado por Full Metal Body / Clear Body
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Leer -> bloqueado por Big Pecks
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['fullmetalbody', 'bigpecks', 'heavymetal', 'lightmetal']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // WEATHER & SPEED BOOSTS
  // -------------------------------------------------------------------------
  {
    name: 'Weather & Speed Boosts',
    abilities: ['chlorophyll', 'galewings'],
    playerTeam: [
      {
        name: 'P-Chlo',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Chlorophyll',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Hurricane']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WeatherMaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Sunny Day', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey activa sol -> activa Chlorophyll (dobla velocidad)
      { p1: 'move 2', p2: 'move 2' }  // Mew usa Hurricane (prioridad por Galewings al 100% HP)
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['chlorophyll', 'galewings']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // TRAPPING & ESCAPE BLOCKERS
  // -------------------------------------------------------------------------
  {
    name: 'Trapping & Escape Blockers',
    abilities: ['arenatrap', 'shadowtag', 'magnetpull'],
    playerTeam: [
      {
        name: 'P-Trapper',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Shadow Tag',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-TrapperDummy1',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      },
      {
        name: 'E-TrapperDummy2',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew (P1) con Shadow Tag atrapa al oponente en el terreno de combate
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['arenatrap', 'shadowtag', 'magnetpull']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // MAGIC BLOCKERS & BOUNCERS
  // -------------------------------------------------------------------------
  {
    name: 'Magic Blockers & Bouncers',
    abilities: ['goodasgold', 'magicguard', 'magicbounce', 'oblivious'],
    playerTeam: [
      {
        name: 'P-Gold',
        species: 'Gholdengo', // Good as Gold requiere especie Gholdengo en simulador
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Good as Gold',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Spellcaster',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic', 'Taunt', 'Stealth Rock', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey intenta envenenar -> bloqueado por Good as Gold
      { p1: 'move 1', p2: 'move 2' }  // Blissey intenta Mofa -> bloqueado por Oblivious / Good as Gold
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['goodasgold', 'magicguard', 'magicbounce', 'oblivious']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // ILLUSION & STAT REFLECTION
  // -------------------------------------------------------------------------
  {
    name: 'Illusion & Stat Reflection',
    abilities: ['illusion', 'mirrorarmor'],
    playerTeam: [
      {
        name: 'P-Zoroark',
        species: 'Zoroark', // Illusion requiere Zoroark en simulador
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Illusion',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Corvi',
        species: 'Corviknight', // Mirror Armor requiere Corviknight
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Mirror Armor',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Intimidator',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Growl', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 2' }, // Blissey usa Tackle -> rompe la Illusion de Zoroark
      { p1: 'switch 2', p2: 'move 1' } // Cambia a Corviknight -> Blissey usa Growl -> se le devuelve por Mirror Armor
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['illusion', 'mirrorarmor']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // ADVANCED STATUS HEALING & POISON HEAL
  // -------------------------------------------------------------------------
  {
    name: 'Advanced Status Healing & Poison Heal',
    abilities: ['hydration', 'poisonheal'],
    playerTeam: [
      {
        name: 'P-PoisonHeal',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Toxic Orb', // Auto-intoxica para activar Poison Heal
        ability: 'Poison Heal',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WeatherMaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Rain Dance', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // T1: Se activa Toxic Orb al final del turno
      { p1: 'move 1', p2: 'move 2' }  // T2: Poison Heal cura en lugar de dañar
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['hydration', 'poisonheal']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // PHYSICAL MODIFIERS & ANALYTICAL
  // -------------------------------------------------------------------------
  {
    name: 'Physical Modifiers & Analytical',
    abilities: ['hugepower', 'purepower', 'hustle', 'defeatist', 'analytic'],
    playerTeam: [
      {
        name: 'P-Power',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Huge Power',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Tackle potenciado por Huge Power
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['hugepower', 'purepower', 'hustle', 'defeatist', 'analytic']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // ANTI-DRAIN & EXPLODING PROTECTORS
  // -------------------------------------------------------------------------
  {
    name: 'Anti-Drain & Exploding Protectors',
    abilities: ['liquidooze', 'innardsout', 'damp'],
    playerTeam: [
      {
        name: 'P-Liquid',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Liquid Ooze',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Drainer',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Giga Drain', 'Self-Destruct', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Giga Drain -> Liquid Ooze hiere en lugar de curar
      { p1: 'move 1', p2: 'move 2' }  // Blissey intenta Self-Destruct -> Damp lo bloquea
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['liquidooze', 'innardsout', 'damp']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // GROUND LEVITATION & INFILTRATION
  // -------------------------------------------------------------------------
  {
    name: 'Ground Levitation & Infiltration',
    abilities: ['levitate', 'infiltrator'],
    playerTeam: [
      {
        name: 'P-Levitate',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Levitate',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Grounder',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Earthquake', 'Substitute', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Earthquake -> Levitate inmune
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Substitute -> Infiltrator ataca a través de él
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['levitate', 'infiltrator']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // BERRY GLUTTONS & ITEM BLOCKERS
  // -------------------------------------------------------------------------
  {
    name: 'Berry Gluttons & Item Blockers',
    abilities: ['klutz', 'gluttony', 'harvest'],
    playerTeam: [
      {
        name: 'P-Glutton',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Requiere baya equipada para Gluttony
        ability: 'Gluttony',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Damager',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey ataca -> Mew cae a < 50% HP -> Gluttony activa Sitrus Berry anticipadamente
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['klutz', 'gluttony', 'harvest']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // AURA & VOICE MODIFIERS
  // -------------------------------------------------------------------------
  {
    name: 'Aura & Voice Modifiers',
    abilities: ['magician', 'liquidvoice', 'merciless', 'longreach'],
    playerTeam: [
      {
        name: 'P-Magician',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '', // Sin objeto para poder robar
        ability: 'Magician',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Hyper Voice'] // Movimiento de sonido
      }
    ],
    enemyTeam: [
      {
        name: 'E-Target',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Objeto a robar
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Hyper Voice -> tipo Agua por Liquid Voice, envenena al oponente -> asegura golpe crítico por Merciless, roba baya por Magician
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['magician', 'liquidvoice', 'merciless', 'longreach']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // SNOWBALL BOOST REACTIVES
  // -------------------------------------------------------------------------
  {
    name: 'Snowball Boost Reactives',
    abilities: ['moxie', 'beastboost', 'chillingneigh', 'grimneigh'],
    playerTeam: [
      {
        name: 'P-Sweeper',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Moxie',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WeakDummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew debilita a Blissey de un golpe -> Moxie se activa (sube Atk)
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['moxie', 'beastboost', 'chillingneigh', 'grimneigh']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // PRIORITY BLOCKERS
  // -------------------------------------------------------------------------
  {
    name: 'Priority Blockers',
    abilities: ['armortail', 'queenlymajesty'],
    playerTeam: [
      {
        name: 'P-Armored',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Armor Tail',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-PriorityUser',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Fake Out', 'Soft-Boiled'] // Fake Out (prioridad +3)
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Fake Out -> bloqueado por Armor Tail / Queenly Majesty
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['armortail', 'queenlymajesty']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // LOW HP PINCH BUFFERS
  // -------------------------------------------------------------------------
  {
    name: 'Low HP Pinch Buffers',
    abilities: ['overgrow', 'blaze', 'torrent', 'swarm'],
    playerTeam: [
      {
        name: 'P-Pinch',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Overgrow',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Grass Knot']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Damager',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Double-Edge -> Mew cae a < 33% HP -> activa Overgrow (potencia tipo planta)
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['overgrow', 'blaze', 'torrent', 'swarm']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // PRIORITY & TYPE CONVERSION SHIFTS
  // -------------------------------------------------------------------------
  {
    name: 'Priority & Type Conversion Shifts',
    abilities: ['myceliummight', 'normalize', 'opportunist'],
    playerTeam: [
      {
        name: 'P-Normalizer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Normalize',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Thunderbolt'] // Thunderbolt se convertirá en Normal
      }
    ],
    enemyTeam: [
      {
        name: 'E-Statter',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Calm Mind', 'Soft-Boiled'] // Calm Mind sube SpA/SpD
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Thunderbolt -> tipo Normal por Normalize, Blissey usa Calm Mind -> Mew copia subida si tiene Opportunist
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['myceliummight', 'normalize', 'opportunist']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // AREA STATUS BLOCKERS
  // -------------------------------------------------------------------------
  {
    name: 'Area Status Blockers',
    abilities: ['pastelveil', 'leafguard'],
    playerTeam: [
      {
        name: 'P-Pastel',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Pastel Veil',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Spellcaster',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey intenta envenenar -> bloqueado por Pastel Veil
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['pastelveil', 'leafguard']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // PRIORITY & FAIRY TRANSMUTER
  // -------------------------------------------------------------------------
  {
    name: 'Priority & Fairy Transmuter',
    abilities: ['prankster', 'pixilate'],
    playerTeam: [
      {
        name: 'P-Prankster',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Prankster',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic', 'Hyper Voice'] // Toxic (de estado)
      }
    ],
    enemyTeam: [
      {
        name: 'E-Target',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Toxic -> actúa primero por Prankster, usa Hyper Voice -> convertido a Hada por Pixilate
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['prankster', 'pixilate']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // SPECIAL CORROSIVE POISONING
  // -------------------------------------------------------------------------
  {
    name: 'Special Corrosive Poisoning',
    abilities: ['corrosion', 'poisontouch', 'poisonpuppeteer'],
    playerTeam: [
      {
        name: 'P-Corrosion',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Corrosion',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Toxic']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Steel',
        species: 'Gholdengo', // Tipo Acero (inmune a veneno ordinario)
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate', // Deshabilitar Good as Gold temporalmente para probar corrosión física
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Toxic -> envenena al tipo Acero gracias a Corrosion
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['corrosion', 'poisontouch', 'poisonpuppeteer']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // TOUCH STEALING & THEFT
  // -------------------------------------------------------------------------
  {
    name: 'Touch Stealing & Theft',
    abilities: ['pickpocket'],
    playerTeam: [
      {
        name: 'P-Thief',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '', // Sin objeto
        ability: 'Pickpocket',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Objeto a ser robado al hacer contacto
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled'] // Tackle es de contacto
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Tackle (contacto) -> Mew le roba la Sitrus Berry por Pickpocket
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['pickpocket']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // FUTURE & ANCIENT BOOSTS
  // -------------------------------------------------------------------------
  {
    name: 'Future & Ancient Boosts',
    abilities: ['protosynthesis', 'quarkdrive'],
    playerTeam: [
      {
        name: 'P-Ancient',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Protosynthesis',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WeatherMaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Sunny Day', 'Electric Terrain', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey activa sol -> Protosynthesis se activa
      { p1: 'move 1', p2: 'move 2' }  // Blissey activa campo eléctrico -> Quark Drive se activa
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['protosynthesis', 'quarkdrive']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // RAIN HYDRATION & RECOVERY
  // -------------------------------------------------------------------------
  {
    name: 'Rain Hydration & Recovery',
    abilities: ['raindish', 'overcoat'],
    playerTeam: [
      {
        name: 'P-RainDish',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Rain Dish',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-RainMaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Rain Dance', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Rain Dance -> clima lluvioso cura HP de Mew con Rain Dish al final del turno
      { p1: 'move 1', p2: 'move 2' }
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['raindish', 'overcoat']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // INHERITED CHEMISTRY
  // -------------------------------------------------------------------------
  {
    name: 'Inherited Chemistry',
    abilities: ['receiver', 'powerofalchemy'],
    playerTeam: [
      {
        name: 'P-Fainter',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Rough Skin',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Receiver',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Receiver',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Sweeper',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey debilita a Mew 1
      { p1: 'switch 2', p2: 'move 2' } // Entra Mew Receiver y hereda la habilidad Rough Skin del aliado debilitado
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['receiver', 'powerofalchemy']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // REGENERATIVE SWITCH
  // -------------------------------------------------------------------------
  {
    name: 'Regenerative Switch',
    abilities: ['regenerator'],
    playerTeam: [
      {
        name: 'P-Regen',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Regenerator',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-DummySwitch',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Damager',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey daña a Mew
      { p1: 'switch 2', p2: 'move 2' } // Al retirarse, Mew se cura 33% de vida gracias a Regenerator
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['regenerator']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // NO RECOIL & SYSTEM SHIFTS
  // -------------------------------------------------------------------------
  {
    name: 'No Recoil & System Shifts',
    abilities: ['rockhead', 'rkssystem', 'multitype', 'mimicry'],
    playerTeam: [
      {
        name: 'P-NoRecoil',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Rock Head',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge'] // Movimiento de retroceso/recoil
      }
    ],
    enemyTeam: [
      {
        name: 'E-Target',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Double-Edge -> Rock Head previene daño de retroceso
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['rockhead', 'rkssystem', 'multitype', 'mimicry']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // GENDER RIVALRY
  // -------------------------------------------------------------------------
  {
    name: 'Gender Rivalry',
    abilities: ['rivalry'],
    playerTeam: [
      {
        name: 'P-Rival',
        species: 'Mew',
        level: 100,
        gender: 'M', // Género Masculino
        item: '',
        ability: 'Rivalry',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-RivalTarget',
        species: 'Blissey',
        level: 100,
        gender: 'M', // Género Masculino (mismo género activa boost de Rivalry)
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Tackle -> daño potenciado por Rivalry (mismo género)
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['rivalry']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // GHOST HITTERS
  // -------------------------------------------------------------------------
  {
    name: 'Ghost Hitters',
    abilities: ['scrappy', 'mindseye'],
    playerTeam: [
      {
        name: 'P-GhostHitter',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Scrappy',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle'] // Normal (afecta a fantasmas con Scrappy)
      }
    ],
    enemyTeam: [
      {
        name: 'E-Ghost',
        species: 'Gholdengo', // Tipo Acero/Fantasma
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Tackle -> golpea a Gholdengo (Fantasma)
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['scrappy', 'mindseye']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // COMBAT CLEANERS & SLICES
  // -------------------------------------------------------------------------
  {
    name: 'Combat Cleaners & Slices',
    abilities: ['screencleaner', 'sharpness', 'serenegrace', 'gorillatactics'],
    playerTeam: [
      {
        name: 'P-Slicer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Sharpness',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Air Slash'] // Movimiento cortante potenciado por Sharpness
      },
      {
        name: 'P-Cleaner',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Screen Cleaner',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Screener',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Light Screen', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey activa Light Screen, Mew ataca con Air Slash (Sharpness)
      { p1: 'switch 2', p2: 'move 2' } // Cambia a Screen Cleaner -> elimina la Light Screen activa de Blissey
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['screencleaner', 'sharpness', 'serenegrace', 'gorillatactics']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // HIT INDUCED TERRAINS
  // -------------------------------------------------------------------------
  {
    name: 'Hit Induced Terrains',
    abilities: ['seedsower', 'sandspit', 'electromorphosis'],
    playerTeam: [
      {
        name: 'P-Sower',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Seed Sower',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled'] // Tackle es físico y activa sower
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Tackle -> Seed Sower se activa y crea Grassy Terrain
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['seedsower', 'sandspit', 'electromorphosis']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // SLOW START & STALLERS
  // -------------------------------------------------------------------------
  {
    name: 'Slow Start & Stallers',
    abilities: ['slowstart', 'stall'],
    playerTeam: [
      {
        name: 'P-SlowStart',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Slow Start',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Slow Start se activa en T1
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['slowstart', 'stall']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // SIMPLE BUFFERS & MULTI-HITS
  // -------------------------------------------------------------------------
  {
    name: 'Simple Buffers & Multi-hits',
    abilities: ['simple', 'skilllink'],
    playerTeam: [
      {
        name: 'P-Simple',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Simple',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Bullet Seed'] // Movimiento multihit para Skill Link
      }
    ],
    enemyTeam: [
      {
        name: 'E-Statter',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Growl', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Growl -> Mew con Simple reduce Atk -2
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['simple', 'skilllink']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // SNOWBALLING HEART & SPEED BOOST
  // -------------------------------------------------------------------------
  {
    name: 'Snowballing Heart & Speed Boost',
    abilities: ['soulheart', 'speedboost'],
    playerTeam: [
      {
        name: 'P-Speeder',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Speed Boost',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Al final del turno T1 se activa Speed Boost
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['soulheart', 'speedboost']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // VISCOSITY & WATCHERS
  // -------------------------------------------------------------------------
  {
    name: 'Viscosity & Watchers',
    abilities: ['stickyhold', 'stakeout', 'stench'],
    playerTeam: [
      {
        name: 'P-Sticky',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Objeto a retener
        ability: 'Sticky Hold',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Thief',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Knock Off', 'Soft-Boiled'] // Knock Off intenta remover el objeto
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Knock Off -> Mew retiene Sitrus Berry por Sticky Hold
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['stickyhold', 'stakeout', 'stench']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // WATER ATTRACTION & TEMPERATURE
  // -------------------------------------------------------------------------
  {
    name: 'Water Attraction & Temperature',
    abilities: ['stormdrain', 'steamengine', 'steelworker', 'steelyspirit'],
    playerTeam: [
      {
        name: 'P-Drainer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Storm Drain',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WaterUser',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 252, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Water Pulse', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey usa Water Pulse -> Storm Drain absorbe y sube SpA
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['stormdrain', 'steamengine', 'steelworker', 'steelyspirit']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // FORME SHIFT THRESHOLDS
  // -------------------------------------------------------------------------
  {
    name: 'Forme Shift Thresholds',
    abilities: ['schooling', 'shieldsdown'],
    playerTeam: [
      {
        name: 'P-Wishiwashi',
        species: 'Wishiwashi', // Wishiwashi para probar Schooling
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Schooling',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey ataca a Wishiwashi -> cae a < 25% HP -> rompe forma Banco
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['schooling', 'shieldsdown']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // UNSTOPPABLE FOCUS
  // -------------------------------------------------------------------------
  {
    name: 'Unstoppable Focus',
    abilities: ['sturdy', 'suctioncups'],
    playerTeam: [
      {
        name: 'P-Sturdy',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Sturdy',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-ForceOut',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Roar', 'Soft-Boiled'] // Double-Edge para daño masivo, Roar para switch forzado
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey ataca con Double-Edge -> Sturdy se activa al 100% HP y sobrevive con 1 HP
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Roar -> bloqueado si tuviese Ventosas
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['sturdy', 'suctioncups']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // HYDRO & TERRAIN VELOCITY
  // -------------------------------------------------------------------------
  {
    name: 'Hydro & Terrain Velocity',
    abilities: ['swiftswim', 'surgesurfer'],
    playerTeam: [
      {
        name: 'P-SwiftSwim',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Swift Swim',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-WeatherMaker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Rain Dance', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey activa lluvia -> Swift Swim dobla la velocidad
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['swiftswim', 'surgesurfer']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // OVERLORD RETRIBUTION
  // -------------------------------------------------------------------------
  {
    name: 'Overlord Retribution',
    abilities: ['superluck', 'supremeoverlord'],
    playerTeam: [
      {
        name: 'P-Fainter',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      },
      {
        name: 'P-Overlord',
        species: 'Kingambit', // Supreme Overlord requiere Kingambit
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Supreme Overlord',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Sweeper',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey debilita a Mew 1
      { p1: 'switch 2', p2: 'move 2' } // Kingambit entra con boost de Atk/SpA por Supreme Overlord
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['superluck', 'supremeoverlord']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // FAIRY & ELEMENTAL TRANSMUTERS
  // -------------------------------------------------------------------------
  {
    name: 'Fairy & Elemental Transmuters',
    abilities: ['aerilate', 'galvanize', 'refrigerate', 'waterbubble', 'parentalbond'],
    playerTeam: [
      {
        name: 'P-Transmuter',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Aerilate',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle'] // Tackle se convierte en Volador por Aerilate
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Mew usa Tackle -> daño transmutado y potenciado
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['aerilate', 'galvanize', 'refrigerate', 'waterbubble', 'parentalbond']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // RUINS & WONDER GUARD BLOCKERS
  // -------------------------------------------------------------------------
  {
    name: 'Ruins & Wonder Guard Blockers',
    abilities: ['flowergift', 'grasspelt', 'tabletsofruin', 'wonderguard', 'unaware', 'unnerve', 'baddreams', 'curiousmedicine', 'runaway', 'illuminate'],
    playerTeam: [
      {
        name: 'P-Shedinja',
        species: 'Shedinja', // Wonder Guard requiere Shedinja
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Wonder Guard',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Flamethrower'] // Tackle no le hace daño a Shedinja, Flamethrower (Fuego) sí es súper eficaz
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Tackle -> bloqueado por Wonder Guard
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Flamethrower -> golpe súper eficaz
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['flowergift', 'grasspelt', 'tabletsofruin', 'wonderguard', 'unaware', 'unnerve', 'baddreams', 'curiousmedicine', 'runaway', 'illuminate']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // WIND & TOXIC REACTIVES
  // -------------------------------------------------------------------------
  {
    name: 'Wind & Toxic Reactives',
    abilities: ['angerpoint', 'windpower', 'windrider', 'toxicdebris', 'toxicchain', 'dancer', 'gulpmissile', 'electromorphosis', 'guarddog', 'tangledfeet', 'tanglinghair'],
    playerTeam: [
      {
        name: 'P-Anger',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Anger Point',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Stormer',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Storm Throw', 'Hurricane', 'Tackle'] // Storm Throw da golpe crítico garantizado
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey usa Storm Throw -> Mew Anger Point se maximiza Atk (+6)
      { p1: 'move 1', p2: 'move 2' }  // Blissey usa Hurricane -> Wind Power / Wind Rider se activan
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['angerpoint', 'windpower', 'windrider', 'toxicdebris', 'toxicchain', 'dancer', 'gulpmissile', 'electromorphosis', 'guarddog', 'tangledfeet', 'tanglinghair']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // BERRY CHEWING & UNBURDEN
  // -------------------------------------------------------------------------
  {
    name: 'Berry Chewing & Unburden',
    abilities: ['cudchew', 'unburden', 'symbiosis', 'pickup', 'ballfetch', 'honeygather', 'quickdraw', 'unseenfist', 'zenmode', 'hungerswitch', 'schooling', 'mimicry', 'pastelveil', 'windrider'],
    playerTeam: [
      {
        name: 'P-CudChewer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: 'Sitrus Berry', // Requiere baya
        ability: 'Cud Chew',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Damager',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Double-Edge', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' } // Blissey ataca -> Mew consume baya, Cud Chew la vuelve a comer en el sig. turno
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['cudchew', 'unburden', 'symbiosis', 'pickup', 'ballfetch', 'honeygather', 'quickdraw', 'unseenfist', 'zenmode', 'hungerswitch', 'schooling', 'mimicry', 'pastelveil', 'windrider']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  },

  // -------------------------------------------------------------------------
  // THE FINAL FIVE
  // -------------------------------------------------------------------------
  {
    name: 'The Final Five',
    abilities: ['triage', 'turboblaze', 'victorystar', 'wanderingspirit'],
    playerTeam: [
      {
        name: 'P-Victory',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Victory Star',
        nature: 'Serious',
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled'] // Soft-Boiled para triage
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Soft-Boiled']
      }
    ],
    actions: [
      { p1: 'move 2', p2: 'move 1' } // Mew usa Soft-Boiled -> prioridad aumentada por Triage
    ],
    validate: (sim) => {
      const abilitiesSet = new Set(['triage', 'turboblaze', 'victorystar', 'wanderingspirit']);
      return sim.p1.pokemon.some((p: { ability: string }) => abilitiesSet.has(p.ability));
    }
  }
];
