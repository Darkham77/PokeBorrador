/**
 * @file vite-plugin-fix-pkmn-sim.ts
 * @description Shared Vite plugin to patch Pokemon Showdown static import syntax.
 */

export function fixPkmnSimPlugin() {
  return {
    name: 'fix-pkmn-sim',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.includes('@pkmn/sim') || id.includes('@pkmn/sets') || id.includes('pkmn_sim.js')) {
        if (code.includes('static import(') || code.includes('static import (')) {
          return {
            code: code.replace(/static import\s*\(/g, 'static "import"('),
            map: null
          };
        }
      }
      return null;
    }
  };
}
