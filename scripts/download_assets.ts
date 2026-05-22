/**
 * scripts/download_assets.ts
 * 
 * UNIVERSAL ASSET DOWNLOADER (Node.js 26+)
 * 
 * Downloads sprites for Pokémon (Gens 1-9), Items, and Trainers.
 * Default behavior: Download EVERYTHING.
 * Supports flags for selective download and limits.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

// Speed up execution
enableCompileCache();

// Permissions check (Node.js 26+)
if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Requirements read permissions. Run with --permission --allow-fs-read=.\n'));
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'external_assets');
const POKEAPI_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEAPI_ITEM_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
const SHOWDOWN_TRAINER_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/';

const TOTAL_POKEMON_SPECIES = 1025; // Gen 1-9

const ITEM_MAPPING: Record<string, string> = {
  'pocion': 'potion',
  'super_pocion': 'super-potion',
  'hiper_pocion': 'hyper-potion',
  'pocion_max': 'max-potion',
  'restaurar_todo': 'full-restore',
  'revivir': 'revive',
  'revivir_max': 'max-revive',
  'quemadura': 'burn-heal',
  'despertar': 'awakening',
  'cura_total': 'full-heal',
  'elixir': 'elixir',
  'iman': 'magnet',
  'elixir_max': 'max-elixir',
  'piedra_fuego': 'fire-stone',
  'piedra_agua': 'water-stone',
  'piedra_trueno': 'thunder-stone',
  'piedra_hoja': 'leaf-stone',
  'piedra_luna': 'moon-stone',
  'piedra_solar': 'sun-stone',
  'piedra_dia': 'shiny-stone',
  'piedra_noche': 'dusk-stone',
  'piedra_alba': 'dawn-stone',
  'piedra_hielo': 'ice-stone',
  'pokeball': 'poke-ball',
  'superball': 'super-ball',
  'ultraball': 'ultra-ball',
  'masterball': 'master-ball',
  'turnoball': 'timer-ball',
  'velozball': 'quick-ball',
  'ocasoball': 'dusk-ball',
  'malla_ball': 'net-ball',
  'nido_ball': 'nest-ball',
  'buceo_ball': 'dive-ball',
  'lujo_ball': 'luxury-ball',
  'repelente': 'repel',
  'super_repel': 'super-repel',
  'max_repel': 'max-repel',
  'huevo_suerte': 'lucky-egg',
  'huevo_suerte_pequeño': 'lucky-egg',
  'compartir_exp': 'exp-share',
  'restos': 'leftovers',
  'cascabel_concha': 'shell-bell',
  'cinta_elegida': 'choice-band',
  'gafas_elegidas': 'choice-specs',
  'panuelo_elegido': 'choice-scarf',
  'banda_focus': 'focus-sash',
  'lente_zoom': 'scope-lens',
  'caramelo_raro': 'rare-candy',
  'subida_de_pp': 'pp-up',
  'max_pp': 'pp-max',
  'moneda_amuleto': 'amulet-coin',
  'bola_luminosa': 'light-ball',
  'hueso_grueso': 'thick-club',
  'palo': 'stick',
  'polvo_metalico': 'metal-powder',
  'cuchara_torcida': 'twisted-spoon',
  'hechizo': 'spell-tag',
  'pesa_recia': 'power-weight',
  'brazal_recia': 'power-bracer',
  'cinto_recia': 'power-belt',
  'lente_recia': 'power-lens',
  'banda_recia': 'power-band',
  'franja_recia': 'power-anklet',
  'lazo_destino': 'destiny-knot',
  'piedra_eterna': 'everstone',
  'baya_aranja': 'oran-berry',
  'baya_zidra': 'sitrus-berry',
  'baya_ziuela': 'lum-berry',
  'baya_atake': 'liechi-berry',
  'baya_aslac': 'salac-berry',
  'mineral_evolutivo': 'eviolite',
  'vidaesfera': 'life-orb',
  'refresco': 'soda-pop',
  'limonada': 'lemonade',
  'carbon': 'charcoal',
  'agua_mistica': 'mystic-water',
  'semilla_milagro': 'miracle-seed',
  'colmillodragon': 'dragon-fang',
  'escama_dragon': 'dragon-scale',
  'polvo_plata': 'silver-powder',
  'flecha_venenosa': 'poison-barb',
  'trozo_estrella': 'star-piece',
  'polvo_estelar': 'stardust',
  'perla_grande': 'big-pearl',
  'perla': 'pearl'
};

const showdownTrainers = [
  'cazabichos', 'entrenador', 'criador', 'tamer', 'teamrocket',
  'ace-trainer', 'acetrainer-f', 'acetrainer', 'beauty', 'birdkeeper',
  'blackbelt', 'cyclist', 'dragontamer', 'elitefour', 'expert',
  'gentleman', 'gymleader', 'hiker', 'juggler', 'lass', 'picnicker',
  'psychic', 'ranger', 'richboy', 'roughneck', 'scientist', 'swimmer',
  'tuber', 'veteran', 'youngster'
];

async function downloadFile(url: string, folder: string, filename: string) {
  await fs.mkdir(folder, { recursive: true });
  const filepath = path.join(folder, filename);
  
  try {
    await fs.access(filepath);
    return;
  } catch {
    // Proceed
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(arrayBuffer));
    console.log(styleText('gray', `   ✅ Saved ${filename}`));
  } catch (_e: unknown) {
    // console.error(styleText('red', `   ❌ Error ${url}: ${(e as Error).message}`));
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      pokemon: { type: 'boolean' },
      items: { type: 'boolean' },
      trainers: { type: 'boolean' },
      showdown: { type: 'boolean' },
      limit: { type: 'string' }
    }
  });

  const noFlags = !values.pokemon && !values.items && !values.trainers && !values.showdown;
  const doPokemon = noFlags || values.pokemon;
  const doItems = noFlags || values.items;
  const doTrainers = noFlags || values.trainers;
  // --showdown es siempre opt-in: no se incluye en el "download all" para no requerir @pkmn/sim por defecto
  const doShowdown = values.showdown ?? false;
  const pokemonLimit = values.limit ? parseInt(values.limit) : TOTAL_POKEMON_SPECIES;

  console.log(styleText('bold', '\n--- 📥 UNIVERSAL ASSET DOWNLOADER ---'));
  if (noFlags) console.log(styleText('italic', 'No flags detected. Downloading EVERYTHING (Full Dex + Items + Trainers)...\n'));

  // 1. POKEMON
  if (doPokemon) {
    console.log(styleText('yellow', `\n📦 Fetching Pokemon sprites (1 to ${pokemonLimit})...`));
    const pokeFolder = path.join(OUTPUT_DIR, 'pokemon');
    
    let downloadPromises = [];
    for (let i = 1; i <= pokemonLimit; i++) {
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}${i}.png`, pokeFolder, `${i}.png`));
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}shiny/${i}.png`, path.join(pokeFolder, 'shiny'), `${i}.png`));
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}back/${i}.png`, path.join(pokeFolder, 'back'), `${i}.png`));
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}back/shiny/${i}.png`, path.join(pokeFolder, 'back', 'shiny'), `${i}.png`));
      
      if (downloadPromises.length >= 40) {
        await Promise.all(downloadPromises);
        downloadPromises = [];
        process.stdout.write(styleText('gray', '.'));
      }
    }
    await Promise.all(downloadPromises);
    console.log(styleText('green', '\n✅ Pokemon sprites complete.'));
  }

  // 2. ITEMS
  if (doItems) {
    console.log(styleText('yellow', '\n📦 Fetching mapped items...'));
    const itemFolder = path.join(OUTPUT_DIR, 'items');
    const itemPromises = [];
    for (const [_, slug] of Object.entries(ITEM_MAPPING)) {
      itemPromises.push(downloadFile(`${POKEAPI_ITEM_BASE}${slug}.png`, itemFolder, `${slug}.png`));
    }
    itemPromises.push(downloadFile(`${POKEAPI_ITEM_BASE}egg.png`, itemFolder, 'egg.png'));
    await Promise.all(itemPromises);
    console.log(styleText('green', '✅ Item sprites complete.'));
  }

  // 3. TRAINERS
  if (doTrainers) {
    console.log(styleText('yellow', '\n📦 Fetching extended trainer archetypes...'));
    const trainerFolder = path.join(OUTPUT_DIR, 'trainers');
    const trainerPromises = [];
    for (const t of showdownTrainers) {
      trainerPromises.push(downloadFile(`${SHOWDOWN_TRAINER_BASE}${t}.png`, trainerFolder, `${t}.png`));
    }
    await Promise.all(trainerPromises);
    console.log(styleText('green', '✅ Trainer sprites complete.'));
  }

  // 4. SHOWDOWN SPRITES (todas las generaciones, desde play.pokemonshowdown.com)
  if (doShowdown) {
    console.log(styleText('yellow', '\n📦 Fetching Showdown sprites + cries (all gens)...'));
    const { Dex } = await import('@pkmn/sim');
    const { downloadAllSprites } = await import('../showdown/sandbox_db/cloner/fetch_sprites.ts');

    // isNonstandard: null=estándar, 'Past'=Dexit (reales), 'CAP'/'LGPE'/'Unobtainable'=excluir
    const fullDex = Dex.forGen(9);
    let pokemonIds = fullDex.species.all()
      .filter(s => s.isNonstandard === null || s.isNonstandard === 'Past')
      .map(s => s.id);

    if (values.limit) {
      const lim = parseInt(values.limit);
      if (!isNaN(lim)) pokemonIds = pokemonIds.slice(0, lim);
    }

    console.log(styleText('gray', `   ${pokemonIds.length} Pokémon found across all generations.`));
    await downloadAllSprites(pokemonIds, 5, 50);
    console.log(styleText('green', '✅ Showdown sprites complete.'));
  }

  console.log(styleText('bold', styleText('green', `\n✨ ALL ASSETS UPDATED in ${OUTPUT_DIR}\n`)));
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${err.message}`));
  process.exit(1);
});
