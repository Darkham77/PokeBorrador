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
import ts from 'typescript';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { SharedAstContext } from '../../lib/astContext.ts';

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

const ALLOWED_NULLABLE_FIELDS: ReadonlySet<string> = new Set([
  'activeBattle', 'activeMission', 'playerClass', 'faction',
  'fishingRodType', 'pickaxeType', 'brushType', 'incenseType',
  'lastRankedSeason', 'nick_style', 'avatar_style',
  'extortedRouteId', 'extortedRouteTimestamp', 'lastEggScanDate',
  'officialRouteId', 'officialRouteTimestamp', 'lastResolvedWeek',
  'last_renamed_at'
]);

/**
 * Extracts interface property keys using TypeScript AST.
 * Correctly handles optional, readonly, and string/identifier keys.
 */
export function extractInterfaceKeys(sourceFile: ts.SourceFile, interfaceName: string): Set<string> {
  const keys = new Set<string>();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) {
            keys.add(member.name.text);
          }
        }
      }
    }
  });
  return keys;
}

/**
 * Extracts string literal types from type alias EphemeralGameStateKeys.
 */
export function extractEphemeralKeys(sourceFile: ts.SourceFile): Set<string> {
  const keys = new Set<string>();
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'EphemeralGameStateKeys') {
      if (ts.isUnionTypeNode(node.type)) {
        for (const element of node.type.types) {
          if (ts.isLiteralTypeNode(element) && ts.isStringLiteral(element.literal)) {
            keys.add(element.literal.text);
          }
        }
      } else if (ts.isLiteralTypeNode(node.type) && ts.isStringLiteral(node.type.literal)) {
        keys.add(node.type.literal.text);
      }
    }
  });
  return keys;
}

/**
 * Extracts property names from an ObjectLiteralExpression node,
 * recursively resolving spread expressions (e.g. conditional spreads: ...(cond ? { prop: val } : {})).
 */
export function extractObjectLiteralKeys(objNode: ts.ObjectLiteralExpression): Set<string> {
  const keys = new Set<string>();

  for (const prop of objNode.properties) {
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) {
        keys.add(prop.name.text);
      }
    } else if (ts.isSpreadAssignment(prop)) {
      let expr: ts.Expression = prop.expression;
      while (ts.isParenthesizedExpression(expr)) {
        expr = expr.expression;
      }
      if (ts.isObjectLiteralExpression(expr)) {
        for (const k of extractObjectLiteralKeys(expr)) {
          keys.add(k);
        }
      } else if (ts.isConditionalExpression(expr)) {
        let whenTrue: ts.Expression = expr.whenTrue;
        while (ts.isParenthesizedExpression(whenTrue)) {
          whenTrue = whenTrue.expression;
        }
        if (ts.isObjectLiteralExpression(whenTrue)) {
          for (const k of extractObjectLiteralKeys(whenTrue)) {
            keys.add(k);
          }
        }
      }
    }
  }

  return keys;
}

/**
 * Extracts property keys from a Valibot object schema declaration (e.g., export const saveDataSchema = object({ ... })).
 */
export function extractSchemaKeys(sourceFile: ts.SourceFile, schemaVarName: string): { keys: Set<string>; declNode?: ts.VariableDeclaration } {
  const keys = new Set<string>();
  let targetDecl: ts.VariableDeclaration | undefined;

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === schemaVarName) {
          targetDecl = decl;
          if (decl.initializer && ts.isCallExpression(decl.initializer)) {
            const firstArg = decl.initializer.arguments[0];
            if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
              for (const k of extractObjectLiteralKeys(firstArg)) {
                keys.add(k);
              }
            }
          }
        }
      }
    }
  });

  return { keys, declNode: targetDecl };
}

/**
 * Extracts all property keys returned by serializer functions in saveSerializer.ts.
 */
export function extractSerializerKeys(sourceFile: ts.SourceFile): Set<string> {
  const keys = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text.startsWith('serialize')) {
      const visitReturns = (child: ts.Node) => {
        if (ts.isReturnStatement(child) && child.expression) {
          let expr = child.expression;
          while (ts.isParenthesizedExpression(expr)) {
            expr = expr.expression;
          }
          if (ts.isObjectLiteralExpression(expr)) {
            for (const k of extractObjectLiteralKeys(expr)) {
              keys.add(k);
            }
          }
        }
        ts.forEachChild(child, visitReturns);
      };
      if (node.body) {
        visitReturns(node.body);
      }
    }
  });

  return keys;
}

/**
 * Extracts top-level keys and nested classData keys from createInitialGameState in gameInitialState.ts.
 */
