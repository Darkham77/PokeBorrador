/**
 * fetch_pokemon.js
 * Uso: node .agents/skills/add-pokemon/fetch_pokemon.js <nombre_en_ingles>
 * Ejemplo: node .agents/skills/add-pokemon/fetch_pokemon.js houndour
 *
 * Genera un archivo _output/<nombre>.json con todos los datos necesarios
 * para agregar el Pokémon al juego en formato listo para copiar.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Caché de nombres para evitar redundancia ─────────────────────────────────
const NAME_CACHE = {
  moves: {},
  abilities: {},
  species: {}
};

// ── Versión target para learnset ──────────────────────────────────────────────
const TARGET_VERSIONS = ['firered-leafgreen', 'ruby-sapphire', 'emerald', 'heartgold-soulsilver'];

const httpsGet = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'PokeBorrador-AddPokemon/1.0' } }, (res) => {
    if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
  }).on('error', reject);
});

async function getSpanishName(url, type) {
  if (NAME_CACHE[type][url]) return NAME_CACHE[type][url];
  
  try {
    const data = await httpsGet(url);
    const esEntry = data.names.find(n => n.language.name === 'es');
    const name = esEntry ? esEntry.name : null;
    if (name) NAME_CACHE[type][url] = name;
    return name;
  } catch (e) {
    return null;
  }
}

// ── Versión target para learnset ──────────────────────────────────────────────
const TARGET_VERSIONS = ['firered-leafgreen', 'ruby-sapphire', 'emerald', 'heartgold-soulsilver'];

const httpsGet = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'PokeBorrador-AddPokemon/1.0' } }, (res) => {
    if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
  }).on('error', reject);
});

// Las traducciones ahora se obtienen dinámicamente de PokeAPI.

async function fetchPokemon(pokemonName) {
  const name = pokemonName.toLowerCase().trim();
  console.log(`\nFetching data for "${name}" from PokeAPI...`);

  // 1. Fetch basic pokemon data
  const pokemon = await httpsGet(`https://pokeapi.co/api/v2/pokemon/${name}`);
  
  const nationalId = pokemon.id;
  const officialName = pokemon.name;

  // Stats
  const statMap = {};
  pokemon.stats.forEach(s => { statMap[s.stat.name] = s.base_stat; });

  // Types
  const types = pokemon.types.map(t => t.type.name);
  const type1 = types[0];
  const type2 = types[1] || null;

  // Abilities
  const abilities = await Promise.all(pokemon.abilities.map(async (a) => {
    const enName = a.ability.name;
    const esName = await getSpanishName(a.ability.url, 'abilities');
    return { en: enName, es: esName, isHidden: a.is_hidden };
  }));

  // 2. Learnset from Gen 3 version groups
  const levelMoves = [];
  const machineMoves = [];

  const seenLevelMoves = new Set();
  const seenMachineMoves = new Set();

  for (const moveEntry of pokemon.moves) {
    for (const vgd of moveEntry.version_group_details) {
      if (TARGET_VERSIONS.includes(vgd.version_group.name)) {
        const enName = moveEntry.move.name;
        if (vgd.move_learn_method.name === 'level-up') {
          if (!seenLevelMoves.has(enName)) {
            seenLevelMoves.add(enName);
            const esName = await getSpanishName(moveEntry.move.url, 'moves');
            levelMoves.push({
              lv: vgd.level_learned_at,
              en: enName,
              es: esName || `⚠️ TRADUCIR: ${enName}`,
              pp: 35
            });
          }
        } else if (vgd.move_learn_method.name === 'machine') {
          if (!seenMachineMoves.has(enName)) {
            seenMachineMoves.add(enName);
            const esName = await getSpanishName(moveEntry.move.url, 'moves');
            machineMoves.push({ en: enName, es: esName });
          }
        }
      }
    }
  }

  // Remove duplicates keeping lowest level, then sort
  const uniqueMovesMap = {};
  levelMoves.forEach(m => {
    const key = m.en;
    if (!uniqueMovesMap[key] || m.lv < uniqueMovesMap[key].lv) {
      uniqueMovesMap[key] = m;
    }
  });
  const sortedLearnset = Object.values(uniqueMovesMap).sort((a, b) => a.lv - b.lv);

  // 3. Species data (flavor text)
  console.log('Fetching species data...');
  const species = await httpsGet(`https://pokeapi.co/api/v2/pokemon-species/${nationalId}`);
  const flavorEs = species.flavor_text_entries.find(e => e.language.name === 'es' && ['ruby', 'sapphire', 'firered', 'leafgreen', 'emerald'].includes(e.version.name));
  const flavorEn = species.flavor_text_entries.find(e => e.language.name === 'en' && ['ruby', 'sapphire', 'firered', 'leafgreen', 'emerald'].includes(e.version.name));
  const nameEs = species.names.find(n => n.language.name === 'es')?.name || officialName;
  
  // Evolution chain
  const evoChainUrl = species.evolution_chain.url;
  const evoChain = await httpsGet(evoChainUrl);

  // ── Build output ─────────────────────────────────────────────────────────────
  const result = {
    meta: {
      pokemon_name_en: officialName,
      pokemon_name_es: nameEs,
      national_id: nationalId,
      type1,
      type2,
      sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nationalId}.png`,
    },
    stats: {
      hp: statMap['hp'],
      atk: statMap['attack'],
      def: statMap['defense'],
      spa: statMap['special-attack'],
      spd: statMap['special-defense'],
      spe: statMap['speed'],
    },
    abilities: abilities,
    flavor_text: {
      es: flavorEs?.flavor_text?.replace(/\n/g, ' ').replace(/\f/g, ' ') || 'No disponible',
      en: flavorEn?.flavor_text?.replace(/\n/g, ' ').replace(/\f/g, ' ') || 'Not available',
    },
    learnset: sortedLearnset,
    machine_moves: machineMoves,
    evolution_chain: JSON.stringify(evoChain.chain, null, 2),
  };

  // ── Generate ready-to-use code ───────────────────────────────────────────────
  const learnsetCode = sortedLearnset.map(m =>
    `    { lv: ${m.lv}, name: '${m.es.replace("'", "\\'")}', pp: ${m.pp} }`
  ).join(',\n');

  const abilityNames = abilities.filter(a => !a.isHidden).map(a => a.es ? `'${a.es}'` : `'⚠️ ${a.en}'`).join(', ');
  
  const pokemonDbCode = `  ${name}: {
    name: '${nameEs}', emoji: '${type1 === 'fire' ? '🔥' : type1 === 'water' ? '💧' : type1 === 'grass' ? '🌿' : type1 === 'psychic' ? '🔮' : type1 === 'dark' ? '🌑' : type1 === 'ghost' ? '👻' : type1 === 'ice' ? '🧊' : type1 === 'dragon' ? '🐉' : type1 === 'electric' ? '⚡' : type1 === 'ground' ? '🏔️' : type1 === 'rock' ? '🪨' : type1 === 'poison' ? '☠️' : type1 === 'flying' ? '🦅' : type1 === 'bug' ? '🐛' : type1 === 'fighting' ? '🥊' : type1 === 'steel' ? '⚙️' : type1 === 'normal' ? '⭐' : '❓'}', type: '${type1}',
    hp: ${statMap['hp']}, atk: ${statMap['attack']}, def: ${statMap['defense']}, spa: ${statMap['special-attack']}, spd: ${statMap['special-defense']}, spe: ${statMap['speed']},
    learnset: [
${learnsetCode}
    ]
  },`;

  const abilitiesCode = `  ${name}: [${abilityNames}],`;

  const pokedexSpriteCode = `  ${name}: ${nationalId},`;
  const pdexOrderNote = `'${name}',  // Insertar en PDEX_ORDER en la posición #${nationalId}`;

  const type2Code = type2 ? `  ${name}: '${type2}',` : null;

  // ── Write output ─────────────────────────────────────────────────────────────
  const outputDir = path.join(__dirname, '_output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  const outputPath = path.join(outputDir, `${name}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  const codePath = path.join(outputDir, `${name}_code.txt`);
  const codeContent = `
=================================================================
DATOS PARA AGREGAR: ${nameEs.toUpperCase()} (#${nationalId})
Generado automáticamente desde PokeAPI
=================================================================

⚠️  ADVERTENCIAS:
${sortedLearnset.filter(m => m.es.includes('TRADUCIR')).map(m => `   - Traduce manualmente: ${m.en}`).join('\n') || '   Ninguna — todos los movimientos tienen traducción.'}
${abilities.filter(a => !a.es).map(a => `   - Habilidad sin traducción: ${a.en}`).join('\n') || ''}

-----------------------------------------------------------------
1. POKEMON_DB en js/02_pokemon_data.js
   (Agregar antes del cierre del objeto POKEMON_DB)
-----------------------------------------------------------------
${pokemonDbCode}

-----------------------------------------------------------------
2. TIPO SECUNDARIO en POKE_TYPE2 en js/02_pokemon_data.js
-----------------------------------------------------------------
${type2Code || `// ${nameEs} no tiene tipo secundario, no agregar nada.`}

-----------------------------------------------------------------
3. ABILITIES en js/04_state.js
-----------------------------------------------------------------
${abilitiesCode}

-----------------------------------------------------------------
4. EVOLUCIÓN en js/13_evolution.js
   (Revisar la cadena completa abajo y agregar en el objeto correcto)
-----------------------------------------------------------------
// Cadena de evolución completa:
${result.evolution_chain}

-----------------------------------------------------------------
5. POKEMON_SPRITE_IDS en js/18_pokedex.js
-----------------------------------------------------------------
${pokedexSpriteCode}

-----------------------------------------------------------------
6. PDEX_ORDER en js/18_pokedex.js
-----------------------------------------------------------------
${pdexOrderNote}

-----------------------------------------------------------------
7. TM_COMPAT en js/18_pokedex.js
   (Lista de movimientos aprendibles por MT - traducir TM ids manualmente)
   Movimientos por MQ en Gen 3: 
${machineMoves.map(m => `   ${m.en} → ${m.es || '⚠️ TRADUCIR'}`).join('\n')}

   Ejemplo aproximado (VERIFICAR con Bulbapedia):
  ${name}: [/* TM IDs aquí - ver SKILL.md */],

