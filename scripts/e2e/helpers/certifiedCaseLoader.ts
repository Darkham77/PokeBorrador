import fs from 'node:fs';
import path from 'node:path';
import type { CertifiedTestBatch } from '../e2e_helpers.ts';
import { requireCertifiedBattleCaseDocument } from '../fuzzer/core/certifiedBattleCase.ts';

export interface CertifiedFuzzerDocument {
  battle: CertifiedTestBatch[];
  items: CertifiedTestBatch[];
  [key: string]: unknown;
}

let cachedDocument: CertifiedFuzzerDocument | null = null;

export function clearCertifiedCaseCache(): void {
  cachedDocument = null;
}

/**
 * Cargador canónico y centralizado de casos certificados de fuzzer.
 * Unifica la lectura, validación de esquema y almacenamiento en caché en memoria
 * para replayers de Node.js y suites de prueba Playwright.
 */
export function loadCertifiedBattleCases(category: 'battle' | 'items' | 'all' = 'all'): CertifiedTestBatch[] | CertifiedFuzzerDocument {
  if (!cachedDocument) {
    const filePath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`[FUZZER-LOADER] No se encontró el archivo de casos certificados en: ${filePath}. Ejecuta 'npm run sim:fuzzer' para generarlo.`);
    }

    const rawContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;

    // Validar esquema de la sección 'battle'
    requireCertifiedBattleCaseDocument(parsed, filePath);

    if (!Array.isArray(parsed.items)) {
      throw new Error(`[FUZZER-LOADER] ${filePath} no contiene un array válido de 'items'.`);
    }

    // Asegurar que cada lote de items tenga un id determinista para filtrado y checkpoints
    parsed.items.forEach((itemBatch: unknown, index: number) => {
      if (typeof itemBatch === 'object' && itemBatch !== null) {
        const record = itemBatch as Record<string, unknown>;
        if (!record.id) {
          const itemPrefix = Array.isArray(record.itemsToTest) && typeof record.itemsToTest[0] === 'string'
            ? `item-${record.itemsToTest[0]}`
            : `item-batch-${index + 1}`;
          record.id = itemPrefix;
        }
      }
    });

    cachedDocument = {
      battle: parsed.battle as CertifiedTestBatch[],
      items: parsed.items as CertifiedTestBatch[]
    };
  }

  if (category === 'battle') {
    return cachedDocument.battle;
  }
  if (category === 'items') {
    return cachedDocument.items;
  }
  return cachedDocument;
}
