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

// ── Mapeo de nombres de movimientos inglés → español (ampliable) ──────────────
// Este mapeo es parcial. Para movimientos no mapeados se usa el nombre en inglés
// con una advertencia para que se traduzca manualmente.
const MOVE_NAME_ES = {
  'tackle': 'Placaje', 'scratch': 'Arañazo', 'growl': 'Gruñido', 'tail-whip': 'Látigo',
  'ember': 'Ascuas', 'water-gun': 'Pistola Agua', 'vine-whip': 'Látigo Cepa',
  'bite': 'Mordisco', 'roar': 'Rugido', 'smog': 'Pantalla Humo',
  'flamethrower': 'Lanzallamas', 'fire-blast': 'Llamarada', 'inferno': 'Infierno',
  'leer': 'Cara Susto', 'thunder-wave': 'Onda Trueno', 'thunderbolt': 'Rayo',
  'thunder': 'Trueno', 'psychic': 'Psíquico', 'shadow-ball': 'Bola Sombra',
  'dark-pulse': 'Pulso Umbrío', 'flare-blitz': 'Envite Ígneo',
  'fire-fang': 'Colmillo Ígneo', 'thunder-fang': 'Colmillo Rayo',
  'ice-fang': 'Colmillo Hielo', 'pursuit': 'Persecución', 'smog': 'Pantalla Humo',
  'sunny-day': 'Día Soleado', 'rain-dance': 'Danza Lluvia', 'overheat': 'Sofoco',
  'will-o-wisp': 'Fuego Fatuo', 'nasty-plot': 'Maquinación',
  'crunch': 'Triturar', 'hyper-fang': 'Hiper Colmillo', 'super-fang': 'Súper Colmillo',
  'quick-attack': 'Ataque Rápido', 'double-team': 'Doble Equipo', 'attract': 'Atracción',
  'protect': 'Protección', 'rest': 'Descanso', 'sleep-talk': 'Hablar Dormido',
  'endure': 'Aguante', 'facade': 'Imagen', 'return': 'Retribución',
  'frustration': 'Frustración', 'earthquake': 'Terremoto', 'rock-slide': 'Tumba Rocas',
  'dig': 'Excavar', 'toxic': 'Tóxico', 'poison-gas': 'Polvo Veneno',
  'sludge-bomb': 'Bomba Lodo', 'taunt': 'Mofa', 'torment': 'Tormento',
  'mean-look': 'Mal de Ojo', 'destiny-bond': 'Señal Trampa', 'spite': 'Rencor',
  'knock-off': 'Golpe Bajo', 'beat-up': 'Acoso', 'swagger': 'Fanfarria',
  'thief': 'Ladrón', 'snatch': 'Robo', 'faint-attack': 'Golpe Vacío',
  'night-shade': 'Sombra Nocturnna', 'body-slam': 'Golpe Cuerpo',
  'mega-drain': 'Gigadrenado', 'solar-beam': 'Rayo Solar', 'hyper-beam': 'Hiperrayo',
  'cut': 'Corte', 'strength': 'Fuerza', 'surf': 'Surf', 'waterfall': 'Cascada',
  'fly': 'Vuelo', 'flash': 'Flash', 'rock-smash': 'Romperroca', 'whirlpool': 'Torbellino',
  'headbutt': 'Cabezazo', 'smokescreen': 'Pantalla Humo', 'confuse-ray': 'Rayo Confuso',
  'agility': 'Agilidad', 'amnesia': 'Amnesia', 'barrier': 'Barrera',
  'baton-pass': 'Relevo', 'belly-drum': 'Bombo', 'blizzard': 'Ventisca',
  'brine': 'Salmuera', 'bubble': 'Burbuja', 'bubble-beam': 'Pistola Agua',
  'calm-mind': 'Paz Mental', 'charge': 'Carga', 'clamp': 'Tenaza',
  'close-combat': 'Combate Cerrado', 'comet-punch': 'Puño Cometa',
  'confuse-ray': 'Rayo Confuso', 'counter': 'Contraataque', 'cross-chop': 'Golpe Karate',
  'cut': 'Corte', 'defense-curl': 'Refugio', 'destiny-bond': 'Señal Trampa',
  'disable': 'Anulación', 'double-edge': 'Doble Filo', 'doubleslap': 'Doble Bofetón',
  'dragon-rage': 'Furia Dragón', 'dream-eater': 'Comeosueños', 'drill-peck': 'Picotazo',
  'egg-bomb': 'Bomba Huevo', 'encore': 'Otra Vez', 'explosion': 'Explosión',
  'extremespeed': 'Aturde Sonido', 'feint-attack': 'Golpe Vacío',
  'fire-punch': 'Puño Fuego', 'fire-spin': 'Giro Fuego', 'fissure': 'Fisura',
  'focus-energy': 'Foco Energía', 'fury-attack': 'Ataque Furia', 'fury-swipes': 'Zarpazo',
  'glare': 'Mirada Feroz', 'growl': 'Gruñido', 'guillotine': 'Guillotina',
  'gust': 'Tornado', 'harden': 'Fortaleza', 'haze': 'Vaho', 'hi-jump-kick': 'Salto Brusco',
  'horn-attack': 'Ataque Cuerno', 'horn-drill': 'Taladrador', 'hydro-pump': 'Hidrobomba',
  'hypnosis': 'Hipnosis', 'ice-beam': 'Rayo Hielo', 'ice-punch': 'Puño Hielo',
  'jump-kick': 'Pataleta', 'karate-chop': 'Kárate', 'kinesis': 'Confusión',
  'leech-life': 'Picadura', 'leech-seed': 'Drenadoras', 'lick': 'Lametón',
  'light-screen': 'Pantalla de Luz', 'lock-on': 'Bloqueo', 'lovely-kiss': 'Beso Dulce',
  'low-kick': 'Patada Baja', 'mega-kick': 'Patada Brutal', 'mega-punch': 'Megapiñón',
  'metronome': 'Metrónomo', 'mimic': 'Mímesis', 'minimize': 'Minimizar',
  'mirror-move': 'Espejo', 'mist': 'Velo', 'night-shade': 'Sombra Nocturnna',
  'pay-day': 'Monedas', 'petal-dance': 'Danza Pétalo', 'pin-missile': 'Pin Misil',
  'poison-sting': 'Picotazo Veneno', 'pound': 'Destructor', 'powder-snow': 'Nieve Polvo',
  'psybeam': 'Psicorrayo', 'psychic': 'Psíquico', 'psywave': 'Psicoonda',
  'rage': 'Furia', 'razor-leaf': 'Hoja Afilada', 'razor-wind': 'Viento Navaja',
  'recover': 'Recuperación', 'reflect': 'Reflejo', 'rock-throw': 'Lanzarrocas',
  'rolling-kick': 'Patada Giro', 'sand-attack': 'Ataque Arena', 'screech': 'Chirrido',
  'seismic-toss': 'Lanzamiento', 'self-destruct': 'Autodestrucción', 'sharpen': 'Afilar',
  'sing': 'Canción Mortal', 'skull-bash': 'Cabezazo', 'slam': 'Golpe',
  'slash': 'Cuchillada', 'sleep-powder': 'Somnífera', 'slush-rush': 'Nado Rápido',
  'smokescreen': 'Pantalla Humo', 'softboiled': 'Puesta', 'sonicboom': 'Onda Sónica',
  'spike-cannon': 'Cañón Puas', 'spore': 'Espora', 'stomp': 'Pisotón',
  'string-shot': 'Disparo Demora', 'struggle': 'Forcejeo', 'stun-spore': 'Paralizador',
  'submission': 'Sometimiento', 'substitute': 'Subterfugio', 'super-fang': 'Súper Colmillo',
  'supersonic': 'Supersónico', 'swift': 'Rapidez', 'swords-dance': 'Danza Espada',
  'take-down': 'Derribo', 'teleport': 'Teletransporte', 'thunder-punch': 'Puñopuño',
  'thunder-shock': 'Impactrueno', 'toxic': 'Tóxico', 'transform': 'Transformación',
  'tri-attack': 'Triple Ataque', 'twineedle': 'Doble Aguijón', 'vice-grip': 'Apretón',
  'vine-whip': 'Látigo Cepa', 'waterfall': 'Cascada', 'water-gun': 'Pistola Agua',
  'whirlwind': 'Remolino', 'wing-attack': 'Ataque Ala', 'withdraw': 'Refugio',
  'wrap': 'Constricción', 'struggle': 'Forcejeo', 'swift': 'Rapidez',
  'metal-claw': 'Garra Metal', 'detect': 'Detección', 'false-swipe': 'Golpe Falso',
  'foresight': 'Ojo Certero', 'hex': 'Maleficio', 'reversal': 'Inversión',
  'thunder-wave': 'Onda Trueno', 'hidden-power': 'Poder Oculto', 'rollout': 'Rueda',
  'magnitude': 'Magnitud', 'megahorn': 'Gigacuerno', 'minimize': 'Minimizar',
  'payback': 'Venganza', 'sucker-punch': 'Golpe Bajo', 'u-turn': 'Cambio Drástico',
  'shadow-claw': 'Garra Umbría', 'fire-pledge': 'Promesa Fuego',
  'heat-wave': 'Ola Cálida', 'howl': 'Aullido', 'smelling-salts': 'Sales Aromáticas',
  'beat-up': 'Acoso', 'faint-attack': 'Golpe Vacío', 'sweet-scent': 'Dulce Aroma',
  'feint': 'Treta', 'outrage': 'Enfado', 'hyper-voice': 'Hiperfonía',
};

