const fs = require('fs');
const https = require('https');
const path = require('path');

const FILE_PATH = path.resolve(__dirname, '../../../js/02_pokemon_data.js');
const CACHE_FILE = path.resolve(__dirname, '../../../../tmp/pokeapi_moves.json');

// Mapeo de categorías de PokeAPI a efectos internos
const CATEGORY_MAP = {
  'damage+lower': 'stat_down_enemy',
  'damage+raise': 'stat_up_self',
  'damage+status': 'status',
  'net-good-stats': 'stat_up_self',
  'unique': 'unique',
  'ailment': 'status'
};

// Mapeo de IDs de efectos de PokeAPI a strings internos
const EFFECT_ID_MAP = {
  32: 'flinch',
  33: 'burn',
  34: 'freeze',
  35: 'paralyze',
  36: 'poison',
  37: 'sleep',
  38: 'confuse'
};

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
    const listUrl = "https://pokeapi.co/api/v2/move?limit=354";
    console.log(`Fetching from ${listUrl}`);
    const listRes = await fetchJson(listUrl);
    
    const urls = listRes.results.map(r => r.url);
    for (let i = 0; i < urls.length; i += 20) {
      console.log(`Fetching batch ${Math.floor(i/20)+1} / ${Math.ceil(urls.length/20)}`);
      const batch = urls.slice(i, i + 20);
      const results = await Promise.all(batch.map(u => fetchJson(u)));
      pokeapiMoves.push(...results);
    }
    
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(pokeapiMoves));
    console.log("Saved base data to cache.");
  }

  console.log("Reading MOVE_DATA...");
  const content = fs.readFileSync(FILE_PATH, 'utf8');
  
  const definedMovesRegex = /'([^']+)':\s*(\{[\s\S]*?\})/g;
  const ourMoves = new Map();
  let match;
  while ((match = definedMovesRegex.exec(content)) !== null) {
      const props = match[2];
      const effectMatch = props.match(/effect\s*:\s*'([^']+)'/);
      const effect = effectMatch ? effectMatch[1] : null;
      const effectChanceMatch = props.match(/effect_chance\s*:\s*(\d+)/);
      const effectChance = effectChanceMatch ? parseInt(effectChanceMatch[1]) : null;
      
      ourMoves.set(normalizeName(match[1]), {
          originalName: match[1],
          props: props,
          effect: effect,
          effectChance: effectChance,
          hasOhko: /ohko\s*:/.test(props),
          hasDrain: /drain\s*:/.test(props),
          hasRecoil: /recoil\s*:/.test(props),
          isStatusCategory: /cat:\s*'status'/.test(props)
      });
  }

  const missingLogic = [];

  for (const move of pokeapiMoves) {
    const esNameObj = move.names.find(n => n.language.name === 'es');
    let searchName = esNameObj ? esNameObj.name : null;
    if (!searchName) continue;
    
    const norm = normalizeName(searchName);
    const apiCat = move.meta ? move.meta.category.name : '';
    const apiChance = move.effect_chance;
    const apiEffectEntries = move.effect_entries.find(e => e.language.name === 'en')?.short_effect || '';
    
    if (ourMoves.has(norm)) {
      const ourData = ourMoves.get(norm);
      let issue = null;

      // 1. Comparación de categoría/efecto
      if (apiCat && apiCat !== 'damage' && !ourData.effect && !ourData.hasOhko && !ourData.hasDrain && !ourData.hasRecoil && !ourData.isStatusCategory) {
        issue = `Missing effect logic (PokeAPI category: '${apiCat}')`;
      }

      // 2. Comparación de probabilidad de efecto
      if (apiChance && ourData.effect) {
        const ourChanceMatch = ourData.effect.match(/_(\d+)$/);
        const ourChance = ourChanceMatch ? parseInt(ourChanceMatch[1]) : 100;
        if (ourChance !== apiChance) {
          issue = `Effect chance mismatch: PokeAPI ${apiChance}% vs Local ${ourChance}%`;
        }
      }

      // 3. Detección de efectos específicos (ej. flinch)
      if (apiEffectEntries.toLowerCase().includes('flinch') && (!ourData.effect || !ourData.effect.includes('flinch'))) {
        issue = `Missing 'flinch' effect (Found in PokeAPI effect entries)`;
      }

      if (issue) {
        missingLogic.push(`- ${ourData.originalName} (${move.name}): ${issue}`);
      }
    }
  }

  console.log(`\n\n=== SEMANTIC SYNC REPORT ===`);
  if (missingLogic.length === 0) {
    console.log("✅ All moves matching PokeAPI appear to have semantic mechanics accounted for!");
  } else {
    console.log(`❌ Found ${missingLogic.length} moves with semantic inconsistencies:\n`);
    missingLogic.forEach(line => console.log(line));
  }
}

run().catch(e => console.error("Script failed:", e));
