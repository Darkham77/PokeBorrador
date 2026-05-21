import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });

battle.setPlayer('p1', {
  name: 'Player',
  team: [{ species: 'charizard', moves: ['doubleedge'], level: 50 }],
});

battle.setPlayer('p2', {
  name: 'Enemy IA',
  team: [{ species: 'blastoise', moves: ['dig', 'surf', 'bite'], level: 50 }],
});

console.log("Starting...");
console.log("Turn 1");
console.log("P1 choice:", battle.choose('p1', 'move 1'));
console.log("P2 choice:", battle.choose('p2', 'move 1')); // Dig

console.log("Turn 2 (Blastoise is underground)");
console.log("P1 choice:", battle.choose('p1', 'move 1'));
// Try to make a wrong choice for P2:
let p2Choice = battle.choose('p2', 'move 2'); // Surf
console.log("P2 choice (move 2):", p2Choice);

if (!p2Choice) {
  console.log("P2 choice (default):", battle.makeChoices('pass', 'default'));
}

console.log("Turn resolved? current turn:", battle.turn);
