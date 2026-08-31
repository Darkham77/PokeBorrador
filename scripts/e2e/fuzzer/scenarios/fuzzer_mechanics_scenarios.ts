// scripts/e2e/fuzzer/scenarios/fuzzer_mechanics_scenarios.ts
import type { ScriptedScenario } from './fuzzer_ability_scenarios.ts';

export const MECHANICS_SCENARIOS: ScriptedScenario[] = [
  {
    name: 'Double KO via Explosion Scenario',
    abilities: [],
    playerTeam: [
      {
        name: 'P-Exploder',
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['explosion', 'tackle', 'pound', 'scratch']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Fragile',
        species: 'blissey',
        level: 1,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['splash', 'tackle', 'pound', 'scratch']
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
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['explosion', 'tackle', 'pound', 'scratch']
      },
      {
        name: 'P-Bench1',
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['tackle', 'pound', 'scratch', 'growl']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Fragile',
        species: 'blissey',
        level: 1,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['splash', 'tackle', 'pound', 'scratch']
      },
      {
        name: 'E-Bench1',
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['softboiled', 'sunnyday', 'raindance', 'sandstorm']
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
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['uturn', 'tackle', 'pound', 'scratch']
      },
      {
        name: 'P-Bench1',
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['tackle', 'pound', 'scratch', 'growl']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Dummy',
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['softboiled', 'sunnyday', 'raindance', 'sandstorm']
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
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['dragontail', 'tackle', 'pound', 'scratch']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Target',
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['splash', 'softboiled', 'tackle', 'pound']
      },
      {
        name: 'E-Bench1',
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['splash', 'softboiled', 'tackle', 'pound']
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
        species: 'ditto',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'imposter',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['transform']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Target',
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['softboiled', 'sunnyday', 'raindance', 'sandstorm']
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
        species: 'mew',
        level: 1,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['splash']
      },
      {
        name: 'P-Bench1',
        species: 'mew',
        level: 100,
        gender: 'N',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 252, spa: 252, spd: 252, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['tackle']
      }
    ],
    enemyTeam: [
      {
        name: 'E-Attacker',
        species: 'blissey',
        level: 100,
        gender: 'F',
        item: '',
        ability: 'illuminate',
        nature: 'serious',
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['tackle']
      }
    ],
    actions: [
      { p1: 'move 1', p2: 'move 1' }, // Blissey debilita a Mew nivel 1, FSM va a POKEMON_CALL
      { p1: 'switch 2', p2: '' },    // P1 elige cambiar a P-Bench1
      { p1: 'move 1', p2: 'move 1' }  // Turno normal
    ]
  }
];
