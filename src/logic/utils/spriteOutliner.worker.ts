const CACHE_NAME = 'sprite-outlines-v1';

// Helpers for caching blobs
async function getFromCache(cacheKey: string): Promise<Blob | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return await cachedResponse.blob();
    }
  } catch (e) {
    console.warn('[SpriteWorker] Cache match failed:', e);
  }
  return null;
}

const ONE_YEAR_CACHE_MAX_AGE_SEC = 31536000;

async function saveToCache(cacheKey: string, blob: Blob): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      cacheKey,
      new Response(blob, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': `public, max-age=${ONE_YEAR_CACHE_MAX_AGE_SEC}, immutable`
        }
      })
    );
  } catch (e) {
    console.warn('[SpriteWorker] Cache save failed:', e);
  }
}

const ALLOWED_SPRITE_HOST_VALUES = [
  'raw.githubusercontent.com',
  'play.pokemonshowdown.com',
  'localhost',
  '127.0.0.1'
] as const;
const ALLOWED_SPRITE_HOSTS: ReadonlySet<string> = new Set<string>(ALLOWED_SPRITE_HOST_VALUES);

// Fetch image and create ImageBitmap
async function loadImageBitmap(rawUrl: string): Promise<ImageBitmap> {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('Invalid sprite URL: URL string is empty');
  }

  if (rawUrl.startsWith('data:image/')) {
    // fallow-ignore-next-line security-sink
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`Failed to load data URL (status: ${res.status})`);
    const blob = await res.blob();
    return createImageBitmap(blob);
  }

  const parsed = new URL(rawUrl, globalThis.location.origin);
  if (parsed.origin !== globalThis.location.origin && !ALLOWED_SPRITE_HOSTS.has(parsed.hostname)) {
    throw new Error(`Forbidden sprite URL host: ${parsed.hostname}`);
  }

  // fallow-ignore-next-line security-sink
  const res = await fetch(parsed.href);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from URL: ${parsed.pathname} (status: ${res.status})`);
  }
  const blob = await res.blob();
  return createImageBitmap(blob);
}

import type { SpriteOutlineType } from './spriteOutliner.ts';
import { renderSpriteOutline } from './spriteOutlinerRenderer.ts';

function createColorMask(
  img: ImageBitmap,
  fillColor: string
): { canvas: OffscreenCanvas; ctx: OffscreenCanvasRenderingContext2D } {
  const tempCanvas = new OffscreenCanvas(img.width, img.height);
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get temp 2D context');

  tempCtx.drawImage(img, 0, 0);
  tempCtx.globalCompositeOperation = 'source-in';
  tempCtx.fillStyle = fillColor;
  tempCtx.fillRect(0, 0, img.width, img.height);
  return { canvas: tempCanvas, ctx: tempCtx };
}

// Process sprite outlines or silhouettes
async function processSprite(img: ImageBitmap, type: SpriteOutlineType): Promise<Blob> {
  const r = type === 'silhouette' ? 1 : 3;
  const padding = type === 'silhouette' ? 4 : r;

  const width = img.width + padding * 2;
  const height = img.height + padding * 2;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');

  const { canvas: tempCanvas, ctx: tempCtx } = createColorMask(
    img,
    type === 'silhouette' ? '#ffffff' : '#000000'
  );

  renderSpriteOutline(ctx, tempCanvas, tempCtx, img, img.width, img.height, type, r, padding);

  return canvas.convertToBlob({ type: 'image/png' });
}

// Process blurred colorful auras
async function processAura(img: ImageBitmap, fillColor: string, blurRadius: number): Promise<Blob> {
  const padding = Math.ceil(blurRadius * 2) + 2;
  const width = img.width + padding * 2;
  const height = img.height + padding * 2;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from OffscreenCanvas');

  const { canvas: tempCanvas } = createColorMask(img, fillColor);

  // Draw onto main canvas with blur
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(tempCanvas, padding, padding);
  ctx.filter = 'none';

  return canvas.convertToBlob({ type: 'image/png' });
}

export const SPRITE_OUTLINER_ACTIONS = ['sprite', 'aura'] as const;
export type SpriteOutlinerAction = (typeof SPRITE_OUTLINER_ACTIONS)[number];

// Worker message router
interface SpriteOutlinerMessage {
  jobId: string;
  action: SpriteOutlinerAction;
  url: string;
  type: SpriteOutlineType;
  fillColor: string;
  blurRadius: number;
}

globalThis.addEventListener('message', async (event: MessageEvent) => {
  const data = event.data as SpriteOutlinerMessage;
  const { jobId, action, url, type, fillColor, blurRadius } = data;

  if (action === 'sprite') {
    const cacheKey = `https://outliner.local/sprite?url=${encodeURIComponent(url)}&type=${type}`;
    try {
      // 1. Try Cache Storage
      const cachedBlob = await getFromCache(cacheKey);
      if (cachedBlob) {
        globalThis.postMessage({ jobId, success: true, blob: cachedBlob });
        return;
      }

      // 2. Process
      const img = await loadImageBitmap(url);
      const processedBlob = await processSprite(img, type);

      // 3. Save to Cache and respond
      await saveToCache(cacheKey, processedBlob);
      globalThis.postMessage({ jobId, success: true, blob: processedBlob });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      globalThis.postMessage({ jobId, success: false, error: errorMsg });
    }
  } else if (action === 'aura') {
    const cacheKey = `https://outliner.local/aura?url=${encodeURIComponent(url)}&color=${encodeURIComponent(fillColor)}&blur=${blurRadius}`;
    try {
      // 1. Try Cache Storage
      const cachedBlob = await getFromCache(cacheKey);
      if (cachedBlob) {
        globalThis.postMessage({ jobId, success: true, blob: cachedBlob });
        return;
      }

      // 2. Process
      const img = await loadImageBitmap(url);
      const processedBlob = await processAura(img, fillColor, blurRadius);

      // 3. Save to Cache and respond
      await saveToCache(cacheKey, processedBlob);
      globalThis.postMessage({ jobId, success: true, blob: processedBlob });
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      globalThis.postMessage({ jobId, success: false, error: errorMsg });
    }
  }
});
