/**
 * @file vite-plugin-sass-traps.js
 * @description Plugin de Vite para normalización automática de SASS y CSS Variables.
 * 
 * UTILIDAD:
 * Detecta y corrige automáticamente funciones de SASS/CSS que causan colisiones en Dart Sass 2.0
 * (como scale, blur, grayscale) capitalizándolas (Scale, Blur, Grayscale). También arregla
 * la interoperabilidad de rgba() con variables CSS transformándolas a Rgba().
 * 
 * IMPORTANCIA:
 * Actúa como una capa de "Self-Healing" (Auto-reparación) en el pipeline de construcción. 
 * Garantiza que el código cumpla con los estándares del proyecto de forma proactiva, 
 * eliminando warnings de deprecación y errores de compilación incluso si el desarrollador 
 * o un agente de IA olvida la capitalización manual.
 * 
 * CORRECCIÓN EN DISCO: En modo desarrollo (HMR), este plugin sobreescribe el archivo 
 * original en el disco para mantener el código fuente siempre normalizado.
 */

import fs from 'node:fs';

const SASS_TRAPS = [
  'scale', 'grayscale', 'invert', 'opacity', 'brightness', 
  'blur', 'rotate', 'translate', 'saturate', 'drop-shadow',
  'translatex', 'translatey', 'translatez', 'skewx', 'skewy', 'matrix',
  'rgba', 'rgb'
];

/**
 * Vite Plugin to automatically fix SASS traps (capitalization) and CSS variable collisions.
 * Now it also fixes files ON DISK during development to prevent SASS warnings from @use/@import.
 */
export function sassTrapsFixer() {
  const trapRegex = new RegExp(`(?<![a-zA-Z-\\.\\$])(${SASS_TRAPS.join('|')})\\(`, 'g');
  const fixContent = (code) => {
    let newCode = code;
    // 1. Capitalize trap functions
    newCode = newCode.replace(trapRegex, (match, func) => {
      if (func.includes('-')) {
        return func.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-') + '(';
      }
      return func.charAt(0).toUpperCase() + func.slice(1) + '(';
    });
    return newCode;
  };

  return {
    name: 'vite-plugin-sass-traps',
    enforce: 'pre',
    
    // Fix during normal transform (memory)
    transform(code, id) {
      if (!id.endsWith('.scss') && !id.endsWith('.vue')) return null;
      const newCode = fixContent(code);
      if (newCode !== code) return { code: newCode, map: null };
      return null;
    },

    // Fix ON DISK when a file is changed (HMR)
    handleHotUpdate({ file, read }) {
      if (!file.endsWith('.scss') && !file.endsWith('.vue')) return;
      
      read().then(content => {
        const fixed = fixContent(content);
        if (fixed !== content) {
          fs.writeFileSync(file, fixed, 'utf-8');
          // console.log(`[SASS-FIXER] Fixed traps on disk: ${file}`);
        }
      });
    }
  };
}
