import { MOVE_DATA } from '../src/data/moves.ts';
import { POKEMON_DB } from '../src/data/pokemonDB.ts';

console.log("Analyzing MOVE_DATA keys:");
const spanishKeys: string[] = [];
for (const key of Object.keys(MOVE_DATA)) {
  if (key === 'cuerpo_pesado' || 
      key === 'hiper_colmillo' || 
      key === 'patada_salto_alta' || 
      key === 'pajaro_osado' || 
      key === 'engullir' || 
      key === 'somnifera' || 
      key === 'velocidad_extrema' || 
      key === 'mismodestino' || 
      key === 'pantalla_humo' || 
      key === 'super_colmillo' || 
      key === 'huevo_bomba' || 
      key === 'hueso_rus' || 
      key === 'mega_patada' || 
      key === 'mega_puno' || 
      key === 'pozo_venenoso' || 
      key === 'vampiro' || 
      key === 'psicocorte' || 
      key === 'arena' || 
      key === 'minimizar' || 
      key === 'golpe_karatazo' || 
      key === 'mov_sismico' || 
      key === 'tajo_aereo' || 
      key === 'acidificacion' || 
      key === 'recurrente' || 
      key === 'tormenta_de_arena') {
    spanishKeys.push(key);
  }
}
console.log("Found Spanish keys in moves.ts:", spanishKeys);

console.log("\nAnalyzing POKEMON_DB learnset IDs:");
const dbSpanishKeys = new Set<string>();
for (const [pokeId, pokemon] of Object.entries(POKEMON_DB)) {
  if (pokemon.learnset) {
    for (const move of pokemon.learnset) {
      if (spanishKeys.includes(move.id) || move.id.includes('sismico') || move.id.includes('karatazo') || move.id.includes('somnifera')) {
        dbSpanishKeys.add(move.id);
      }
    }
  }
}
console.log("Spanish keys found in pokemonDB.ts learnsets:", Array.from(dbSpanishKeys));
