import { POKEMON_FEET_DATABASE } from '../src/data/pokemonFeetDatabase.ts';

const keys = Object.keys(POKEMON_FEET_DATABASE);
console.log(`Total keys: ${keys.length}`);

let npc = 0;
let pokemon = 0;
let trainers = 0;
let others = [];

for (const key of keys) {
    if (key.startsWith('/assets/sprites/npc/') && key.endsWith('.webp')) {
        npc++;
    } else if (key.startsWith('/assets/sprites/pokemon/') && key.endsWith('.webp')) {
        pokemon++;
    } else if (key.startsWith('/assets/sprites/trainers/') && key.endsWith('.webp')) {
        trainers++;
    } else {
        others.push(key);
    }
}

console.log(`NPC keys: ${npc}`);
console.log(`Pokemon keys: ${pokemon}`);
console.log(`Trainers keys: ${trainers}`);
console.log(`Other keys (unmatched): ${others.length}`);
if (others.length > 0) {
    console.log("Unmatched keys:", others.slice(0, 10));
}
