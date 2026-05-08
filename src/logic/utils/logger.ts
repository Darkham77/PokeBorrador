/**
 * src/logic/utils/logger.ts
 * 
 * HYBRID LOGGER (Node.js 26+ & Browser)
 * 
 * Provides unified styling for console logs.
 * - Node.js: Uses native 'node:util.styleText' for zero-dependency CLI colors.
 * - Browser: Uses CSS '%c' styling for premium DevTools appearance.
 */

const isBrowser = typeof window !== 'undefined';
// Use Vite's built-in env variable for production detection
// Fallback to process.env.NODE_ENV for Node/API environments
const isProduction = 
  (typeof import.meta !== 'undefined' && import.meta.env?.PROD) || 
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');

// Colors for the "Pixel Heart" aesthetic
const COLORS = {
  info: '#4facfe',    // Blue
  success: '#00f2fe', // Cyan/Aqua
  warn: '#f6d365',    // Yellow/Gold
  error: '#ff0844',   // Red/Pink
  debug: '#a8a8a8'    // Gray
};

// Pre-import node:util if in Node.js
let styleText: any = (text: string, color: string) => text; // Fallback
if (!isBrowser) {
  try {
    // Dynamic import to avoid bundling issues in browser
    const util = await import('node:util');
    styleText = util.styleText;
  } catch (e) {
    // Fallback if not available
  }
}

export const logger = {
  info(tag: string, message: string, ...args: any[]) {
    if (isProduction) return;
    if (isBrowser) {
      console.log(`%c[${tag}]%c ${message}`, `color: ${COLORS.info}; font-weight: bold;`, 'color: inherit;', ...args);
    } else {
      console.log(`[${styleText('blue', tag)}] ${message}`, ...args);
    }
  },

  success(tag: string, message: string, ...args: any[]) {
    if (isProduction) return;
    if (isBrowser) {
      console.log(`%c[${tag}]%c ${message}`, `color: ${COLORS.success}; font-weight: bold;`, `color: ${COLORS.success};`, ...args);
    } else {
      console.log(`[${styleText('green', tag)}] ${message}`, ...args);
    }
  },

  warn(tag: string, message: string, ...args: any[]) {
    if (isBrowser) {
      console.warn(`%c[${tag}]%c ${message}`, `color: ${COLORS.warn}; font-weight: bold;`, 'color: inherit;', ...args);
    } else {
      console.warn(`[${styleText('yellow', tag)}] ${message}`, ...args);
    }
  },

  error(tag: string, message: string, ...args: any[]) {
    if (isBrowser) {
      console.error(`%c[${tag}]%c ${message}`, `color: ${COLORS.error}; font-weight: bold;`, 'color: inherit;', ...args);
    } else {
      console.error(`[${styleText('red', tag)}] ${message}`, ...args);
    }
  },

  debug(tag: string, message: string, ...args: any[]) {
    if (isProduction) return;
    if (isBrowser) {
      console.log(`%c[${tag}]%c ${message}`, `color: ${COLORS.debug}; font-style: italic;`, 'color: #888;', ...args);
    } else {
      console.log(`[${styleText('gray', tag)}] ${message}`, ...args);
    }
  }
};

export default logger;
