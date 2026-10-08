import { logger } from '@/logic/utils/logger';
import { getPokemonCryFilename } from '@/data/pokemon/pokemonCriesDatabase.ts';
import { toID } from '@/logic/utils/strings.ts';

const cryCache = new Map<string, AudioBuffer>();
const cryPromiseCache = new Map<string, Promise<AudioBuffer>>();

async function fetchCryBuffer(name: string, ctx: AudioContext): Promise<AudioBuffer> {
  const safeName = encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
  const safeBase = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const cryUrl = new URL(`${safeBase}cries/${safeName}.mp3`, window.location.origin);
  // fallow-ignore-next-line security-sink
  const response = await fetch(cryUrl.href);
  if (!response.ok) {
    throw new Error(`Cry file not found: ${cryUrl.pathname}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error(`Cry file not found (HTML redirect fallback): ${cryUrl.pathname}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

export async function playPokemonCry(
  pokemonName: string,
  ctx: AudioContext,
  dest: AudioNode,
  isFaint = false
): Promise<void> {
  const cleanName = toID(pokemonName);
  const cryToFetch = getPokemonCryFilename(cleanName);

  let buffer = cryCache.get(cryToFetch);

  if (!buffer) {
    const fetchPromise = cryPromiseCache.getOrInsertComputed(cryToFetch, () => fetchCryBuffer(cryToFetch, ctx));
    try {
      buffer = await fetchPromise;
      cryCache.set(cryToFetch, buffer);
      if (cryToFetch !== cleanName) {
        cryCache.set(cleanName, buffer);
      }
    } catch (err) {
      cryPromiseCache.delete(cryToFetch);
      logger.error('Audio', `Failed to load cry for ${pokemonName} (resolved to ${cryToFetch}): ${String(err)}`);
      return;
    }
  }

  if (!buffer) return;

  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (isFaint) {
      source.playbackRate.setValueAtTime(0.6, ctx.currentTime);
    } else {
      source.playbackRate.setValueAtTime(1.0, ctx.currentTime);
    }
    source.connect(dest);
    source.start(ctx.currentTime);
  } catch (err) {
    logger.error('Audio', `Failed to play cry for ${pokemonName}: ${String(err)}`);
  }
}
