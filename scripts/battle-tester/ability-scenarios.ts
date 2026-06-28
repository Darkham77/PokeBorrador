// scripts/battle-tester/ability-scenarios.ts
import type { PokemonSet } from '@pkmn/sim';

export interface ScriptedScenario {
  name: string;
  abilities: string[]; // Habilidades que este escenario intenta probar
  playerTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  actions: Array<{ p1: string; p2: string }>;
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
  }
];
