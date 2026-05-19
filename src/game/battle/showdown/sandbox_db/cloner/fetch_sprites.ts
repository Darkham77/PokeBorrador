import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// URLs base de Pokémon Showdown para Sprites
const BASE_URLS = {
  animatedFront: 'https://play.pokemonshowdown.com/sprites/ani/',
  animatedBack: 'https://play.pokemonshowdown.com/sprites/ani-back/',
  staticFront: 'https://play.pokemonshowdown.com/sprites/dex/',
  staticBack: 'https://play.pokemonshowdown.com/sprites/dex-back/',
};

// Rutas locales de almacenamiento dentro del sandbox
const OUTPUT_DIRS = {
  front: path.resolve('public/showdown/assets/front'),
  back: path.resolve('public/showdown/assets/back'),
};

/**
 * Helper para descargar un archivo con reintentos y fallback.
 */
async function downloadFile(url: string, destPath: string): Promise<boolean> {
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
 * Descarga los sprites para un Pokémon específico.
 * Primero intenta descargar los GIFs animados. Si fallan, aplica fallback a los PNGs estáticos.
 */
export async function downloadPokemonSprites(pokemonId: string): Promise<{
  front: { file: string; isAnimated: boolean };
  back: { file: string; isAnimated: boolean };
}> {
  const result = {
    front: { file: '', isAnimated: false },
    back: { file: '', isAnimated: false },
  };

  // Nombres de archivos destino
  const frontGifPath = path.join(OUTPUT_DIRS.front, `${pokemonId}.gif`);
  const frontPngPath = path.join(OUTPUT_DIRS.front, `${pokemonId}.png`);
  const backGifPath = path.join(OUTPUT_DIRS.back, `${pokemonId}.gif`);
  const backPngPath = path.join(OUTPUT_DIRS.back, `${pokemonId}.png`);

  // Descargar Sprite Frontal (Intentar Animado -> Fallback Estático)
  const frontGifUrl = `${BASE_URLS.animatedFront}${pokemonId}.gif`;
  const frontPngUrl = `${BASE_URLS.staticFront}${pokemonId}.png`;

  const frontSuccess = await downloadFile(frontGifUrl, frontGifPath);
  if (frontSuccess) {
    result.front = { file: `${pokemonId}.gif`, isAnimated: true };
  } else {
    // Fallback a estático PNG
    const frontPngSuccess = await downloadFile(frontPngUrl, frontPngPath);
    if (frontPngSuccess) {
      result.front = { file: `${pokemonId}.png`, isAnimated: false };
    }
  }

  // Descargar Sprite Trasero (Intentar Animado -> Fallback Estático)
  const backGifUrl = `${BASE_URLS.animatedBack}${pokemonId}.gif`;
  const backPngUrl = `${BASE_URLS.staticBack}${pokemonId}.png`;

  const backSuccess = await downloadFile(backGifUrl, backGifPath);
  if (backSuccess) {
    result.back = { file: `${pokemonId}.gif`, isAnimated: true };
  } else {
    // Fallback a estático PNG
    const backPngSuccess = await downloadFile(backPngUrl, backPngPath);
    if (backPngSuccess) {
      result.back = { file: `${pokemonId}.png`, isAnimated: false };
    }
  }

  return result;
}

/**
 * Asegura la existencia de los directorios de salida necesarios.
 */
export async function ensureDirsExist() {
  await fs.mkdir(OUTPUT_DIRS.front, { recursive: true });
  await fs.mkdir(OUTPUT_DIRS.back, { recursive: true });
}

/**
 * Orquesta la descarga de todos los sprites en lotes concurrentes con delay de cortesía.
 */
export async function downloadAllSprites(
  pokemonIds: string[],
  concurrencyLimit = 5,
  delayMs = 50
): Promise<Record<string, { front: string; frontAnimated: boolean; back: string; backAnimated: boolean }>> {
  await ensureDirsExist();
  const spriteMap: Record<string, { front: string; frontAnimated: boolean; back: string; backAnimated: boolean }> = {};

  const total = pokemonIds.length;
  console.log(`\n📥 Iniciando descarga de sprites para ${total} Pokémon en lotes de ${concurrencyLimit}...`);

  for (let i = 0; i < total; i += concurrencyLimit) {
    const batch = pokemonIds.slice(i, i + concurrencyLimit);
    
    // Descargar el lote actual en paralelo
    const promises = batch.map(async (id) => {
      const res = await downloadPokemonSprites(id);
      spriteMap[id] = {
        front: res.front.file,
        frontAnimated: res.front.isAnimated,
        back: res.back.file,
        backAnimated: res.back.isAnimated,
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

  console.log('✅ Descarga de sprites finalizada.');
  return spriteMap;
}
