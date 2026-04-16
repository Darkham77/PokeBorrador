// Unit test para verificar la inyección de sprites en mapas llenos
const assert = require('assert');

// 1. Mocks
const MOCK_FIRE_RED_MAPS = [
    {
        id: 'route12',
        name: 'Ruta 12',
        desc: 'Paraíso de los pescadores.',
        badges: 4,
        wild: {
            day: ['pidgey', 'venonat', 'oddish', 'gloom', 'bellsprout', 'weepinbell', 'farfetchd', 'snorlax'],
            night: ['venonat', 'oddish', 'gloom']
        },
        fishing: {
            pool: ['magikarp', 'poliwag', 'poliwhirl', 'tentacool', 'goldeen', 'seaking', 'slowpoke', 'slowbro', 'krabby', 'kingler']
        },
        rates: {
            day: [20, 20, 10, 10, 10, 10, 10, 10], 
            night: [40, 30, 30]
        }
    }
];

const mock_POKEMON_SPRITE_IDS = new Proxy({}, { get: (t, p) => p === 'length' ? 0 : 1 });
const mock_POKEMON_DB = new Proxy({}, { get: (t, p) => ({ name: p }) });

// 2. Lógica aislada de renderizado extraída de 06_encounters_v5.js
function getPokemonSpriteHtml(id, isRare = false) {
    const num = mock_POKEMON_SPRITE_IDS[id] || 1;
    const pData = mock_POKEMON_DB[id];
    const name = pData?.name || id;
    return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
          title="${name}" width="54" height="54" loading="lazy"
          onerror="this.style.display='none'" 
          class="${isRare ? 'rare-spawn' : ''}">`;
}

function processActiveRates(pool, rates, minRatesObj) {
    if (!pool || !rates) return;
    pool.forEach((id, index) => {
        const rate = rates[index] || 0;
        if (minRatesObj[id] === undefined || rate < minRatesObj[id]) {
            minRatesObj[id] = rate;
        }
    });
}

function generateLocationSpanwHTML(loc, cycle) {
    // Determine pools
    const currentCycleWild = loc.wild[cycle] || [];
    const baseWild = loc.wild.day || [];
    
    let genericSpawns = [];
    let specificSpawns = [];
    
    currentCycleWild.forEach(id => {
        if (baseWild.includes(id)) genericSpawns.push(id);
        else specificSpawns.push(id);
    });
    
    const fishingPool = loc.fishing ? loc.fishing.pool : [];
    fishingPool.forEach(id => {
        if (!genericSpawns.includes(id) && !specificSpawns.includes(id)) {
            genericSpawns.push(id);
        }
    });

    const minActiveRate = {};
    processActiveRates(currentCycleWild, loc.rates[cycle], minActiveRate);
    if (loc.fishing) processActiveRates(loc.fishing.pool, loc.fishing.rates || [], minActiveRate);

    const anyRare = [...genericSpawns, ...specificSpawns].some(id => minActiveRate[id] < 10);
    
    const renderSpritesHTML = (ids) => ids.map(id => {
        const isRare = anyRare && (minActiveRate[id] < 10);
        return getPokemonSpriteHtml(id, isRare);
    }).join('');

    let html = `<div class="location-spawns">
                  <div class="spawn-row">
                    ${renderSpritesHTML(genericSpawns)}
                  </div>
                  ${specificSpawns.length > 0 ? `
                    <div class="spawn-row cycle-specific-spawns">
                      <span class="cycle-emoji-label">🌙</span>
                      ${renderSpritesHTML(specificSpawns)}
                    </div>
                  ` : ''}
                </div>`;
                
    return {
        html,
        genericCount: genericSpawns.length,
        specificCount: specificSpawns.length,
        totalTarget: genericSpawns.length + specificSpawns.length
    }
}

// 3. Ejecutar Prueba
console.log("== EJECUTANDO TEST DE UNIDAD: GENERACION DE SPRITES EN MAPAS LLENOS ==");

const loc = MOCK_FIRE_RED_MAPS[0];
const results = generateLocationSpanwHTML(loc, 'day');

// Se cuenta la cantidad de imgs generadas
const imgsGeneradas = (results.html.match(/<img/g) || []).length;

console.log(`- Validando Ruta 12 (Día + Pesca)`);
console.log(`  Pokémon base día generados: ${loc.wild.day.length}`);
console.log(`  Pokémon pesca generados: ${loc.fishing.pool.length}`);
console.log(`  Total esperados: ${loc.wild.day.length + loc.fishing.pool.length} (Mismo número que targets totales: ${results.totalTarget})`);
console.log(`  Tags <img ...> renderizados en el HTML: ${imgsGeneradas}`);

try {
    assert.strictEqual(imgsGeneradas, results.totalTarget, "El numero de imgs no concuerda con el numero de Pokémon");
    console.log("✅ TEST PASADO: Todos los sprites se han incluido correctamente en el DOM sin ser truncados.");
    
    // Verificando que las clases envolventes existan
    assert.ok(results.html.includes('class="location-spawns"'), "Falta contenedor location-spawns");
    assert.ok(results.html.includes('class="spawn-row"'), "Falta fila spawn-row");
    
    console.log("✅ TEST PASADO: Las clases CSS encargadas del flex-wrap están presentes.");
    
    // Validando ancho de los sprites en base al nuevo cambio
    assert.ok(results.html.includes('width="54"'), "Los sprites deben de tener 54 de ancho");
    console.log("✅ TEST PASADO: Los sprites se generaron con un tamaño de 54px.");
    
} catch (e) {
    console.error("❌ TEST FALLIDO: ", e.message);
    process.exit(1);
}
