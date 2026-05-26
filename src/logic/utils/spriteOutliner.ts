const outlineCache = new Map<string, string>();
const processingCache = new Map<string, Promise<string>>();

/**
 * Loads an image from a URL and returns an HTMLImageElement.
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
 * Generates an outlined or silhouette version of a sprite dynamically using Canvas.
 * Caches the result to avoid redundant processing.
 */
export function getProcessedSprite(
  originalUrl: string,
  type: 'outline' | 'silhouette'
): Promise<string> {
  const cacheKey = `${originalUrl}-${type}`;

  // 1. Check in memory cache
  if (outlineCache.has(cacheKey)) {
    return Promise.resolve(outlineCache.get(cacheKey)!);
  }

  // 2. Check if already processing to avoid concurrent redundant calculations
  if (processingCache.has(cacheKey)) {
    return processingCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const img = await loadImage(originalUrl);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }

      // Radius is 3px for outlines (matching standard pixel-outline-optimized-3px)
      // Radius is 1px for silhouettes (matching standard pixel-silhouette-optimized)
      const r = type === 'silhouette' ? 1 : 3;
      
      // Add extra padding for silhouettes to accommodate Gaussian blur without clipping
      const padding = type === 'silhouette' ? 4 : r;
      
      canvas.width = img.naturalWidth + padding * 2;
      canvas.height = img.naturalHeight + padding * 2;

      // 1. Create solid color mask of the original image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('Could not get 2D context from temp canvas');
      }

      tempCtx.drawImage(img, 0, 0);
      tempCtx.globalCompositeOperation = 'source-in';
      
      // White outline for silhouette, black outline for normal
      tempCtx.fillStyle = type === 'silhouette' ? '#ffffff' : '#000000';
      tempCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

      // 2. Draw the mask offset at all positions inside the circular dilation radius
      if (type === 'silhouette') {
        // Apply 2px blur for a more pronounced glow
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

      // 3. Draw the center/body
      if (type === 'silhouette') {
        // For silhouettes, fill the inner body with solid black (sharp, no blur)
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);
        ctx.drawImage(tempCanvas, padding, padding);
      } else {
        // For normal outlines, draw the original colored sprite in the center
        ctx.drawImage(img, padding, padding);
      }

      const resultUrl = canvas.toDataURL('image/png');
      outlineCache.set(cacheKey, resultUrl);
      return resultUrl;
    } catch (error) {
      // Fallback to original URL on load/processing failure
      console.warn('[SpriteOutliner] Failed to generate outline for:', originalUrl, error);
      return originalUrl;
    } finally {
      // Clean processing cache since memory cache now has the result
      processingCache.delete(cacheKey);
    }
  })();

  processingCache.set(cacheKey, promise);
  return promise;
}

const auraCache = new Map<string, string>();
const auraProcessingCache = new Map<string, Promise<string>>();

/**
 * Pre-renders an aura with color and Gaussian blur from a monochrome mask texture.
 * Caches the result globally to avoid duplicate rendering across components.
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
      const img = await loadImage(maskUrl);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2D context from canvas');
      }

      // Add padding to avoid clipping the blurred edges of the aura (typically blurRadius * 2)
      const padding = Math.ceil(blurRadius * 2) + 2;
      canvas.width = img.naturalWidth + padding * 2;
      canvas.height = img.naturalHeight + padding * 2;

      // 1. Create a colorized mask on a temp canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('Could not get 2D context from temp canvas');
      }

      tempCtx.drawImage(img, 0, 0);
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.fillStyle = fillColor;
      tempCtx.fillRect(0, 0, img.naturalWidth, img.naturalHeight);

      // 2. Draw the colorized mask onto the main canvas with a Gaussian blur filter
      ctx.filter = `blur(${blurRadius}px)`;
      ctx.drawImage(tempCanvas, padding, padding);
      ctx.filter = 'none';

      const resultUrl = canvas.toDataURL('image/png');
      auraCache.set(cacheKey, resultUrl);
      return resultUrl;
    } catch (error) {
      console.warn('[SpriteOutliner] Failed to generate processed aura:', maskUrl, error);
      return maskUrl; // Fallback to original monochrome texture URL
    } finally {
      auraProcessingCache.delete(cacheKey);
    }
  })();

  auraProcessingCache.set(cacheKey, promise);
  return promise;
}
