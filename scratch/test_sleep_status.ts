import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });

battle.setPlayer('p1', {
  name: 'Player',
  team: [{
    name: 'Smeargle',
    species: 'smeargle',
    level: 100,
    moves: ['spore'],
    item: '',
    ability: 'owntempo',
    nature: 'Hardy',
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
  }],
});

console.log('--- TURN 1: Spore ---');
battle.choose('p1', 'move 1');
battle.choose('p2', 'move 1');

const target = battle.p2.active[0];
console.log('Target Status:', target.status);
console.log('Target Status State:', JSON.stringify(target.statusState, null, 2));

// Run a few turns to see it change
console.log('\n--- TURN 2 ---');
battle.choose('p1', 'move 1'); // Fails because already asleep
battle.choose('p2', 'move 1');
console.log('Target Status State Turn 2:', JSON.stringify(target.statusState, null, 2));
