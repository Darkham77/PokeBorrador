import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });
battle.setPlayer('p1', { team: [{ species: 'charizard', moves: ['doubleedge'], level: 50 }] });
battle.setPlayer('p2', { team: [{ species: 'blastoise', moves: ['dig', 'surf'], level: 50 }] });

battle.choose('p1', 'move 1');
battle.choose('p2', 'move 1');

console.log("Turn 2 (Blastoise is underground)");
battle.choose('p1', 'move 1');
const p2Choice = battle.choose('p2', 'move 2');
console.log("P2 choice (move 2):", p2Choice);
if (!p2Choice) {
  console.log("P2 choice (default):", battle.choose('p2', 'default'));
}
console.log("Turn resolved?", battle.turn);