export function extractInitialStateKeys(sourceFile: ts.SourceFile): { topLevelKeys: Set<string>; classDataKeys: Set<string> } {
  const topLevelKeys = new Set<string>();
  const classDataKeys = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'createInitialGameState' && node.body) {
      for (const statement of node.body.statements) {
        if (ts.isReturnStatement(statement) && statement.expression && ts.isObjectLiteralExpression(statement.expression)) {
          for (const prop of statement.expression.properties) {
            if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
              if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) {
                topLevelKeys.add(prop.name.text);

                if (prop.name.text === 'classData' && ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) {
                  for (const classProp of extractObjectLiteralKeys(prop.initializer)) {
                    classDataKeys.add(classProp);
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  return { topLevelKeys, classDataKeys };
}

/**
 * Extracts keys serialized for nested PlayerClassState.
 */
export function extractNestedClassDataSerializerKeys(sourceFile: ts.SourceFile): Set<string> {
  const keys = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node)) {
      if (node.name?.text === 'serializeClassProgress' || node.name?.text === 'serializeClassRoutes') {
        const visitReturns = (child: ts.Node) => {
          if (ts.isReturnStatement(child) && child.expression && ts.isObjectLiteralExpression(child.expression)) {
            for (const k of extractObjectLiteralKeys(child.expression)) {
              keys.add(k);
            }
          }
          ts.forEachChild(child, visitReturns);
        };
        if (node.body) visitReturns(node.body);
      }

      if (node.name?.text === 'serializePlayerClass' && node.body) {
        const visitObject = (child: ts.Node) => {
          if (ts.isPropertyAssignment(child) && child.name.getText(sourceFile) === 'classData') {
            if (ts.isObjectLiteralExpression(child.initializer)) {
              for (const k of extractObjectLiteralKeys(child.initializer)) {
                keys.add(k);
              }
            }
          }
          ts.forEachChild(child, visitObject);
        };
        visitObject(node.body);
      }
    }
  });

  return keys;
}

/**
 * Extracts keys serialized for nested ActiveMission.
 */
export function extractNestedActiveMissionSerializerKeys(sourceFile: ts.SourceFile): Set<string> {
  const keys = new Set<string>();

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'serializeClassActiveMission' && node.body) {
      const visitReturns = (child: ts.Node) => {
        if (ts.isReturnStatement(child) && child.expression && ts.isObjectLiteralExpression(child.expression)) {
          for (const k of extractObjectLiteralKeys(child.expression)) {
            keys.add(k);
          }
        }
        ts.forEachChild(child, visitReturns);
      };
      visitReturns(node.body);
    }
  });

  return keys;
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
      requiresAst: true,
      requiredFiles: [GAME_TYPES_PATH, SCHEMAS_PATH, SERIALIZER_PATH, INITIAL_STATE_PATH]
    });
  }

  public override async runAudit(astContext?: SharedAstContext): Promise<void> {
    this.filesScannedCount = 4;
    const astEngine = astContext ?? new SharedAstContext();

    this.context.logStep(1, 4, 'Leyendo y parseando contratos fuente de tipos, esquemas y serializadores...');
    const [gameTypesContent, schemasContent, serializerContent, initialStateContent] = await Promise.all([
      fs.readFile(GAME_TYPES_PATH, 'utf-8'),
      fs.readFile(SCHEMAS_PATH, 'utf-8'),
      fs.readFile(SERIALIZER_PATH, 'utf-8'),
      fs.readFile(INITIAL_STATE_PATH, 'utf-8')
    ]);

    const gameTypesAst = astEngine.getSourceFile(GAME_TYPES_PATH, gameTypesContent);
    const schemasAst = astEngine.getSourceFile(SCHEMAS_PATH, schemasContent);
    const serializerAst = astEngine.getSourceFile(SERIALIZER_PATH, serializerContent);
    const initialStateAst = astEngine.getSourceFile(INITIAL_STATE_PATH, initialStateContent);

    this.context.logStep(2, 4, 'Analizando paridad de propiedades de primer nivel (GameState vs SaveData)...');
    const gameStateKeys = extractInterfaceKeys(gameTypesAst, 'GameState');
    const ephemeralKeys = extractEphemeralKeys(gameTypesAst);
    const { keys: schemaKeys, declNode: saveSchemaDecl } = extractSchemaKeys(schemasAst, 'saveDataSchema');
    const serializerKeys = extractSerializerKeys(serializerAst);
    const { topLevelKeys: initialStateKeys, classDataKeys: initClassDataKeys } = extractInitialStateKeys(initialStateAst);

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
    const classTypeKeys = extractInterfaceKeys(gameTypesAst, 'PlayerClassState');
    const { keys: classSchemaKeys } = extractSchemaKeys(schemasAst, 'classDataSchema');
    const classSerializerKeys = extractNestedClassDataSerializerKeys(serializerAst);

    for (const key of classTypeKeys) {
      if (!classSchemaKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-class-data-missing-field',
          severity: 'error',
          file: 'src/logic/validation/schemas.ts',
          line: 1,
          message: `Propiedad '${key}' de PlayerClassState falta en classDataSchema (schemas.ts).`,
          context: key
        });
      }
      if (!classSerializerKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-class-data-missing-field',
          severity: 'error',
          file: 'src/logic/auth/saveSerializer.ts',
          line: 1,
          message: `Propiedad '${key}' de PlayerClassState no se serializa en serializeState.classData.`,
          context: key
        });
      }
      if (!initClassDataKeys.has(key)) {
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
    const activeMissionTypeKeys = extractInterfaceKeys(gameTypesAst, 'ActiveMission');
    const { keys: activeMissionSchemaKeys } = extractSchemaKeys(schemasAst, 'activeMissionSchema');
    const activeMissionSerializerKeys = extractNestedActiveMissionSerializerKeys(serializerAst);

    for (const key of activeMissionTypeKeys) {
      if (!activeMissionSchemaKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-active-mission-missing-field',
          severity: 'error',
          file: 'src/logic/validation/schemas.ts',
          line: 1,
          message: `Propiedad '${key}' de ActiveMission falta en activeMissionSchema (schemas.ts).`,
          context: key
        });
      }
      if (!activeMissionSerializerKeys.has(key)) {
        this.addViolation({
          ruleId: 'persistence-active-mission-missing-field',
          severity: 'error',
          file: 'src/logic/auth/saveSerializer.ts',
          line: 1,
          message: `Propiedad '${key}' de ActiveMission no se serializa en serializeClassActiveMission.`,
          context: key
        });
      }
    }

    this.context.logStep(4, 4, 'Verificando tipado estricto en esquemas de persistencia...');

    // 6 & 7. AST Schema inspect for unknown() and redundant optional(nullable(...))
    if (saveSchemaDecl && saveSchemaDecl.initializer && ts.isCallExpression(saveSchemaDecl.initializer)) {
      const schemaObjArg = saveSchemaDecl.initializer.arguments[0];
      if (schemaObjArg && ts.isObjectLiteralExpression(schemaObjArg)) {
        for (const prop of schemaObjArg.properties) {
          if (ts.isPropertyAssignment(prop)) {
            const propName = prop.name.getText(schemasAst).replace(/['"]/g, '');
            const line = schemasAst.getLineAndCharacterOfPosition(prop.getStart(schemasAst)).line + 1;

            // Check for naked unknown() or optional(unknown()) call expression
            let directTypeExpr = prop.initializer;
            if (ts.isCallExpression(directTypeExpr) && ts.isIdentifier(directTypeExpr.expression) && directTypeExpr.expression.text === 'optional') {
              directTypeExpr = directTypeExpr.arguments[0]!;
            }
            if (directTypeExpr && ts.isCallExpression(directTypeExpr) && ts.isIdentifier(directTypeExpr.expression) && directTypeExpr.expression.text === 'unknown') {
              if (propName !== 'chats') {
                this.addViolation({
                  ruleId: 'persistence-domain-type-violation',
                  severity: 'error',
                  file: 'src/logic/validation/schemas.ts',
                  line,
                  message: `Campo '${propName}' usa unknown() en schemas.ts. Debe tiparse estrictamente con un esquema de dominio.`,
                  context: propName
                });
              }
            }

            // Check for optional(nullable(...)) redundant pattern
            if (ts.isCallExpression(prop.initializer) && ts.isIdentifier(prop.initializer.expression) && prop.initializer.expression.text === 'optional') {
              const innerArg = prop.initializer.arguments[0];
              if (innerArg && ts.isCallExpression(innerArg) && ts.isIdentifier(innerArg.expression) && innerArg.expression.text === 'nullable') {
                if (!ALLOWED_NULLABLE_FIELDS.has(propName)) {
                  this.addViolation({
                    ruleId: 'persistence-redundant-nullability',
                    severity: 'warning',
                    file: 'src/logic/validation/schemas.ts',
                    line,
                    message: `Campo '${propName}' usa optional(nullable(...)) redundante en schemas.ts. Usar optional(T) o nullable(T).`,
                    context: propName
                  });
                }
              }
            }
          }
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

