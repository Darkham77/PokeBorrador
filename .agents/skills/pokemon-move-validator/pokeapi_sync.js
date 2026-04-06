const fs = require('fs');
const https = require('https');
const path = require('path');

const FILE_PATH = path.resolve(__dirname, '../../../js/02_pokemon_data.js');
const CACHE_FILE = path.resolve(__dirname, '../../../../tmp/pokeapi_moves.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'PokeBorrador-Agent/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function normalizeName(name) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

async function run() {
  console.log("Loading PokeAPI Gen 1-3 moves (1-354)...");
  
  let pokeapiMoves = [];
  if (fs.existsSync(CACHE_FILE)) {
    console.log("Using cached PokeAPI data...");
    pokeapiMoves = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } else {
    // Fetch base list
    const listUrl = "https://pokeapi.co/api/v2/move?limit=354";
    console.log(`Fetching from ${listUrl}`);
    const listRes = await fetchJson(listUrl);
    
    // Fetch indiviudal data in batches of 20
    const urls = listRes.results.map(r => r.url);
    for (let i = 0; i < urls.length; i += 20) {
      console.log(`Fetching batch ${Math.floor(i/20)+1} / ${Math.ceil(urls.length/20)}`);
      const batch = urls.slice(i, i + 20);
      const results = await Promise.all(batch.map(u => fetchJson(u)));
      pokeapiMoves.push(...results);
    }
    
    // Ensure dir exists
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(pokeapiMoves));
    console.log("Saved base data to cache.");
  }

  // Parse our files
  console.log("Reading MOVE_DATA...");
  const content = fs.readFileSync(FILE_PATH, 'utf8');
  
  // Extract defined moves in MOVE_DATA block
  const definedMovesRegex = /'([^']+)':\s*(\{[\s\S]*?\})/g;
  const ourMoves = new Map();
  let match;
  while ((match = definedMovesRegex.exec(content)) !== null) {
      // Find if we have property `effect:`
      const hasEffect = /effect\s*:/.test(match[2]);
      const hasOhko = /ohko\s*:/.test(match[2]);
      const hasDrain = /drain\s*:/.test(match[2]);
      const hasRecoil = /recoil\s*:/.test(match[2]);
      const isStatusCategory = /cat:\s*'status'/.test(match[2]);

      ourMoves.set(normalizeName(match[1]), {
          originalName: match[1],
          props: match[2],
          hasSpecialLogic: hasEffect || hasOhko || hasDrain || hasRecoil || isStatusCategory
      });
  }

  // Cross reference
  const missingLogic = [];

  for (const move of pokeapiMoves) {
    // Find spanish name
    const esNameObj = move.names.find(n => n.language.name === 'es');
    let searchName = esNameObj ? esNameObj.name : null;
    
    // Fallbacks for specific translations if needed / Gen 3 spanish fixes
    if (!searchName) continue;
    
    // Our DB uses specific accents or names. Let's normalize.
    const norm = normalizeName(searchName);
    
    // Does it have a special effect in API?
    // "damage" is vanilla. "damage+lower" "damage+raise" "net-good-stats" etc.
    const apiCat = move.meta ? move.meta.category.name : '';
    const hasApiSpecialLogic = apiCat && apiCat !== 'damage' && apiCat !== '';
    
    if (ourMoves.has(norm)) {
      const ourData = ourMoves.get(norm);
      if (hasApiSpecialLogic && !ourData.hasSpecialLogic) {
        missingLogic.push(`- ${ourData.originalName} (${move.name}): PokeAPI category '${apiCat}'. Missing effect logic in MOVE_DATA.`);
      }
    }
  }

  console.log(`\n\n=== SYNC REPORT ===`);
  if (missingLogic.length === 0) {
    console.log("✅ All moves matching PokeAPI appear to have special mechanics accounted for!");
  } else {
    console.log(`❌ Found ${missingLogic.length} moves defined in MOVE_DATA that might be missing effects:\n`);
    missingLogic.forEach(line => console.log(line));
  }
}

run().catch(e => console.error("Script failed:", e));