// ── Mapeo de habilidades inglés → español ─────────────────────────────────────
const ABILITY_NAME_ES = {
  'flash-fire': 'Absorbe Fuego', 'flash-fire': 'Absorbe Fuego',
  'early-bird': 'Madrugar', 'intimidate': 'Intimidación', 'run-away': 'Escape',
  'keen-eye': 'Vista Lince', 'technician': 'Tecnología', 'hustle': 'Entusiasmo',
  'vital-spirit': 'Espíritu Vital', 'speed-boost': 'Impulso', 'compound-eyes': 'Ojo Compuesto',
  'shield-dust': 'Escudo Polvo', 'shed-skin': 'Mudar', 'swarm': 'Enjambre',
  'stench': 'Hedor', 'thick-fat': 'Sebo', 'battle-armor': 'Caparazón',
  'rock-head': 'Cabeza Roca', 'solar-power': 'Poder Solar', 'chlorophyll': 'Clorofila',
  'static': 'Electricidad Estática', 'lightning-rod': 'Pararrayos',
  'water-absorb': 'Absorbe Agua', 'volt-absorb': 'Absorbe Voltio',
  'sand-veil': 'Velo Arena', 'trace': 'Calco', 'adaptability': 'Adaptable',
  'skill-link': 'Encadenado', 'color-change': 'Mutar', 'immunity': 'Inmunidad',
  'levitate': 'Levitación', 'poison-point': 'Punto Tóxico', 'synchronize': 'Sincronía',
  'clear-body': 'Cuerpo Puro', 'oblivious': 'Despiste', 'cloud-nine': 'Velo Húmedo',
  'natural-cure': 'Cura Natural', 'magnet-pull': 'Imán', 'flame-body': 'Cuerpo Llama',
  'cute-charm': 'Engatuse', 'inner-focus': 'Foco Interno', 'insomnia': 'Insomnio',
  'sturdy': 'Robustez', 'own-tempo': 'Ritmo Propio', 'swift-swim': 'Nado Rápido',
  'damp': 'Humedad', 'pressure': 'Presión', 'pickup': 'Recogida',
  'guts': 'Agallas', 'hustle': 'Entusiasmo', 'rough-skin': 'Piel Tosca',
  'wonder-guard': 'Escudo Mágico', 'truant': 'Flojera', 'super-luck': 'Suerte Extra',
  'effect-spore': 'Efecto Espora', 'pure-power': 'Poder Latente',
  'shell-armor': 'Caparazón', 'air-lock': 'Cielo Limpio',
  'blaze': 'Mar Llamas', 'overgrow': 'Espesura', 'torrent': 'Torrente',
  'drought': 'Pertinaz', 'drizzle': 'Llovizna', 'sand-stream': 'Chorro Arena',
  'snow-warning': 'Nevada', 'arena-trap': 'Trampa Arena', 'shadow-tag': 'Sombra Umbrál',
  'frisk': 'Inspección', 'rough-skin': 'Piel Tosca', 'hyper-cutter': 'Corte Fuerte',
  'scrappy': 'Revoltoso', 'anger-point': 'Punto Ira', 'lightningrod': 'Pararrayos',
  'soundproof': 'Insonorizar', 'magic-guard': 'Muro Mágico', 'immunity': 'Inmunidad',
  'wonder-skin': 'Piel Mágica', 'infiltrator': 'Infiltrador', 'super-luck': 'Suerte Extra',
  'serene-grace': 'Dicha', 'normalize': 'Normaliza', 'sniper': 'Francotirador',
  'rivalry': 'Rivalidad', 'mold-breaker': 'Rompemoldes', 'forewarn': 'Presciencia',
  'tangle-feet': 'Soleado', 'big-pecks': 'Gran Ala', 'unnerve': 'Nerviosismo',
  'pickup': 'Recogida', 'moody': 'Temperamental', 'healer': 'Sanador',
  'regenerator': 'Regeneración', 'klutz': 'Torpe', 'anger-point': 'Punto Ira',
  'download': 'Descarga', 'analytic': 'Analítico', 'multitype': 'Multitipo',
  'slow-start': 'Inicio Lento', 'poison-touch': 'Toque Tóxico',
  'unaware': 'Ignorante', 'unburden': 'Alivio', 'no-guard': 'Sin Guardia',
  'steadfast': 'Tenacidad', 'cute-charm': 'Engatuse', 'dry-skin': 'Piel Seca',
  'leaf-guard': 'Follaje', 'wind-rider': 'Correcaminos',
  'flash-fire': 'Absorbe Fuego', 'water-veil': 'Velo Agua',
  'reckless': 'Atrevido', 'multiscale': 'Multiscala', 'ice-body': 'Cuerpo Hielo',
  'rain-dish': 'Plato Lluvia', 'snow-cloak': 'Manto Nieve', 'simple': 'Sencillo',
  'illuminate': 'Iluminar', 'cute-charm': 'Engatuse', 'liquid-ooze': 'Babas',
  'overgrow': 'Espesura', 'blaze': 'Mar Llamas', 'torrent': 'Torrente',
  'swarm': 'Enjambre', 'run-away': 'Escape', 'guts': 'Agallas',
  'anticipation': 'Intuición', 'bad-dreams': 'Pesadilla',
  'quick-feet': 'Inicio Rápido',
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

function translateMove(enName) {
  return MOVE_NAME_ES[enName] || null;
}

function translateAbility(enName) {
  return ABILITY_NAME_ES[enName] || null;
}

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
  const abilities = pokemon.abilities.map(a => {
    const enName = a.ability.name;
    const esName = translateAbility(enName);
    return { en: enName, es: esName, isHidden: a.is_hidden };
  });

  // 2. Learnset from Gen 3 version groups
  const levelMoves = [];
  const machineMoves = [];

  const seenLevelMoves = new Set();
  const seenMachineMoves = new Set();

  pokemon.moves.forEach(moveEntry => {
    moveEntry.version_group_details.forEach(vgd => {
      if (TARGET_VERSIONS.includes(vgd.version_group.name)) {
        const enName = moveEntry.move.name;
        if (vgd.move_learn_method.name === 'level-up') {
          const key = `${enName}_${vgd.level_learned_at}`;
          if (!seenLevelMoves.has(enName)) {
            seenLevelMoves.add(enName);
            const esName = translateMove(enName);
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
            const esName = translateMove(enName);
            machineMoves.push({ en: enName, es: esName });
          }
        }
      }
    });
  });

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
