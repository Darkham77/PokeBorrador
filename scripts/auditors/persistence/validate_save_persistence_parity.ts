/**
 * scripts/auditors/persistence/validate_save_persistence_parity.ts
 * 
 * SAVE DATA PERSISTENCE PARITY AUDITOR (Node.js 26+)
 * Enforces 100% bidirectional parity between:
 *   1. GameState runtime interface (src/types/system/game.ts)
 *   2. saveDataSchema Valibot schema (src/logic/validation/schemas.ts)
 *   3. serializeState serialization mapper (src/logic/auth/saveSerializer.ts)
 *   4. createInitialGameState initial state factory (src/stores/gameInitialState.ts)
 *   5. Nested PlayerClassState and ActiveMission sub-structures
 *
 * Rules:
 *   - Any non-ephemeral GameState property missing from saveDataSchema is a FATAL ERROR (Valibot strips it).
 *   - Any GameState property missing from serializeState is a FATAL ERROR (Lost on persistence).
 *   - Any GameState property missing from createInitialGameState is a FATAL ERROR (Undefined on new save).
 *   - Any nested classData/activeMission property missing from schema or serializer is a FATAL ERROR.
 *   - Any loose unknown or unjustified optional(nullable(...)) soup in schemas is a DOMAIN VIOLATION.
 *
 * Usage:
 *   node scripts/auditors/persistence/validate_save_persistence_parity.ts
 *   npm run validate:persistence
 *   npm run audit
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

const ROOT = process.cwd();
const GAME_TYPES_PATH = path.resolve(ROOT, 'src/types/system/game.ts');
const SCHEMAS_PATH = path.resolve(ROOT, 'src/logic/validation/schemas.ts');
const SERIALIZER_PATH = path.resolve(ROOT, 'src/logic/auth/saveSerializer.ts');
const INITIAL_STATE_PATH = path.resolve(ROOT, 'src/stores/gameInitialState.ts');

/**
 * Extracts top-level property keys from an interface definition block in TypeScript code.
 */
function extractInterfaceKeys(content: string, interfaceName: string): Set<string> {
  const keys = new Set<string>();
  const regex = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*(?:extends[^{]+)?\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = content.match(regex);
  if (!match || !match[1]) return keys;

  const body = match[1];
  const lines = body.split('\n');
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (braceDepth === 0) {
      const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\??\s*:/);
      if (propMatch && propMatch[1]) {
        keys.add(propMatch[1]);
      }
    }

    braceDepth += openBraces - closeBraces;
  }

  return keys;
}

/**
 * Extracts ephemeral runtime keys declared on EphemeralGameStateKeys.
 */
function extractEphemeralKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const match = content.match(/export\s+type\s+EphemeralGameStateKeys\s*=\s*([^;]+);/);
  if (!match || !match[1]) return keys;

  const literals = match[1].match(/'([^']+)'|"([^"]+)"/g) || [];
  for (const lit of literals) {
    keys.add(lit.replace(/['"]/g, ''));
  }
  return keys;
}

/**
 * Extracts top-level entry keys from a Valibot object schema definition.
 */
function extractSchemaKeys(content: string, schemaVarName: string): Set<string> {
  const keys = new Set<string>();
  const regex = new RegExp(`export\\s+const\\s+${schemaVarName}\\s*=\\s*object\\s*\\(\\{([\\s\\S]*?)\\n\\}\\);`, 'm');
  const match = content.match(regex);
  if (!match || !match[1]) return keys;

  const body = match[1];
  const lines = body.split('\n');
  let parenDepth = 0;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (parenDepth === 0 && braceDepth === 0) {
      const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
      if (propMatch && propMatch[1]) {
        keys.add(propMatch[1]);
      }
    }

    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    parenDepth += openParens - closeParens;
    braceDepth += openBraces - closeBraces;
  }

  return keys;
}

/**
 * Extracts top-level returned object properties from serializeState() in saveSerializer.ts.
 */
function extractSerializerKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const funcMatch = content.match(/export\s+function\s+serializeState[\s\S]*?return\s*\{([\s\S]*?)\n\s*\};/m);
  if (!funcMatch || !funcMatch[1]) return keys;

  const body = funcMatch[1];
  const lines = body.split('\n');
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (braceDepth === 0) {
      const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
      if (propMatch && propMatch[1]) {
        keys.add(propMatch[1]);
      }
    }

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
  }

  return keys;
}