-----------------------------------------------------------------
8. DESCRIPCIÓN POKÉDEX
-----------------------------------------------------------------
ES: ${result.flavor_text.es}
EN: ${result.flavor_text.en}

-----------------------------------------------------------------
9. SNIPPETS DE INYECCIÓN (Para probar inmediatamente)
   (Copiar y pegar en la consola del navegador una vez insertado el código)
-----------------------------------------------------------------

// OPCIÓN A: Pokémon REAL (Naturaleza, IVs y Movimientos naturales)
injectPokemonToBox(makePokemon('${name}', 50));

// OPCIÓN B: Pokémon de PRUEBA (Para validar visualmente variantes)
injectPokemonToBox({
  uid: crypto.randomUUID(),
  id: '${name}',
  name: '${nameEs}',
  level: 50,
  hp: 150, maxHp: 150,
  atk: 100, def: 100, spa: 100, spd: 100, spe: 100,
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  nature: 'Seria',
  ability: '${abilities[0].es || 'Espesura'}',
  moves: [
    { name: '${sortedLearnset[0]?.es || 'Placaje'}', pp: 35, maxPP: 35 },
    { name: '${sortedLearnset[1]?.es || 'Gruñido'}', pp: 40, maxPP: 40 }
  ],
  isShiny: true, // Forzamos shiny para prueba visual
  exp: 0, expNeeded: 100, friendship: 70
});

