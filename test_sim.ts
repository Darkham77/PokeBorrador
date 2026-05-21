import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });

battle.setPlayer('p1', {
  name: 'Player',
  team: [{ species: 'charizard', moves: ['doubleedge'], level: 50 }],
});

battle.setPlayer('p2', {
  name: 'Enemy IA',
  team: [{ species: 'blastoise', moves: ['dig'], level: 50 }],
});

console.log("Starting...");
// battle.start(); // Setting teams starts it
console.log("Turn 1");
console.log("P1 choice:", battle.choose('p1', 'move 1'));
console.log("P2 choice:", battle.choose('p2', 'move 1'));

console.log("Logs after turn 1:", battle.log.slice().filter(l => l.startsWith('|move') || l.startsWith('|-prepare')));

console.log("Turn 2 (Blastoise is underground)");
console.log("P1 choice:", battle.choose('p1', 'move 1'));
// Try to make a wrong choice for P2:
let p2Choice = battle.choose('p2', 'move 1');
console.log("P2 choice (move 1):", p2Choice);

if (!p2Choice) {
  // Try default
  console.log("P2 choice (default):", battle.choose('p2', 'default'));
}

console.log("Turn resolved? current turn:", battle.turn);
console.log("Logs after turn 2:", battle.log.slice().filter(l => l.startsWith('|move') || l.startsWith('|-miss')));
