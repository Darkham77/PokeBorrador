import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });
battle.setPlayer('p1', { team: [{ species: 'charizard', moves: ['beatup'], level: 50 }, { species: 'bulbasaur', moves: ['tackle'], level: 50 }] });
battle.setPlayer('p2', { team: [{ species: 'blastoise', moves: ['surf'], level: 50 }] });

battle.choose('p1', 'move 1');
battle.choose('p2', 'move 1');

console.log("Logs after turn 1:");
console.log(battle.log.filter(l => l.startsWith('|-activate') || l.startsWith('|move')));
