import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });

battle.setPlayer('p1', {
  name: 'Player',
  team: [{
    name: 'Smeargle',
    species: 'smeargle',
    level: 100,
    moves: ['sunnyday', 'reflect'],
    item: '',
    ability: 'owntempo',
    nature: 'Hardy',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  }],
});
battle.setPlayer('p2', {
  name: 'Enemy',
  team: [{
    name: 'Blissey',
    species: 'blissey',
    level: 100,
    moves: ['splash'],
    item: '',
    ability: 'naturalcure',
    nature: 'Hardy',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  }],
});

// Run turn 1: Sunny Day
console.log('--- TURN 1: Sunny Day ---');
battle.choose('p1', 'move 1');
battle.choose('p2', 'move 1');

console.log('Weather:', battle.field.weather);
console.log('Weather State:', JSON.stringify(battle.field.weatherState, null, 2));

// Run turn 2: Reflect
console.log('\n--- TURN 2: Reflect ---');
battle.choose('p1', 'move 2');
battle.choose('p2', 'move 1');

console.log('p1 Side Conditions:', Object.keys(battle.p1.sideConditions));
console.log('p1 Side Conditions Full:', JSON.stringify(battle.p1.sideConditions, null, 2));
