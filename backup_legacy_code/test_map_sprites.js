const fs = require('fs');

let capturedHTML = "";

const document = {
    getElementById: (id) => {
        if (id === 'map-list') {
            return {
                set innerHTML(val) {
                    capturedHTML = val;
                }
            };
        }
        return null;
    },
    querySelectorAll: () => [],
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {} }
};
const window = { document, location: {}, isGoingLocation: false, POKEMON_SPRITE_IDS: new Proxy({}, { get: (target, prop) => 1 }) };
global.document = document;
global.window = window;

global.state = { badges: 8, map: 'route1', faction: 'union', playerClass: 'entrenador', safariTicketSecs: 3600, ceruleanTicketSecs: 3600 };
global.currentUser = null;

global.notify = function() {};
global.getDayCycle = function() { return 'day'; };
let _activeEvents = [];
let _finishedEvents = [];
const sb = { from: () => ({ select: () => ({ eq: async () => ({ count: 0, data: [] }) }) }) };
global.sb = sb;
window.sb = sb;
global.GYMS = [];
global.generateDailyMission = function() {};
global.loadDailyGuardianCaptures = function() { return Promise.resolve(); };

let dataCode = fs.readFileSync('js/02_pokemon_data.js', 'utf8');
dataCode = dataCode.replace('const POKEMON_DB', 'global.POKEMON_DB').replace('const FIRE_RED_MAPS', 'global.FIRE_RED_MAPS').replace('const POKEMON_SPRITE_IDS', 'global.POKEMON_SPRITE_IDS');
eval(dataCode);

global.getEventBonus = () => 1;
global.getEncounterPool = (loc, cycle) => {
    let pool = [];
    if (loc.wild && loc.wild[cycle]) pool = pool.concat(loc.wild[cycle]);
    let rates = []; 
    return { pool, rates };
};

let mapCode = fs.readFileSync('js/06_encounters_v5.js', 'utf8');
mapCode = mapCode.replace(/let _currentCarouselIndex|let _carouselInterval/, function(x) { return "global." + x; })
eval(mapCode);

async function runTest() {
    await renderMaps();
    
    console.log("\\n--- MAP SPRITE COUNT TEST ---");
    const cards = capturedHTML.split('location-card map-card');
    
    function logMap(name) {
        const card = cards.find(c => c.includes(name));
        if (card) {
            // Eliminar sprites de pesca rod
            const noTitle = card.replace(/"fishing-rod"/g, '');
            const numImages = (noTitle.match(/<img class=""/g) || []).length + (noTitle.match(/<img src="/g) || []).length;
            // Usaremos la cantidad de imgs que se apuntan al repo the PokeAPI
            const pokeImages = (card.match(/raw.githubusercontent.com.PokeAPI/g) || []).length;
            console.log(`Map ${name}: Se encontraron ${pokeImages} sprites insertados en el DOM simulado.`);
        } else {
            console.log(`Map ${name}: No se encontro en el HTML.`);
        }
    }
    
    logMap('Ruta 12');
    logMap('Cueva Celeste');
    logMap('Zona Safari');
    
    const countWild = (loc) => {
        let count = 0;
        let set = new Set();
        if (loc.wild && loc.wild.day) loc.wild.day.forEach(p => set.add(p));
        if (loc.fishing && loc.fishing.pool) loc.fishing.pool.forEach(p => set.add(p));
        return set.size; // Total unique encouters
    }
    
    console.log(`\\nSprites Esperados (Especies únicas en Pool Día + Pesca):`);
    console.log(`Ruta 12: ` + countWild(global.FIRE_RED_MAPS.find(m => m.id === 'route12')));
    console.log(`Cueva Celeste: ` + countWild(global.FIRE_RED_MAPS.find(m => m.id === 'cerulean_cave')));
    console.log(`Zona Safari: ` + countWild(global.FIRE_RED_MAPS.find(m => m.id === 'safari_zone')));
}

runTest().catch(console.error);
