import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// URLs base de Pokémon Showdown para Sprites y Audio
const BASE_URLS = {
  animatedFront: 'https://play.pokemonshowdown.com/sprites/ani/',
  animatedBack: 'https://play.pokemonshowdown.com/sprites/ani-back/',
  staticFront: 'https://play.pokemonshowdown.com/sprites/dex/',
  staticBack: 'https://play.pokemonshowdown.com/sprites/dex-back/',
  animatedFrontShiny: 'https://play.pokemonshowdown.com/sprites/ani-shiny/',
  animatedBackShiny: 'https://play.pokemonshowdown.com/sprites/ani-back-shiny/',
  staticFrontShiny: 'https://play.pokemonshowdown.com/sprites/dex-shiny/',
  staticBackShiny: 'https://play.pokemonshowdown.com/sprites/dex-back-shiny/',
  cries: 'https://play.pokemonshowdown.com/audio/cries/',
};

// Rutas locales de almacenamiento dentro de public
const OUTPUT_DIRS = {
  front: path.resolve('public/showdown/assets/front'),
  back: path.resolve('public/showdown/assets/back'),
  frontShiny: path.resolve('public/showdown/assets/front-shiny'),
  backShiny: path.resolve('public/showdown/assets/back-shiny'),
  cries: path.resolve('public/showdown/assets/cries'),
};

/**
 * Helper para descargar un archivo con reintentos y fallback.
 */
