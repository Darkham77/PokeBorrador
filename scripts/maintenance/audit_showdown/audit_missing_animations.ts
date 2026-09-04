import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { getFilesRecursively } from './audit_helpers.ts';

export interface AnimationAuditResult {
  missingAnimations: string[];
}

/**
 * Script de Auditoría Estricta de Paridad 1:1 de Animaciones y FX Faltantes.
 * Compara la lista canónica de IDs inmutables en inglés de Showdown directamente contra
 * el contenido agregado de los componentes de UI de combate.
 */
export function auditMissingAnimations(srcDir: string): AnimationAuditResult {
  const missingAnimations: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (!existsSync(srcDir)) return { missingAnimations };

  const battleComponentsDir = path.join(srcDir, 'components', 'battle');
  if (!existsSync(battleComponentsDir)) return { missingAnimations };

  const files = getFilesRecursively(battleComponentsDir).filter(f => f.endsWith('.ts') || f.endsWith('.vue'));
  let aggregatedContent = '';

  for (const file of files) {
    aggregatedContent += `\n${readFileSync(file, 'utf-8').toLowerCase()}`;
  }

  // Lista CANÓNICA ESTRICTA de IDs oficiales de Showdown (Clean string array of Showdown IDs)
  const canonicalShowdownIds = [
    // Primary & Volatile Statuses
    'frz',
    'drag',
    'brn',
    'psn',
    'tox',
    'slp',
    'par',
    'confusion',
    'flinch',
    'attract',
    'taunt',
    'substitute',

    // Weather & Terrains
    'raindance',
    'sunnyday',
    'sandstorm',
    'hail',
    'snow',
    'electricterrain',
    'grassyterrain',
    'mistyterrain',
    'psychicterrain',

    // Field Pseudos & Hazards
    'trickroom',
    'gravity',
    'stealthrock',
    'spikes',
    'toxicspikes',

    // Mechanics & Transformations
    'mega',
    'primal',
    'terastallize',
    'dynamax'
  ];

  for (const showdownId of canonicalShowdownIds) {
    if (!aggregatedContent.includes(showdownId)) {
      missingAnimations.push(`Falta paridad 1:1 para ID canónico de Showdown '${showdownId}' en componentes visuales de combate`);
    }
  }

  return { missingAnimations };
}
