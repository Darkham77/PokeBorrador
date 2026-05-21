import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });
battle.setPlayer('p1', { team: [{ species: 'charizard', moves: ['doubleedge'], level: 50 }] });
battle.setPlayer('p2', { team: [{ species: 'blastoise', moves: ['dig', 'surf'], level: 50 }] });

console.log("Turn 1 - p2 activeRequest:", battle.p2.activeRequest);
battle.choose('p1', 'move 1');
battle.choose('p2', 'move 1');

console.log("Turn 2 - p2 activeRequest:", battle.p2.activeRequest);
console.log("Turn 2 - p1 activeRequest:", battle.p1.activeRequest);

