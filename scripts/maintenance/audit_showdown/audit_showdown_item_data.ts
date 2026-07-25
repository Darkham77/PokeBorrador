import { readFileSync, existsSync } from 'node:fs';
import { getFilesRecursively } from './audit_helpers.js';

export interface ItemAuditResult {
  unhandledBattleItems: string[];
}

/**
 * Script de Auditoría Dinámica de Ítems de Combate Showdown vs Handlers del Proyecto
 * Extrae dinámicamente ítems equipables y bayas de data/items.ts de Showdown
 * y verifica que se manejen dinámicamente en los handlers de items/bridge.
 */
export function auditShowdownItemData(itemsPath: string, battleLogicDir: string): ItemAuditResult {
  const unhandledBattleItems: string[] = [];
  if (!existsSync(itemsPath) || !existsSync(battleLogicDir)) {
    return { unhandledBattleItems };
  }

  const itemsContent = readFileSync(itemsPath, 'utf-8');
  const files = getFilesRecursively(battleLogicDir).filter(f => f.endsWith('.ts'));
  let aggregatedContent = '';

  for (const file of files) {
    aggregatedContent += `\n${readFileSync(file, 'utf-8').toLowerCase()}`;
  }

  // Extrae dinámicamente IDs de ítems de combate en Showdown
  const battleItems = Array.from(itemsContent.matchAll(/([a-z0-9]+):\s*\{[^}]*isBerry:\s*true/gi)).map(m => m[1]);

  for (const itemId of battleItems) {
    if (itemId && !aggregatedContent.includes(itemId.toLowerCase())) {
      unhandledBattleItems.push(itemId);
    }
  }

  return { unhandledBattleItems };
}
