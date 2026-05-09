/**
 * scripts/download_assets.ts
 * 
 * ASSET DOWNLOADER (Node.js 26+)
 * 
 * Migración de download_assets.py a TypeScript.
 * Utiliza APIs nativas (fetch, node:fs, node:path) y soporta el modelo de permisos de Node 26.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

// Speed up execution
enableCompileCache();

// Verificar permisos en runtime (Node.js 26+)
if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Este script requiere permisos de lectura. Ejecútalo con --permission --allow-fs-read=.\n'));
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(process.cwd(), 'external_assets');
const POKEAPI_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEAPI_ITEM_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
const SHOWDOWN_TRAINER_BASE = 'https://play.pokemonshowdown.com/sprites/trainers/';

const ITEM_MAPPING: Record<string, string> = {
  'pocion': 'potion',
  'super_pocion': 'super-potion',
  'hiper_pocion': 'hyper-potion',
  'pocion_max': 'max-potion',
  'revivir_max': 'max-revive',
  'quemadura': 'burn-heal',
  'despertar': 'awakening',
  'cura_total': 'full-heal',
  'elixir': 'ether',
  'elixir_max': 'max-elixir',
  'piedra_fuego': 'fire-stone',
  'piedra_agua': 'water-stone',
  'piedra_trueno': 'thunder-stone',
  'piedra_hoja': 'leaf-stone',
  'piedra_luna': 'moon-stone',
  'pokeball': 'poke-ball',
  'pokéball': 'poke-ball',
  'superball': 'super-ball',
  'super-ball': 'super-ball',
  'super ball': 'super-ball',
  'súper ball': 'super-ball',
  'ultraball': 'ultra-ball',
  'ultra-ball': 'ultra-ball',
  'ultra ball': 'ultra-ball',
  'masterball': 'master-ball',
  'master-ball': 'master-ball',
  'master ball': 'master-ball',
  'turnoball': 'timer-ball',
  'turno ball': 'timer-ball',
  'repelente': 'repel',
  'super_repel': 'super-repel',
  'max_repel': 'max-repel',
  'huevo_suerte': 'lucky-egg',
  'huevo_suerte_pequeño': 'lucky-egg',
  'compartir_exp': 'exp-share',
  'restos': 'leftovers',
  'cascabel_concha': 'shell-bell',
  'cinta_elegida': 'choice-band',
  'banda_focus': 'focus-sash',
  'lente_zoom': 'scope-lens',
  'caramelo_raro': 'rare-candy',
  'subida_de_pp': 'pp-up',
  'moneda_amuleto': 'amulet-coin',
  'bola_luminosa': 'light-ball',
  'hueso_grueso': 'thick-club',
  'palo': 'stick',
  'polvo_metálico': 'metal-powder',
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
  'restaurador_vigor': 'rare-candy'
};

const showdownTrainers = [
  'cazabichos', 'entrenador', 'criador', 'tamer', 'teamrocket'
];

async function downloadFile(url: string, folder: string, filename: string) {
  await fs.mkdir(folder, { recursive: true });
  const filepath = path.join(folder, filename);
  
  try {
    await fs.access(filepath);
    // console.log(styleText('gray', `   ⏩ Skipping ${filename}, already exists.`));
    return;
  } catch {
    // File doesn't exist, proceed
  }

  try {
    console.log(styleText('cyan', `   📥 Downloading ${url}...`));
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(arrayBuffer));
  } catch (e: unknown) {
    console.error(styleText('red', `   ❌ Error downloading ${url}: ${(e as Error).message}`));
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      pokemon: { type: 'boolean' },
      items: { type: 'boolean' },
      trainers: { type: 'boolean' },
      all: { type: 'boolean', default: true }
    }
  });

  const downloadAll = values.all && !values.pokemon && !values.items && !values.trainers;

  console.log(styleText('bold', '\n--- 📥 ASSET DOWNLOADER ---'));

  // 1. POKEMON (1-251)
  if (downloadAll || values.pokemon) {
    console.log(styleText('yellow', '\n📦 Fetching Pokemon sprites (Gen 1-2)...'));
    const pokeFolder = path.join(OUTPUT_DIR, 'pokemon');
    
    const downloadPromises = [];
    for (let i = 1; i <= 251; i++) {
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}${i}.png`, pokeFolder, `${i}.png`));
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}shiny/${i}.png`, path.join(pokeFolder, 'shiny'), `${i}.png`));
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}back/${i}.png`, path.join(pokeFolder, 'back'), `${i}.png`));
      downloadPromises.push(downloadFile(`${POKEAPI_SPRITE_BASE}back/shiny/${i}.png`, path.join(pokeFolder, 'back', 'shiny'), `${i}.png`));
      
      if (downloadPromises.length >= 20) {
        await Promise.all(downloadPromises);
        downloadPromises.length = 0;
      }
    }
    await Promise.all(downloadPromises);
  }

  // 2. ITEMS
  if (downloadAll || values.items) {
    console.log(styleText('yellow', '\n📦 Fetching Item sprites...'));
    const itemFolder = path.join(OUTPUT_DIR, 'items');
    const itemPromises = [];
    
    for (const [_, slug] of Object.entries(ITEM_MAPPING)) {
      itemPromises.push(downloadFile(`${POKEAPI_ITEM_BASE}${slug}.png`, itemFolder, `${slug}.png`));
    }
    itemPromises.push(downloadFile(`${POKEAPI_ITEM_BASE}egg.png`, itemFolder, 'egg.png'));
    await Promise.all(itemPromises);
  }

  // 3. TRAINERS
  if (downloadAll || values.trainers) {
    console.log(styleText('yellow', '\n📦 Fetching Trainer sprites...'));
    const trainerFolder = path.join(OUTPUT_DIR, 'trainers');
    const trainerPromises = [];
    
    for (const t of showdownTrainers) {
      trainerPromises.push(downloadFile(`${SHOWDOWN_TRAINER_BASE}${t}.png`, trainerFolder, `${t}.png`));
    }
    await Promise.all(trainerPromises);
  }

  console.log(styleText('green', `\n✨ Download complete! Assets are in: ${OUTPUT_DIR}\n`));
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${err.message}`));
  process.exit(1);
});
