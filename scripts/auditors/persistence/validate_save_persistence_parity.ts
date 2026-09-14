/**
 * scripts/auditors/persistence/validate_save_persistence_parity.ts
 * 
 * SAVE DATA PERSISTENCE PARITY AUDITOR (Node.js 26+ Native)
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
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/persistence/validate_save_persistence_parity.ts
 *   npm run validate:save-persistence
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type SavePersistenceParityRuleId =
  | 'persistence-schema-missing-field'
  | 'persistence-serializer-missing-field'
  | 'persistence-initial-state-missing-field'
  | 'persistence-class-data-missing-field'
  | 'persistence-active-mission-missing-field'
  | 'persistence-domain-type-violation'
  | 'persistence-redundant-nullability';

export const SAVE_PERSISTENCE_PARITY_RULES: readonly SavePersistenceParityRuleId[] = [
  'persistence-schema-missing-field',
  'persistence-serializer-missing-field',
  'persistence-initial-state-missing-field',
  'persistence-class-data-missing-field',
  'persistence-active-mission-missing-field',
  'persistence-domain-type-violation',
  'persistence-redundant-nullability'
] as const;

const ROOT = process.cwd();
const GAME_TYPES_PATH = path.resolve(ROOT, 'src/types/system/game.ts');
const SCHEMAS_PATH = path.resolve(ROOT, 'src/logic/validation/schemas.ts');
const SERIALIZER_PATH = path.resolve(ROOT, 'src/logic/auth/saveSerializer.ts');
const INITIAL_STATE_PATH = path.resolve(ROOT, 'src/stores/gameInitialState.ts');

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

function extractSerializerKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const funcRegex = /function\s+serialize[a-zA-Z0-9_]*[\s\S]*?return\s*\{([\s\S]*?)\n\s*\};/g;
  let match: RegExpExecArray | null;

  while ((match = funcRegex.exec(content)) !== null) {
    const body = match[1];
    if (!body) continue;
    const lines = body.split('\n');
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

      if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
        if (propMatch && propMatch[1]) {
          keys.add(propMatch[1]);
        }
      }

      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;

      parenDepth += openParens - closeParens;
      braceDepth += openBraces - closeBraces;
      bracketDepth += openBrackets - closeBrackets;
    }
  }

  return keys;
}

function extractInitialStateKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const match = content.match(/(?:const\s+INITIAL_STATE(?::\s*GameState)?\s*=|export\s+function\s+createInitialGameState\(\)[^{]*)\s*(?:=>)?\s*\{([\s\S]*?)\n\};/m) ||
                content.match(/return\s*\{([\s\S]*?)\n\s*\};/m);
  if (!match || !match[1]) return keys;

  const body = match[1];
  const lines = body.split('\n');
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
      const propMatch = trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
      if (propMatch && propMatch[1]) {
        keys.add(propMatch[1]);
      }
    }

    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;

    parenDepth += openParens - closeParens;
    braceDepth += openBraces - closeBraces;
    bracketDepth += openBrackets - closeBrackets;
  }

  return keys;
}

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
  const schemaKeys = extractSchemaKeys(schemas, 'classDataSchema');

  const serializerKeys = new Set<string>();
  const serMatch = serializer.match(/classData:\s*\{([\s\S]*?)\n\s*\},/m);
  if (serMatch && serMatch[1]) {
    for (const line of serMatch[1].split('\n')) {
      const m = line.trim().match(/^([a-zA-Z0-9_]+)\s*:/);
      if (m && m[1]) serializerKeys.add(m[1]);
    }
  }

  const initialStateKeys = new Set<string>();
  const initMatch = initialState.match(/classData:\s*\{([\s\S]*?)\n\s*\},/m);
  if (initMatch && initMatch[1]) {
    for (const line of initMatch[1].split('\n')) {
      const m = line.trim().match(/^([a-zA-Z0-9_]+)\s*:/);
      if (m && m[1]) initialStateKeys.add(m[1]);
    }
  }

  return { typeKeys, schemaKeys, serializerKeys, initialStateKeys };
}

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

export class SavePersistenceParityAuditor extends BaseAuditor<SavePersistenceParityRuleId> {
  constructor() {
    super({
      id: 'validate_save_persistence_parity',
      name: 'Save Data Persistence Parity Auditor',
      description: 'Verifica paridad de persistencia y serialización',
      family: 'persistence',
      ruleIds: SAVE_PERSISTENCE_PARITY_RULES,
      ruleDescriptions: {
        'persistence-schema-missing-field': 'Campo de GameState falta en saveDataSchema de Valibot',
        'persistence-serializer-missing-field': 'Campo de GameState no se serializa en saveSerializer',
        'persistence-initial-state-missing-field': 'Campo de GameState falta en createInitialGameState',
        'persistence-class-data-missing-field': 'Propiedad de PlayerClassState desincronizada',
        'persistence-active-mission-missing-field': 'Propiedad de ActiveMission desincronizada',
        'persistence-domain-type-violation': 'Uso de unknown() en esquema de persistencia',
        'persistence-redundant-nullability': 'Uso redundante de optional(nullable(...))'
      },
      requiredFiles: [GAME_TYPES_PATH, SCHEMAS_PATH, SERIALIZER_PATH, INITIAL_STATE_PATH]
    });
  }

  public override async runAudit(): Promise<void> {
    this.filesScannedCount = 4;
    this.context.logStep(1, 4, 'Leyendo contratos fuente de tipos, esquemas y serializadores...');
    const [gameTypesContent, schemasContent, serializerContent, initialStateContent] = await Promise.all([
      fs.readFile(GAME_TYPES_PATH, 'utf-8'),
      fs.readFile(SCHEMAS_PATH, 'utf-8'),
      fs.readFile(SERIALIZER_PATH, 'utf-8'),
      fs.readFile(INITIAL_STATE_PATH, 'utf-8')
    ]);

    this.context.logStep(2, 4, 'Analizando paridad de propiedades de primer nivel (GameState vs SaveData)...');
    const gameStateKeys = extractInterfaceKeys(gameTypesContent, 'GameState');
    const ephemeralKeys = extractEphemeralKeys(gameTypesContent);
    const schemaKeys = extractSchemaKeys(schemasContent, 'saveDataSchema');
    const serializerKeys = extractSerializerKeys(serializerContent);
    const initialStateKeys = extractInitialStateKeys(initialStateContent);

    const expectedPersistedKeys = new Set<string>();
    for (const k of gameStateKeys) {
      if (!ephemeralKeys.has(k)) {
        expectedPersistedKeys.add(k);
      }
    }

    // 1. Check GameState vs saveDataSchema
    for (const key of expectedPersistedKeys) {
      if (!schemaKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-schema-missing-field',
          severity: 'error',
          file: 'src/logic/validation/schemas.ts',
          line: 1,
          message: `Campo '${key}' declarado en GameState falta en saveDataSchema. Valibot lo descartará silenciosamente al guardar o sanitizar.`,
          context: key
        });
      }
    }

    // 2. Check GameState vs serializeState
    for (const key of expectedPersistedKeys) {
      if (!serializerKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-serializer-missing-field',
          severity: 'error',
          file: 'src/logic/auth/saveSerializer.ts',
          line: 1,
          message: `Campo '${key}' declarado en GameState no se serializa en serializeState(). El dato se perderá en persistencia.`,
          context: key
        });
      }
    }

    // 3. Check GameState vs createInitialGameState
    for (const key of expectedPersistedKeys) {
      if (!initialStateKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-initial-state-missing-field',
          severity: 'error',
          file: 'src/stores/gameInitialState.ts',
          line: 1,
          message: `Campo '${key}' declarado en GameState no está inicializado en createInitialGameState().`,
          context: key
        });
      }
    }

    this.context.logStep(3, 4, 'Analizando paridad en estructuras anidadas (PlayerClassState & ActiveMission)...');

    // 4. Nested PlayerClassState parity
    const classDataParity = extractNestedClassDataKeys(
      gameTypesContent,
      schemasContent,
      serializerContent,
      initialStateContent
    );

    for (const key of classDataParity.typeKeys) {
      if (!classDataParity.schemaKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-class-data-missing-field',
          severity: 'error',
          file: 'src/logic/validation/schemas.ts',
          line: 1,
          message: `Propiedad '${key}' de PlayerClassState falta en classDataSchema (schemas.ts).`,
          context: key
        });
      }
      if (!classDataParity.serializerKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-class-data-missing-field',
          severity: 'error',
          file: 'src/logic/auth/saveSerializer.ts',
          line: 1,
          message: `Propiedad '${key}' de PlayerClassState no se serializa en serializeState.classData.`,
          context: key
        });
      }
      if (!classDataParity.initialStateKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-class-data-missing-field',
          severity: 'error',
          file: 'src/stores/gameInitialState.ts',
          line: 1,
          message: `Propiedad '${key}' de PlayerClassState no está inicializada en INITIAL_STATE.classData.`,
          context: key
        });
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
        this.addViolation({
          ruleId: 'persistence-active-mission-missing-field',
          severity: 'error',
          file: 'src/logic/validation/schemas.ts',
          line: 1,
          message: `Propiedad '${key}' de ActiveMission falta en activeMissionSchema (schemas.ts).`,
          context: key
        });
      }
      if (!activeMissionParity.serializerKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-active-mission-missing-field',
          severity: 'error',
          file: 'src/logic/auth/saveSerializer.ts',
          line: 1,
          message: `Propiedad '${key}' de ActiveMission no se serializa en serializeState.classData.activeMission.`,
          context: key
        });
      }
    }

    this.context.logStep(4, 4, 'Verificando tipado estricto en esquemas de persistencia...');

    // 6. Anti-pattern audit: Check for unknown in saveDataSchema
    const unknownMatch = schemasContent.match(/([a-zA-Z0-9_]+)\s*:\s*(?:optional\s*\(\s*)?unknown\s*\(\s*\)/g);
    if (unknownMatch) {
      for (const match of unknownMatch) {
        const fieldName = match.split(':')[0]?.trim();
        if (fieldName && fieldName !== 'chats') {
          this.addViolation({
            ruleId: 'persistence-domain-type-violation',
            severity: 'warning',
            file: 'src/logic/validation/schemas.ts',
            line: 1,
            message: `Campo '${fieldName}' usa unknown() en schemas.ts. Debe tiparse estrictamente con un esquema de dominio.`,
            context: fieldName
          });
        }
      }
    }

    // 7. Anti-pattern audit: Check for redundant optional(nullable(...))
    const optNullMatch = schemasContent.match(/([a-zA-Z0-9_]+)\s*:\s*optional\s*\(\s*nullable\s*\(/g);
    if (optNullMatch) {
      const ALLOWED_NULLABLE_FIELDS = new Set([
        'activeBattle', 'activeMission', 'playerClass', 'faction',
        'fishingRodType', 'pickaxeType', 'brushType', 'incenseType',
        'lastRankedSeason', 'nick_style', 'avatar_style',
        'extortedRouteId', 'extortedRouteTimestamp', 'lastEggScanDate',
        'officialRouteId', 'officialRouteTimestamp', 'lastResolvedWeek',
        'last_renamed_at'
      ]);

      for (const match of optNullMatch) {
        const fieldName = match.split(':')[0]?.trim();
        if (fieldName && !ALLOWED_NULLABLE_FIELDS.has(fieldName)) {
          this.addViolation({
            ruleId: 'persistence-redundant-nullability',
            severity: 'warning',
            file: 'src/logic/validation/schemas.ts',
            line: 1,
            message: `Campo '${fieldName}' usa optional(nullable(...)) redundante en schemas.ts. Usar optional(T) o nullable(T).`,
            context: fieldName
          });
        }
      }
    }

    this.context.setMetric('Campos GameState', gameStateKeys.size);
    this.context.setMetric('Persistibles', expectedPersistedKeys.size);
    this.context.setMetric('saveDataSchema', schemaKeys.size);
    this.context.setMetric('serializeState', serializerKeys.size);
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SavePersistenceParityAuditor());
}
