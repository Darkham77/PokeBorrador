// scripts/e2e/fuzzer/scenarios/fuzzer_mechanics_scenarios.ts
import type { ScriptedScenario } from './fuzzer_ability_scenarios.ts';

export const MECHANICS_SCENARIOS: ScriptedScenario[] = [
  {
    name: 'Double KO via Explosion Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Exploder',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Explosion', 'Tackle', 'Pound', 'Scratch']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Fragile',
        species: 'Blissey',
        level: 1,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['Splash', 'Tackle', 'Pound', 'Scratch']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }
    ]
  },
  {
    name: 'Double KO with Bench Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Exploder',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Explosion', 'Tackle', 'Pound', 'Scratch']
      },
      {
        name: 'P-Bench1',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Pound', 'Scratch', 'Growl']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Fragile',
        species: 'Blissey',
        level: 1,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['Splash', 'Tackle', 'Pound', 'Scratch']
      },
      {
        name: 'E-Bench1',
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
      { p1: 'move 1', p2: 'move 1' },
      { p1: 'switch 2', p2: 'switch 2' },
      { p1: 'move 1', p2: 'move 1' }
    ]
  },
  {
    name: 'U-turn Switching Move Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Uturner',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['U-turn', 'Tackle', 'Pound', 'Scratch']
      },
      {
        name: 'P-Bench1',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle', 'Pound', 'Scratch', 'Growl']
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
      { p1: 'move 1', p2: 'move 1' },
      { p1: 'switch 2', p2: '' }, // p1 debe elegir cambio debido al efecto de U-turn; p2 no hace nada
      { p1: 'move 1', p2: 'move 1' }
    ]
  },
  {
    name: 'Forced Switch via Dragon Tail Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Tailer',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Dragon Tail', 'Tackle', 'Pound', 'Scratch']
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
        moves: ['Splash', 'Soft-Boiled', 'Tackle', 'Pound']
      },
      {
        name: 'E-Bench1',
        species: 'Blissey',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Splash', 'Soft-Boiled', 'Tackle', 'Pound']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Dragon Tail fuerza a salir a E-Bench1
      { p1: 'move 2', p2: 'move 1' }  // P-Tailer usa Tackle, E-Bench1 usa Splash
    ]
  },
  {
    name: 'Transform Copying Species Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Ditto',
        species: 'Ditto',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'Imposter',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Transform']
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
        moves: ['Soft-Boiled', 'Sunny Day', 'Rain Dance', 'Sandstorm']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 2' }, // Ditto se transforma en Blissey y copia Sunny Day
      { p1: 'move 2', p2: 'move 1' }  // Ditto usa Sunny Day, Blissey usa Soft-Boiled
    ]
  },
  {
    name: 'P1 Fainted Switch with Bench Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Fragile',
        species: 'Mew',
        level: 1,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['Splash']
      },
      {
        name: 'P-Bench1',
        species: 'Mew',
        level: 100,
        gender: 'M',
        item: '',
        ability: 'illuminate',
        nature: 'Serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
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
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey debilita a Mew nivel 1, FSM va a POKEMON_CALL
      { p1: 'switch 2', p2: '' },    // P1 elige cambiar a P-Bench1
      { p1: 'move 1', p2: 'move 1' }  // Turno normal
    ]
  }
];
