const fs = require('fs');

const dataCode = fs.readFileSync('js/02_pokemon_data.js', 'utf8');
const lines = dataCode.split('\\n');
let fireRedMapsStarted = false;
let mapBuffer = '';
for (const line of lines) {
  if (line.includes('const FIRE_RED_MAPS')) {
    fireRedMapsStarted = true;
  }
  if (fireRedMapsStarted) {
    if (line.includes('function getDayCycle()') || line.includes('// ── EXTRA ──')) break;
    mapBuffer += line + '\\n';
  }
}

// Small workaround to eval pure array
mapBuffer = mapBuffer.trim();
if (!mapBuffer.endsWith(';')) mapBuffer += ';';
mapBuffer = mapBuffer.replace('const FIRE_RED_MAPS =', 'global.mapData =');

eval(mapBuffer);

const maps = global.mapData;

function printCount(mapId) {
    const loc = maps.find(m => m.id === mapId);
    if (!loc) return console.log(mapId + " no existe.");
    
    // El render de la interfaz toma loc.wild[cycle] pero fusiona loc.fishing si el script deduce que pesca pesca.
    // getEncounterPool en 06_encounters_v5.js mezcla todo. En día se genera:
    let day = loc.wild.day || [];
    let fishing = loc.fishing ? loc.fishing.pool : [];
    
    // Cuales spawns van a "genericSpawns" y "specificSpawns"?
    // 06_encounters_v5_js dice: specificSpawns son los que estan en currentCycleWild (day) pero no en baseWild (day).
    // Osea que de dia, todos van a genericSpawns.
    let uniqueSprites = new Set([...day, ...fishing]);
    
    console.log(`-- ${loc.name} --`);
    console.log('Spawns en data base (Día): ' + day.join(', '));
    if(fishing.length > 0) console.log('Spawns de pesca: ' + fishing.join(', '));
    console.log('Total sprites únicos renderizados de día: ' + uniqueSprites.size);
    if(uniqueSprites.size > 8) console.log('=> Generará multiples filas en la interfaz grafica!');
}

printCount('route12');
printCount('cerulean_cave');
printCount('safari_zone');