async function downloadFile(url: string, destPath: string): Promise<boolean> {
  // Verificar si el archivo ya existe localmente para evitar descargas redundantes
  try {
    const stat = await fs.stat(destPath);
    if (stat.size > 0) {
      return true;
    }
  } catch {
    // El archivo no existe, proceder con la descarga
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return false;
    }
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Descarga los sprites y gritos para un Pokémon específico.
 */
export async function downloadPokemonAssets(pokemonId: string): Promise<{
  front: { file: string; isAnimated: boolean };
  back: { file: string; isAnimated: boolean };
  frontShiny: { file: string; isAnimated: boolean };
  backShiny: { file: string; isAnimated: boolean };
  cry: { file: string };
}> {
  const result = {
    front: { file: '', isAnimated: false },
    back: { file: '', isAnimated: false },
    frontShiny: { file: '', isAnimated: false },
    backShiny: { file: '', isAnimated: false },
    cry: { file: '' },
  };

  // 1. Descargar Sprite Frontal Normal (Intentar Animado -> Fallback Estático)
  const frontGifPath = path.join(OUTPUT_DIRS.front, `${pokemonId}.gif`);
  const frontPngPath = path.join(OUTPUT_DIRS.front, `${pokemonId}.png`);
  if (await downloadFile(`${BASE_URLS.animatedFront}${pokemonId}.gif`, frontGifPath)) {
    result.front = { file: `${pokemonId}.gif`, isAnimated: true };
  } else if (await downloadFile(`${BASE_URLS.staticFront}${pokemonId}.png`, frontPngPath)) {
    result.front = { file: `${pokemonId}.png`, isAnimated: false };
  }

  // 2. Descargar Sprite Trasero Normal (Intentar Animado -> Fallback Estático)
  const backGifPath = path.join(OUTPUT_DIRS.back, `${pokemonId}.gif`);
  const backPngPath = path.join(OUTPUT_DIRS.back, `${pokemonId}.png`);
  if (await downloadFile(`${BASE_URLS.animatedBack}${pokemonId}.gif`, backGifPath)) {
    result.back = { file: `${pokemonId}.gif`, isAnimated: true };
  } else if (await downloadFile(`${BASE_URLS.staticBack}${pokemonId}.png`, backPngPath)) {
    result.back = { file: `${pokemonId}.png`, isAnimated: false };
  }

  // 3. Descargar Sprite Frontal Shiny (Intentar Animado -> Fallback Estático)
  const frontShinyGifPath = path.join(OUTPUT_DIRS.frontShiny, `${pokemonId}.gif`);
  const frontShinyPngPath = path.join(OUTPUT_DIRS.frontShiny, `${pokemonId}.png`);
  if (await downloadFile(`${BASE_URLS.animatedFrontShiny}${pokemonId}.gif`, frontShinyGifPath)) {
    result.frontShiny = { file: `${pokemonId}.gif`, isAnimated: true };
  } else if (await downloadFile(`${BASE_URLS.staticFrontShiny}${pokemonId}.png`, frontShinyPngPath)) {
    result.frontShiny = { file: `${pokemonId}.png`, isAnimated: false };
  }

  // 4. Descargar Sprite Trasero Shiny (Intentar Animado -> Fallback Estático)
  const backShinyGifPath = path.join(OUTPUT_DIRS.backShiny, `${pokemonId}.gif`);
  const backShinyPngPath = path.join(OUTPUT_DIRS.backShiny, `${pokemonId}.png`);
  if (await downloadFile(`${BASE_URLS.animatedBackShiny}${pokemonId}.gif`, backShinyGifPath)) {
    result.backShiny = { file: `${pokemonId}.gif`, isAnimated: true };
  } else if (await downloadFile(`${BASE_URLS.staticBackShiny}${pokemonId}.png`, backShinyPngPath)) {
    result.backShiny = { file: `${pokemonId}.png`, isAnimated: false };
  }

  // 5. Descargar Grito (Audio) en formato MP3 (con fallback a ogg por si acaso)
  const cryMp3Path = path.join(OUTPUT_DIRS.cries, `${pokemonId}.mp3`);
  const cryOggPath = path.join(OUTPUT_DIRS.cries, `${pokemonId}.ogg`);
  if (await downloadFile(`${BASE_URLS.cries}${pokemonId}.mp3`, cryMp3Path)) {
    result.cry = { file: `${pokemonId}.mp3` };
  } else if (await downloadFile(`${BASE_URLS.cries}${pokemonId}.ogg`, cryOggPath)) {
    result.cry = { file: `${pokemonId}.ogg` };
  }

  return result;
}

/**
 * Asegura la existencia de los directorios de salida necesarios.
 */
export async function ensureDirsExist() {
  for (const dir of Object.values(OUTPUT_DIRS)) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Orquesta la descarga de todos los sprites y sonidos en lotes concurrentes con delay de cortesía.
 */
export async function downloadAllSprites(
  pokemonIds: string[],
  concurrencyLimit = 5,
  delayMs = 50
): Promise<Record<string, {
  front: string;
  frontAnimated: boolean;
  back: string;
  backAnimated: boolean;
  frontShiny: string;
  frontShinyAnimated: boolean;
  backShiny: string;
  backShinyAnimated: boolean;
  cry: string;
}>> {
  await ensureDirsExist();
  const assetMap: Record<string, {
    front: string;
    frontAnimated: boolean;
    back: string;
    backAnimated: boolean;
    frontShiny: string;
    frontShinyAnimated: boolean;
    backShiny: string;
    backShinyAnimated: boolean;
    cry: string;
  }> = {};

  const total = pokemonIds.length;
  console.log(`\n📥 Iniciando descarga de sprites (normal/shiny) y sonidos para ${total} Pokémon en lotes de ${concurrencyLimit}...`);

  for (let i = 0; i < total; i += concurrencyLimit) {
    const batch = pokemonIds.slice(i, i + concurrencyLimit);
    
    // Descargar el lote actual en paralelo
    const promises = batch.map(async (id) => {
      const res = await downloadPokemonAssets(id);
      assetMap[id] = {
        front: res.front.file,
        frontAnimated: res.front.isAnimated,
        back: res.back.file,
        backAnimated: res.back.isAnimated,
        frontShiny: res.frontShiny.file,
        frontShinyAnimated: res.frontShiny.isAnimated,
        backShiny: res.backShiny.file,
        backShinyAnimated: res.backShiny.isAnimated,
        cry: res.cry.file,
      };
    });

    await Promise.all(promises);
    
    const progress = Math.min(i + concurrencyLimit, total);
    console.log(`[Progreso] ${progress}/${total} Pokémon procesados...`);

    // Delay de cortesía para evitar rate-limits
    if (i + concurrencyLimit < total && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log('✅ Descarga de todos los recursos (comunes, shinies y gritos) finalizada.');
  return assetMap;
}
