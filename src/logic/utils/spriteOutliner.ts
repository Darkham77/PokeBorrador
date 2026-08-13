export type SpriteOutlineType = 'outline' | 'silhouette';

const outlineCache = new Map<string, string>();
const processingCache = new Map<string, Promise<string>>();

const auraCache = new Map<string, string>();
const auraProcessingCache = new Map<string, Promise<string>>();

// Web Worker state management
let spriteWorker: Worker | null = null;
let jobCounter = 0;
const pendingJobs = new Map<
  number,
  {
    resolve: (val: string) => void;
    reject: (err: Error) => void;
    originalUrl: string;
  }
>();

/**
 * Instantiates the Web Worker lazily and configures message handling.
 */
function getWorker(): Worker | null {
  if (typeof window === 'undefined' || !window.Worker || !window.OffscreenCanvas) {
    return null;
  }
  
  if (!spriteWorker) {
    try {
      spriteWorker = new Worker(
        new URL('./spriteOutliner.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      spriteWorker.onmessage = (event) => {
        const payload = event.data as { jobId: number; success: boolean; blob: Blob | null; error?: string };
        const { jobId, success, blob, error } = payload;
        const job = pendingJobs.get(jobId);
        if (!job) return;
        
        pendingJobs.delete(jobId);
        if (success && blob) {
          try {
            const objectUrl = URL.createObjectURL(blob);
            job.resolve(objectUrl);
          } catch (urlErr) {
            console.warn('[SpriteOutliner] Failed to create object URL:', urlErr);
            job.resolve(job.originalUrl);
          }
        } else {
          console.warn('[SpriteOutliner] Worker job failed, using fallback:', error);
          job.resolve(job.originalUrl);
        }
      };
      
      spriteWorker.onerror = (err) => {
        // Resolve all pending jobs with their originalUrl so callers do not hang
        for (const [, job] of pendingJobs) {
          job.resolve(job.originalUrl);
        }
        pendingJobs.clear();
        err.preventDefault();
      };
    } catch (err) {
      console.warn('[SpriteOutliner] Failed to initialize Web Worker, falling back:', err);
      spriteWorker = null;
    }
  }
  return spriteWorker;
}

/**
 * Loads an image from a URL and returns an HTMLImageElement (Fallback only).
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
}

/**
 * Fallback sprite processor executing canvas operations in the main thread.
 * Used only when Web Workers or OffscreenCanvas are unavailable.
 */
async function processSpriteFallback(
  originalUrl: string,
  type: SpriteOutlineType
): Promise<string> {
  const img = await loadImage(originalUrl);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from canvas');

  const r = type === 'silhouette' ? 1 : 3;
  const padding = type === 'silhouette' ? 4 : r;
  
  canvas.width = img.naturalWidth + padding * 2;
  canvas.height = img.naturalHeight + padding * 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get 2D context from temp canvas');

  tempCtx.drawImage(img, 0, 0);
  tempCtx.globalCompositeOperation = 'source-in';
  tempCtx.fillStyle = type === 'silhouette' ? '#ffffff' : '#000000';
  tempCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

  if (type === 'silhouette') {
    ctx.filter = 'blur(2px)';
  }
  
  for (let x = -r; x <= r; x++) {
    for (let y = -r; y <= r; y++) {
      if (x * x + y * y > r * r) continue;
      ctx.drawImage(tempCanvas, padding + x, padding + y);
    }
  }

  if (type === 'silhouette') {
    ctx.filter = 'none';
  }

  if (type === 'silhouette') {
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
    ctx.drawImage(tempCanvas, padding, padding);
  } else {
    ctx.drawImage(img, padding, padding);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generates an outlined or silhouette version of a sprite dynamically.
 * Delegates work to a Web Worker, falling back to main-thread canvas if unavailable.
 */
export function getProcessedSprite(
  originalUrl: string,
  type: SpriteOutlineType
): Promise<string> {
  const cacheKey = `${originalUrl}-${type}`;

  // 1. Check in-memory session cache
  if (outlineCache.has(cacheKey)) {
    return Promise.resolve(outlineCache.get(cacheKey)!);
  }

  // 2. Check if already processing
  if (processingCache.has(cacheKey)) {
    return processingCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const worker = getWorker();
      let resultUrl = '';
      
      if (worker) {
        // Delegate to Web Worker asynchronously
        resultUrl = await new Promise<string>((resolve, reject) => {
          const jobId = ++jobCounter;
          pendingJobs.set(jobId, { resolve, reject, originalUrl });
          worker.postMessage({
            jobId,
            action: 'sprite',
            url: originalUrl,
            type
          });
        });
      } else {
        // Main thread fallback (e.g. JSDom / tests)
        resultUrl = await processSpriteFallback(originalUrl, type);
      }
      
      outlineCache.set(cacheKey, resultUrl);
      return resultUrl;
    } catch (error) {
      console.warn('[SpriteOutliner] Failed to generate outline for:', originalUrl, error);
      return originalUrl;
    } finally {
      processingCache.delete(cacheKey);
    }
  })();

  processingCache.set(cacheKey, promise);
  return promise;
}

/**
 * Fallback aura processor executing canvas operations in the main thread.
 * Used only when Web Workers or OffscreenCanvas are unavailable.
 */
async function processAuraFallback(
  maskUrl: string,
  fillColor: string,
  blurRadius: number
): Promise<string> {
  const img = await loadImage(maskUrl);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context from canvas');

  const padding = Math.ceil(blurRadius * 2) + 2;
  canvas.width = img.naturalWidth + padding * 2;
  canvas.height = img.naturalHeight + padding * 2;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.naturalWidth;
  tempCanvas.height = img.naturalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get 2D context from temp canvas');

  tempCtx.drawImage(img, 0, 0);
  tempCtx.globalCompositeOperation = 'source-in';
  tempCtx.fillStyle = fillColor;
  tempCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(tempCanvas, padding, padding);
  ctx.filter = 'none';

  return canvas.toDataURL('image/png');
}

/**
 * Pre-renders an aura with color and Gaussian blur from a monochrome mask texture.
 * Delegates to a Web Worker if available, falling back to main-thread canvas.
 */
export function getProcessedAura(
  maskUrl: string,
  fillColor: string,
  blurRadius: number
): Promise<string> {
  const cacheKey = `${maskUrl}-${fillColor}-${blurRadius}`;

  if (auraCache.has(cacheKey)) {
    return Promise.resolve(auraCache.get(cacheKey)!);
  }

  if (auraProcessingCache.has(cacheKey)) {
    return auraProcessingCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const worker = getWorker();
      let resultUrl = '';
      
      if (worker) {
        // Delegate to Web Worker asynchronously
        resultUrl = await new Promise<string>((resolve, reject) => {
          const jobId = ++jobCounter;
          pendingJobs.set(jobId, { resolve, reject, originalUrl: maskUrl });
          worker.postMessage({
            jobId,
            action: 'aura',
            url: maskUrl,
            fillColor,
            blurRadius
          });
        });
      } else {
        // Main thread fallback (e.g. JSDom / tests)
        resultUrl = await processAuraFallback(maskUrl, fillColor, blurRadius);
      }
      
      auraCache.set(cacheKey, resultUrl);
      return resultUrl;
    } catch (error) {
      console.warn('[SpriteOutliner] Failed to generate processed aura:', maskUrl, error);
      return maskUrl;
    } finally {
      auraProcessingCache.delete(cacheKey);
    }
  })();

  auraProcessingCache.set(cacheKey, promise);
  return promise;
}

