/**
 * @file vite-plugin-sass-traps.ts
 * @description Plugin de Vite para normalización automática de SASS y CSS Variables.
 * 
 * Safe Version: Explicitly ignores .module and $variable calls.
 */

import fs from 'node:fs';

const SASS_TRAPS = [
  'scale', 'grayscale', 'invert', 'opacity', 'brightness', 
  'blur', 'rotate', 'translate', 'saturate', 'drop-shadow',
  'translatex', 'translatey', 'translatez', 'skewx', 'skewy', 'matrix',
  'rgba', 'rgb'
];

export function sassTrapsFixer() {
  const fixContent = (code: string) => {
    // Regex that captures optional prefix (. or $)
    return code.replace(/([\.\$])?\b([a-zA-Z0-9-]+)\(/g, (match, prefix, func) => {
      // 1. If preceded by . or $, it's a SASS module or variable call. IGNORE.
      if (prefix) return match;

      const lowerFunc = func.toLowerCase();
      if (SASS_TRAPS.includes(lowerFunc)) {
        // 2. Capitalize traps
        if (lowerFunc.includes('-')) {
          return lowerFunc.split('-').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join('-') + '(';
        }
        return lowerFunc.charAt(0).toUpperCase() + lowerFunc.slice(1) + '(';
      }

      return match;
    });
  };

  return {
    name: 'vite-plugin-sass-traps',
    enforce: 'pre' as const,
    
    transform(code: string, id: string) {
      if (!id.endsWith('.scss') && !id.endsWith('.vue')) return null;
      const newCode = fixContent(code);
      if (newCode !== code) return { code: newCode, map: null };
      return null;
    },

    handleHotUpdate({ file, read }: { file: string, read: () => string | Promise<string> }) {
      if (!file.endsWith('.scss') && !file.endsWith('.vue')) return;
      
      Promise.resolve(read()).then((content: string) => {
        const fixed = fixContent(content);
        if (fixed !== content) {
          fs.writeFileSync(file, fixed, 'utf-8');
        }
      });
    }
  };
}