=================================================================
¡VERIFICAR CON SKILL.md ANTES DE INSERTAR EN EL JUEGO!
=================================================================
`;

  fs.writeFileSync(codePath, codeContent);

  console.log(`\n✅ Datos guardados en:`);
  console.log(`   📄 Datos raw:  ${outputPath}`);
  console.log(`   📋 Código:     ${codePath}`);
  console.log(`\n📊 Resumen:`);
  console.log(`   Nombre:     ${nameEs} (${officialName})`);
  console.log(`   ID:         #${nationalId}`);
  console.log(`   Tipos:      ${types.join(', ')}`);
  console.log(`   Stats:      HP:${statMap['hp']} ATK:${statMap['attack']} DEF:${statMap['defense']} SPA:${statMap['special-attack']} SPD:${statMap['special-defense']} SPE:${statMap['speed']}`);
  console.log(`   Habilidades:${abilities.map(a => ` ${a.es || a.en}${a.isHidden ? ' (oculta)' : ''}`).join(',')}`);
  console.log(`   Movimientos por nivel (Gen 3): ${sortedLearnset.length}`);
  console.log(`   Movimientos por MT:            ${machineMoves.length}`);
  
  const unmapped = sortedLearnset.filter(m => m.es.includes('TRADUCIR'));
  if (unmapped.length > 0) {
    console.log(`\n⚠️  ${unmapped.length} movimientos necesitan traducción manual:`);
    unmapped.forEach(m => console.log(`   - ${m.en}`));
  }

  console.log(`\n➡️  Siguiente paso: Abre ${codePath} y copia los snippets al juego siguiendo SKILL.md`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const pokemonName = process.argv[2];
if (!pokemonName) {
  console.error('❌ Uso: node fetch_pokemon.js <nombre_en_ingles>');
  console.error('   Ejemplo: node fetch_pokemon.js houndour');
  process.exit(1);
}

fetchPokemon(pokemonName).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
