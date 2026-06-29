// scripts/battle-tester/ability-scenarios.ts
import type { PokemonSet } from '@pkmn/sim';

export interface ScriptedScenario {
  name: string;
  abilities: string[]; // Habilidades que este escenario intenta probar
  playerTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  actions: Array<{ p1: string; p2: string }>;
  /** Validación de éxito dinámica evaluando directamente el estado del simulador. */
  validate?: (simBattle: any) => boolean;
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
      return sim.p1.pokemon.some((p: any) => abilitiesSet.has(p.ability));
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
      return sim.p1.pokemon.some((p: any) => abilitiesSet.has(p.ability));
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
        item: '',
        ability: 'No Ability',
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
        gender: '',
        item: 'Sitrus Berry', // Requiere baya para Incinerate
        ability: 'No Ability',
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
        gender: '',
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
        gender: '',
        item: '',
        ability: 'No Ability',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }  // Falinks usa No Retreat (queda atrapado legalmente, termina el escenario)
    ]
  }
];