/**
 * Extracts top-level returned object properties from createInitialGameState() in gameInitialState.ts.
 */
function extractInitialStateKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const funcMatch = content.match(/export\s+function\s+createInitialGameState[\s\S]*?return\s*\{([\s\S]*?)\n\s*\};/m);
  if (!funcMatch || !funcMatch[1]) return keys;

  const body = funcMatch[1];
  const lines = body.split('\n');
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (braceDepth === 0) {
      const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
      if (propMatch && propMatch[1]) {
        keys.add(propMatch[1]);
      }
    }

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
  }

  return keys;
}

/**
 * Extracts top-level property keys from an object block using brace depth tracking.
 */
function extractBlockKeys(source: string, startRegex: RegExp): Set<string> {
  const keys = new Set<string>();
  const match = source.match(startRegex);
  if (!match || match.index === undefined) return keys;

  const startIndex = match.index + match[0].length;
  let braceDepth = 1;
  let lineStart = startIndex;
  let lineStartedAtDepth1 = true;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i];
    if (char === '{') {
      braceDepth++;
    } else if (char === '}') {
      braceDepth--;
      if (braceDepth === 0) break;
    } else if (char === '\n') {
      if (lineStartedAtDepth1) {
        const line = source.slice(lineStart, i).trim();
        const propMatch = line.match(/^([a-zA-Z0-9_]+)\s*:/);
        if (propMatch && propMatch[1]) {
          keys.add(propMatch[1]);
        }
      }
      lineStart = i + 1;
      lineStartedAtDepth1 = (braceDepth === 1);
    }
  }
  return keys;
}

/**
 * Extracts nested object keys inside classData across all 4 files.
 */
