
import { getEncounterPool } from './src/logic/encounters.js';
import { MAPS } from './src/data/maps.js';

const loc = MAPS.find(m => m.id === 'ruta_12');
console.log('Location:', loc.id);
const { pool, rates } = getEncounterPool(loc, 'day', []);
console.log('Pool:', pool);
console.log('Rates:', rates);

const generic = [];
const specific = [];
const baseWild = loc.wild?.day || [];

pool.forEach((id, index) => {
  if (baseWild.includes(id)) generic.push(id);
  else specific.push(id);
});

console.log('Generic:', generic);
console.log('Specific:', specific);
