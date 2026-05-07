const fs = require('fs');
const https = require('https');
const path = require('path');

/**
 * POKEMON ABILITY VALIDATOR
 * Compares the abilities assigned in src/data/abilities.js and described in src/data/pokemonDB.js
 * against the official PokeAPI database to find mechanical discrepancies (like Natural Cure).
 */

const CACHE_FILE = path.join(__dirname, 'pokeapi_ability_cache.json');

const httpsGet = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'PokeBorrador-Validator/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url} (Status: ${res.statusCode})`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};

async function getPokeApiAbilities() {
  if (fs.existsSync(CACHE_FILE)) {
    console.log("Loading PokeAPI abilities from cache...");
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }

  console.log("Fetching all abilities from PokeAPI (this will take a few seconds)...");
  const listResp = await httpsGet('https://pokeapi.co/api/v2/ability?limit=350');
  
  const results = [];
  const chunkSize = 20;
  for (let i = 0; i < listResp.results.length; i += chunkSize) {
    const chunk = listResp.results.slice(i, i + chunkSize);
    const promises = chunk.map(entry => httpsGet(entry.url).catch(e => null));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(Boolean));
    process.stdout.write(`Fetched ${Math.min(i + chunkSize, listResp.results.length)} / ${listResp.results.length}\r`);
  }
  
  console.log("\nFinished fetching abilities.");
  fs.writeFileSync(CACHE_FILE, JSON.stringify(results, null, 2));
  return results;
}

async function runValidator() {
  try {
    // 1. Read files
    const statePath = 'src/data/abilities.js';
    const stateContent = fs.readFileSync(statePath, 'utf8');

    // 2. Extract in-game abilities dynamically
    // Look specifically for the POKEMON_ABILITIES object block
    const abilitiesBlockMatch = stateContent.match(/export const POKEMON_ABILITIES = {([\s\S]+?)\n};/);
    const gameAbilities = new Set();
    if (abilitiesBlockMatch) {
      const blockContent = abilitiesBlockMatch[1];
      const abilityListMatches = blockContent.match(/\[([^\]]+)\]/g);
      if (abilityListMatches) {
        abilityListMatches.forEach(match => {
          const names = match.match(/'([^']+)'/g);
          if (names) {
            names.forEach(n => gameAbilities.add(n.replace(/'/g, '')));
          }
        });
      }
    }
    
    // 3. Extract descriptions from src/data/abilities.js
    const abilityData = {};
    const abilityDataMatch = stateContent.match(/export const ABILITY_DATA = {([\s\S]+?)\n};/);
    if (abilityDataMatch) {
      const block = abilityDataMatch[1];
      const entryRegex = /'([^']+)':\s*{\s*desc:\s*'([^']+)'\s*}/g;
      let em;
      while ((em = entryRegex.exec(block)) !== null) {
        abilityData[em[1]] = em[2];
      }
    }

    console.log(`Found ${gameAbilities.size} unique abilities assigned to Pokémon in the code.`);
    
    // 4. Fetch PokeAPI Data
    const apiAbilities = await getPokeApiAbilities();
    
    // 5. Map Spanish Names to API entries
    const translatedMap = {};
    apiAbilities.forEach(ab => {
      const esNameObj = ab.names.find(n => n.language.name === 'es');
      if (esNameObj) {
        const cleaned = esNameObj.name.trim();
        translatedMap[cleaned] = ab;
        translatedMap[cleaned.toLowerCase()] = ab;
      }
    });

    // Handle some hardcoded mismatched translations just in case
    const customMapping = {
      'Cura natural': 'natural-cure',
      'Gran encanto': 'cute-charm'
    };

    console.log("\n=======================================================");
    console.log("🔎 COMPARATIVA DE HABILIDADES: JUEGO VS POKEAPI");
    console.log("=======================================================\n");

    let missingInApi = 0;
    
    for (const abName of gameAbilities) {
      const abNameLower = abName.toLowerCase();
      const gameDescKey = Object.keys(abilityData).find(k => k.toLowerCase() === abNameLower);
      const inGameDesc = gameDescKey ? abilityData[gameDescKey] : "¡Sin descripción en ABILITY_DATA!";
      
      let apiEntry = translatedMap[abName];
      
      if (!apiEntry && customMapping[abName]) {
        apiEntry = apiAbilities.find(a => a.name === customMapping[abName]);
      }
      
      if (!apiEntry) {
         // Attempt to find by english matching or ignore case
         apiEntry = apiAbilities.find(a => a.names.some(n => n.language.name === 'es' && n.name.toLowerCase() === abNameLower));
      }

      if (apiEntry) {
        const esFlavor = apiEntry.flavor_text_entries.find(f => f.language.name === 'es');
        const enEffect = apiEntry.effect_entries.find(e => e.language.name === 'en');

        const officialDesc = esFlavor ? esFlavor.flavor_text.replace(/\n/g, ' ') : "No ES flavor text";
        const officialEffect = enEffect ? enEffect.short_effect.replace(/\n/g, ' ') : "No EN effect";

        console.log(`\x1b[36m${abName.toUpperCase()}\x1b[0m (PokeAPI: ${apiEntry.name})`);
        console.log(`🎮 \x1b[33mJuego:\x1b[0m ${inGameDesc}`);
        console.log(`🌍 \x1b[32mOficial (Texto):\x1b[0m ${officialDesc}`);
        console.log(`⚙️  \x1b[35mOficial (Efecto Técnico):\x1b[0m ${officialEffect}`);
        console.log("---------------------------------------------------------");
      } else {
        console.log(`\x1b[31m❌ ATENCIÓN: No se encontró la habilidad '${abName}' en PokeAPI (puedes necesitar mapeo manual).\x1b[0m`);
        console.log("---------------------------------------------------------");
        missingInApi++;
      }
    }
    
    console.log(`\nValidación completada. Por favor revisa manualmente las diferencias técnicas (⚙️) vs la implementación actual del juego (🎮).`);
    if (missingInApi > 0) {
      console.log(`Hubo ${missingInApi} habilidades que no se pudieron vincular automáticamente con PokeAPI.`);
    }

  } catch (error) {
    console.error("Error running validation:", error);
  }
}

runValidator();