function extractNestedClassDataKeys(
  gameTypes: string,
  schemas: string,
  serializer: string,
  initialState: string
): {
  typeKeys: Set<string>;
  schemaKeys: Set<string>;
  serializerKeys: Set<string>;
  initialStateKeys: Set<string>;
} {
  const typeKeys = extractInterfaceKeys(gameTypes, 'PlayerClassState');
  const schemaKeys = extractBlockKeys(schemas, /classData:\s*object\s*\(\{/m);
  const serializerKeys = extractBlockKeys(serializer, /classData:\s*state\.classData\s*\?\s*\{/m);
  const initialStateKeys = extractBlockKeys(initialState, /classData:\s*\{/m);

  return { typeKeys, schemaKeys, serializerKeys, initialStateKeys };
}

/**
 * Extracts nested activeMission keys across types, schemas, and serializer.
 */
function extractNestedActiveMissionKeys(
  gameTypes: string,
  schemas: string,
  serializer: string
): {
  typeKeys: Set<string>;
  schemaKeys: Set<string>;
  serializerKeys: Set<string>;
} {
  const typeKeys = extractInterfaceKeys(gameTypes, 'ActiveMission');
  const schemaKeys = extractSchemaKeys(schemas, 'activeMissionSchema');

  const serializerKeys = new Set<string>();
  const serMatch = serializer.match(/activeMission:\s*state\.classData\.activeMission\s*\?\s*\{([\s\S]*?)\n\s*\}\s*:\s*null/m);
  if (serMatch && serMatch[1]) {
    for (const line of serMatch[1].split('\n')) {
      const m = line.trim().match(/^(?:([a-zA-Z0-9_]+)\s*:|\.\.\.\s*\(.*?\s*\{\s*([a-zA-Z0-9_]+)\s*:)/);
      const key = m ? (m[1] || m[2]) : null;
      if (key) serializerKeys.add(key);
    }
  }

  return { typeKeys, schemaKeys, serializerKeys };
}

async function runAuditor() {
  const auditor = setupValidation({
    title: 'SAVE DATA PERSISTENCE PARITY AUDITOR',
    family: 'persistence',
    id: 'validate_save_persistence_parity',
    requiredFiles: [GAME_TYPES_PATH, SCHEMAS_PATH, SERIALIZER_PATH, INITIAL_STATE_PATH]
  });

  await auditor.checkFiles();

  const errors: string[] = [];
  const warnings: string[] = [];

  auditor.logStep(1, 4, 'Leyendo contratos fuente de tipos, esquemas y serializadores...');
  const [gameTypesContent, schemasContent, serializerContent, initialStateContent] = await Promise.all([
    fs.readFile(GAME_TYPES_PATH, 'utf-8'),
    fs.readFile(SCHEMAS_PATH, 'utf-8'),
    fs.readFile(SERIALIZER_PATH, 'utf-8'),
    fs.readFile(INITIAL_STATE_PATH, 'utf-8')
  ]);

  auditor.logStep(2, 4, 'Analizando paridad de propiedades de primer nivel (GameState vs SaveData)...');
  const gameStateKeys = extractInterfaceKeys(gameTypesContent, 'GameState');
  const ephemeralKeys = extractEphemeralKeys(gameTypesContent);
  const schemaKeys = extractSchemaKeys(schemasContent, 'saveDataSchema');
  const serializerKeys = extractSerializerKeys(serializerContent);
  const initialStateKeys = extractInitialStateKeys(initialStateContent);

  // Expected persisted keys = GameState keys minus ephemeral keys
  const expectedPersistedKeys = new Set<string>();
  for (const k of gameStateKeys) {
    if (!ephemeralKeys.has(k)) {
      expectedPersistedKeys.add(k);
    }
  }

  // 1. Check GameState vs saveDataSchema (Critical: Valibot strips undeclared keys)
  for (const key of expectedPersistedKeys) {
    if (!schemaKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_SCHEMA] Campo '${key}' declarado en GameState falta en saveDataSchema (src/logic/validation/schemas.ts). Valibot lo descartará silenciosamente al guardar o sanitizar.`
      );
    }
  }

  // 2. Check GameState vs serializeState (Critical: Unmapped fields are not written)
  for (const key of expectedPersistedKeys) {
    if (!serializerKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_SERIALIZER] Campo '${key}' declarado en GameState no se serializa en serializeState() (src/logic/auth/saveSerializer.ts). El dato se perderá en disco y base de datos.`
      );
    }
  }

  // 3. Check GameState vs createInitialGameState (Critical: Missing fields are undefined on new save)
  for (const key of expectedPersistedKeys) {
    if (!initialStateKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_INITIAL_STATE] Campo '${key}' declarado en GameState no está inicializado en createInitialGameState() (src/stores/gameInitialState.ts). Cuentas nuevas nacerán con estado corrupto o undefined.`
      );
    }
  }

  auditor.logStep(3, 4, 'Analizando paridad en estructuras anidadas (PlayerClassState & ActiveMission)...');

  // 4. Nested PlayerClassState parity
  const classDataParity = extractNestedClassDataKeys(
    gameTypesContent,
    schemasContent,
    serializerContent,
    initialStateContent
  );

  for (const key of classDataParity.typeKeys) {
    if (!classDataParity.schemaKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_CLASS_DATA] Propiedad '${key}' de PlayerClassState falta en classDataSchema (schemas.ts).`
      );
    }
    if (!classDataParity.serializerKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_CLASS_DATA] Propiedad '${key}' de PlayerClassState no se serializa en serializeState.classData (saveSerializer.ts).`
      );
    }
    if (!classDataParity.initialStateKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_CLASS_DATA] Propiedad '${key}' de PlayerClassState no está inicializada en INITIAL_STATE.classData (gameInitialState.ts).`
      );
    }
  }

  // 5. Nested ActiveMission parity
  const activeMissionParity = extractNestedActiveMissionKeys(
    gameTypesContent,
    schemasContent,
    serializerContent
  );

  for (const key of activeMissionParity.typeKeys) {
    if (!activeMissionParity.schemaKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_ACTIVE_MISSION] Propiedad '${key}' de ActiveMission falta en activeMissionSchema (schemas.ts).`
      );
    }
    if (!activeMissionParity.serializerKeys.has(key)) {
      errors.push(
        `[PERSISTENCE_PARITY_ACTIVE_MISSION] Propiedad '${key}' de ActiveMission no se serializa explícitamente en serializeState.classData.activeMission (saveSerializer.ts).`
      );
    }
  }

  auditor.logStep(4, 4, 'Verificando cumplimiento de Domain-Type-First en contratos de persistencia...');

  // 6. Anti-pattern audit: Check for unknown in saveDataSchema
  const unknownMatch = schemasContent.match(/([a-zA-Z0-9_]+)\s*:\s*(?:optional\s*\(\s*)?unknown\s*\(\s*\)/g);
  if (unknownMatch) {
    for (const match of unknownMatch) {
      const fieldName = match.split(':')[0]?.trim();
      if (fieldName && fieldName !== 'chats') {
        warnings.push(
          `[PERSISTENCE_DOMAIN_TYPE] Campo '${fieldName}' usa unknown() en schemas.ts. Debe tiparse estrictamente con un esquema de dominio.`
        );
      }
    }
  }

  // 7. Anti-pattern audit: Check for redundant optional(nullable(...))
  const optNullMatch = schemasContent.match(/([a-zA-Z0-9_]+)\s*:\s*optional\s*\(\s*nullable\s*\(/g);
  if (optNullMatch) {
    for (const match of optNullMatch) {
      const fieldName = match.split(':')[0]?.trim();
      const ALLOWED_NULLABLE_FIELDS = [
        'activeBattle', 'activeMission', 'playerClass', 'faction',
        'fishingRodType', 'pickaxeType', 'brushType', 'incenseType',
        'lastRankedSeason', 'nick_style', 'avatar_style',
        'extortedRouteId', 'extortedRouteTimestamp', 'lastEggScanDate',
        'officialRouteId', 'officialRouteTimestamp', 'lastResolvedWeek',
        'last_renamed_at'
      ] as const;
      const allowedNullableFields: ReadonlySet<string> = new Set(ALLOWED_NULLABLE_FIELDS); // runtime-set: Fast O(1) membership lookup set
      if (fieldName && !allowedNullableFields.has(fieldName)) {
        warnings.push(
          `[PERSISTENCE_PERMISSIVE_SCHEMA] Campo '${fieldName}' usa optional(nullable(...)) redundante en schemas.ts. Usar optional(T) o nullable(T) según el contrato.`
        );
      }
    }
  }

  const metrics: Record<string, number | string> = {
    'Campos GameState': gameStateKeys.size,
    'Campos Efímeros Excluidos': ephemeralKeys.size,
    'Campos Persistibles Requeridos': expectedPersistedKeys.size,
    'Campos en saveDataSchema': schemaKeys.size,
    'Campos en serializeState': serializerKeys.size,
    'Campos en gameInitialState': initialStateKeys.size,
    'Campos PlayerClassState': classDataParity.typeKeys.size,
    'Campos ActiveMission': activeMissionParity.typeKeys.size,
    'Errores de Paridad': errors.length,
    'Advertencias': warnings.length
  };

  await auditor.finish(metrics, errors, warnings);
}

runAuditor().catch(err => {
  console.error('Fatal error running persistence parity auditor:', err);
  process.exit(1);
});
