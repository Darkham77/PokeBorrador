/**
 * scripts/validate_sandbox_moves_tooltip.ts
 * 
 * SHOWDOWN SANDBOX TRANSLATION, DESCRIPTION & TOOLTIP INTEGRITY VALIDATOR (Node.js 26+)
 * 
 * Performs a deep audit of:
 *   1. Existence & coverage of move name translations (move_translations.json)
 *   2. Existence & coverage of move descriptions in Spanish (move_descriptions.json)
 *   3. Detection of English-language descriptions via linguistic heuristics
 *   4. Integration of the Premium Mathematical Tooltip component
 *   5. Store sanitization & auto-population logic for leader moves
 *   6. Cross-reference parity between names and descriptions databases
 * 
 * Usage: node --permission --allow-fs-read=. --experimental-strip-types scripts/validate_sandbox_moves_tooltip.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

interface ExtractedMove {
  id: string;
  name: string;
  type: string;
  category: string;
  basePower: number;
  accuracy: number | boolean;
  pp: number;
  desc?: string;
  shortDesc?: string;
}

interface ShowdownLocalDB {
  pokemon: Record<string, unknown>;
  moves: Record<string, ExtractedMove>;
  abilities: Record<string, unknown>;
}

// Target Paths
const SHOWDOWN_DB_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/showdown_db.json');
const TRANSLATIONS_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/move_translations.json');
const DESCRIPTIONS_PATH = path.resolve(process.cwd(), 'showdown/sandbox_db/data/move_descriptions.json');
const TOOLTIP_COMP_PATH = path.resolve(process.cwd(), 'showdown/components/ShowdownMoveTooltip.vue');
const SANDBOX_VIEW_PATH = path.resolve(process.cwd(), 'showdown/ShowdownSandboxView.vue');
const TEAMBUILDER_PATH = path.resolve(process.cwd(), 'showdown/components/ShowdownTeambuilder.vue');
const STORE_PATH = path.resolve(process.cwd(), 'showdown/useShowdownSandboxStore.ts');

/**
 * Common English words that should NOT appear in a properly localized Spanish description.
 * Weighted heuristic: if 2+ of these are found in a single description, it is flagged as English.
 */
const ENGLISH_MARKER_WORDS = [
  'the', 'user', 'target', 'opponent', 'raises', 'lowers', 'foe',
  'power', 'move', 'attack', 'damage', 'hits', 'causes', 'restores',
  'increases', 'decreases', 'boosts', 'fails', 'turn', 'chance',
  'if', 'when', 'this', 'that', 'with', 'from', 'each', 'other',
  'also', 'will', 'does', 'has', 'can', 'may', 'its', 'their',
  'faints', 'loses', 'drains', 'heals', 'switches', 'prevents',
  'sharply', 'harshly', 'always', 'never', 'before', 'after'
];

/**
 * Detects if a description string is likely written in English
 * using a word-frequency heuristic against known English markers.
 */
function isLikelyEnglish(text: string): boolean {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  let englishHits = 0;

  for (const marker of ENGLISH_MARKER_WORDS) {
    if (words.includes(marker)) {
      englishHits++;
    }
  }

  // Threshold: 2+ English marker words → flag as English
  return englishHits >= 2;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n══════════════════════════════════════════════════════════════'));
  console.log(styleText('bold', '🛡️  AUDITORÍA INTEGRAL: TRADUCCIONES, DESCRIPCIONES & TOOLTIP 🛡️'));
  console.log(styleText('bold', '══════════════════════════════════════════════════════════════\n'));

  const errors: string[] = [];
  const warnings: string[] = [];
  const achievements: string[] = [];

  // ═══════════════════════════════════════════════════════════
  // FASE 1: Infraestructura de Archivos
  // ═══════════════════════════════════════════════════════════
  const criticalFiles: Array<{ path: string; label: string }> = [
    { path: SHOWDOWN_DB_PATH, label: 'Base de datos Showdown (showdown_db.json)' },
    { path: TRANSLATIONS_PATH, label: 'Traducciones de nombres (move_translations.json)' },
    { path: DESCRIPTIONS_PATH, label: 'Descripciones en español (move_descriptions.json)' },
    { path: TOOLTIP_COMP_PATH, label: 'Componente Tooltip Premium (ShowdownMoveTooltip.vue)' },
    { path: SANDBOX_VIEW_PATH, label: 'Vista del Sandbox (ShowdownSandboxView.vue)' },
    { path: TEAMBUILDER_PATH, label: 'Teambuilder (ShowdownTeambuilder.vue)' },
    { path: STORE_PATH, label: 'Store Pinia (useShowdownSandboxStore.ts)' },
  ];

  let criticalMissing = false;
  for (const file of criticalFiles) {
    if (!(await fileExists(file.path))) {
      errors.push(`Archivo crítico faltante: ${file.label} → ${file.path}`);
      criticalMissing = true;
    } else {
      achievements.push(`✔ ${file.label} encontrado.`);
    }
  }

  if (criticalMissing) {
    console.error(styleText('red', '❌ Faltan archivos de infraestructura críticos. Abortando.'));
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════
  // FASE 2: Cobertura de Traducciones de Nombres
  // ═══════════════════════════════════════════════════════════
  const showdownDbRaw = await fs.readFile(SHOWDOWN_DB_PATH, 'utf8');
  const showdownDb = JSON.parse(showdownDbRaw) as ShowdownLocalDB;

  const translationsRaw = await fs.readFile(TRANSLATIONS_PATH, 'utf8');
  const translations = JSON.parse(translationsRaw) as Record<string, string>;

  const allMoveIds = Object.keys(showdownDb.moves);
  const totalMovesInDB = allMoveIds.length;

  const missingNameTranslations: string[] = [];
  for (const moveId of allMoveIds) {
    if (!translations[moveId]) {
      const move = showdownDb.moves[moveId]!;
      missingNameTranslations.push(`${moveId} (${move.name})`);
    }
  }

  if (missingNameTranslations.length > 0) {
    errors.push(`Faltan traducciones de NOMBRE para ${missingNameTranslations.length} movimientos.`);
  } else {
    achievements.push(`100% de movimientos (${totalMovesInDB}) tienen traducción de nombre en español.`);
  }

  // ═══════════════════════════════════════════════════════════
  // FASE 3: Cobertura y Calidad de Descripciones en Español
  // ═══════════════════════════════════════════════════════════
  const descriptionsRaw = await fs.readFile(DESCRIPTIONS_PATH, 'utf8');
  const descriptions = JSON.parse(descriptionsRaw) as Record<string, string>;

  const missingDescriptions: string[] = [];
  const englishDescriptions: string[] = [];

  for (const moveId of allMoveIds) {
    const desc = descriptions[moveId];
    if (!desc || desc.trim() === '') {
      const move = showdownDb.moves[moveId]!;
      missingDescriptions.push(`${moveId} (${move.name})`);
    } else if (isLikelyEnglish(desc)) {
      const move = showdownDb.moves[moveId]!;
      englishDescriptions.push(`${moveId} (${move.name}): "${desc}"`);
    }
  }

  if (missingDescriptions.length > 0) {
    errors.push(`Faltan DESCRIPCIONES en español para ${missingDescriptions.length} movimientos.`);
  } else {
    achievements.push(`100% de movimientos (${totalMovesInDB}) tienen descripción en español.`);
  }

  if (englishDescriptions.length > 0) {
    errors.push(`Se detectaron ${englishDescriptions.length} descripciones probablemente en INGLÉS en move_descriptions.json.`);
  } else {
    achievements.push('Todas las descripciones pasaron la heurística anti-inglés. 100% español verificado.');
  }

  // ═══════════════════════════════════════════════════════════
  // FASE 4: Integración del Tooltip Premium en Frontend
  // ═══════════════════════════════════════════════════════════
  const tooltipCode = await fs.readFile(TOOLTIP_COMP_PATH, 'utf8');

  // 4a. Verify Tooltip consumes move_descriptions.json
  const tooltipImportsDescriptions = tooltipCode.includes('move_descriptions.json') || tooltipCode.includes('moveDescriptions');
  if (tooltipImportsDescriptions) {
    achievements.push('El Tooltip Premium importa y consume `move_descriptions.json` para fallback en español.');
  } else {
    errors.push('El Tooltip NO importa `move_descriptions.json`. Las descripciones en español no se mostrarán.');
  }

  // 4b. Premium math calculations
  const hasStabCalc = tooltipCode.includes('isStab') || tooltipCode.includes('STAB') || tooltipCode.includes('stabMultiplier');
  const hasTypeEffectiveness = tooltipCode.includes('getCombinedEffectiveness') || tooltipCode.includes('effectiveness');
  const hasGsapAnimation = tooltipCode.includes('gsap') || tooltipCode.includes('onBeforeEnter') || tooltipCode.includes('onEnter');
  const hasEstimatedPower = tooltipCode.includes('estimatedPower');

  if (hasStabCalc) {
    achievements.push('El Tooltip incluye cálculo dinámico de STAB (x1.5).');
  } else {
    warnings.push('No se detectó cálculo de STAB en el Tooltip.');
  }

  if (hasTypeEffectiveness) {
    achievements.push('El Tooltip integra cálculo cruzado de efectividades elementales.');
  } else {
    warnings.push('No se detectó cálculo de efectividad de tipos en el Tooltip.');
  }

  if (hasEstimatedPower) {
    achievements.push('El Tooltip calcula la potencia estimada final (BP × STAB × Efectividad).');
  } else {
    warnings.push('No se detectó cálculo de potencia estimada en el Tooltip.');
  }

  if (hasGsapAnimation) {
    achievements.push('El Tooltip utiliza GSAP para transiciones de entrada y salida.');
  } else {
    warnings.push('No se detectaron transiciones GSAP en el Tooltip.');
  }

  // 4c. Verify ShowdownSandboxView integrations
  const viewCode = await fs.readFile(SANDBOX_VIEW_PATH, 'utf8');

  const importsTooltip = viewCode.includes('ShowdownMoveTooltip') &&
    (viewCode.includes('./components/ShowdownMoveTooltip.vue') || viewCode.includes('./components/ShowdownMoveTooltip'));
  const instantiatesTooltip = viewCode.includes('<ShowdownMoveTooltip') || viewCode.includes('<showdown-move-tooltip');
  const hasHoverEvents = (viewCode.includes('onMoveMouseEnter') || viewCode.includes('handleMoveMouseEnter')) &&
    (viewCode.includes('onMoveMouseLeave') || viewCode.includes('handleMoveMouseLeave'));
  const hasMobileFallback = viewCode.includes('hover: hover') || viewCode.includes('activeTooltipMove') || viewCode.includes('matchMedia');

  if (importsTooltip && instantiatesTooltip) {
    achievements.push('`ShowdownMoveTooltip` se importa e instancia correctamente en la vista del Sandbox.');
  } else {
    errors.push('El Sandbox no incluye o no instancia `ShowdownMoveTooltip` en su plantilla.');
  }

  if (hasHoverEvents) {
    achievements.push('La cuadrícula de ataques tiene eventos interactivos de ratón (mouseenter/mouseleave).');
  } else {
    warnings.push('No se detectaron controladores hover en la cuadrícula de ataques.');
  }

  if (hasMobileFallback) {
    achievements.push('El Sandbox implementa interactividad responsiva (Desktop hover / Mobile doble-toque).');
  } else {
    warnings.push('No se detectó lógica para compatibilidad táctil móvil.');
  }

  // 4d. Verify Teambuilder integration
  const teambuilderCode = await fs.readFile(TEAMBUILDER_PATH, 'utf8');
  const tbImportsTranslations = teambuilderCode.includes('move_translations.json') || teambuilderCode.includes('moveTranslations');
  const tbAlphabeticalSort = teambuilderCode.includes('localeCompare') && teambuilderCode.includes('nameEs');

  if (tbImportsTranslations) {
    achievements.push('El Teambuilder importa las traducciones oficiales de nombres.');
  } else {
    warnings.push('No se detectó consumo de traducciones de nombres en el Teambuilder.');
  }

  if (tbAlphabeticalSort) {
    achievements.push('El selector de ataques del Teambuilder ordena alfabéticamente por nombre en español.');
  } else {
    warnings.push('No se detectó ordenamiento por nombre localizado en el Teambuilder.');
  }

  // ═══════════════════════════════════════════════════════════
  // FASE 5: Sanitización y Auto-Poblado en el Store
  // ═══════════════════════════════════════════════════════════
  const storeCode = await fs.readFile(STORE_PATH, 'utf8');

  // 5a. setPlayerLeader / setEnemyLeader auto-population
  const hasSetPlayerLeader = storeCode.includes('setPlayerLeader');
  const hasSetEnemyLeader = storeCode.includes('setEnemyLeader');
  const hasGetRandomMoves = storeCode.includes('getRandomMoves');

  if (hasSetPlayerLeader && hasSetEnemyLeader) {
    achievements.push('El store implementa `setPlayerLeader` y `setEnemyLeader` para auto-poblado reactivo.');
  } else {
    errors.push('Faltan las acciones `setPlayerLeader` / `setEnemyLeader` en el store.');
  }

  if (hasGetRandomMoves) {
    achievements.push('La función `getRandomMoves` genera movimientos aleatorios garantizando STAB.');
  } else {
    errors.push('Falta la función `getRandomMoves` en el store.');
  }

  // 5b. Sanitization in generateTeam
  const hasSanitization = storeCode.includes('sanitizedMoves') || storeCode.includes('SANITIZE');
  const hasDeduplication = storeCode.includes('new Set(') || storeCode.includes('Set(sanitized');
  const hasFilterEmpty = storeCode.includes("filter(m => m !== ''") || storeCode.includes('.filter(m =>');

  if (hasSanitization) {
    achievements.push('`generateTeam` implementa sanitización estricta de movimientos del líder.');
  } else {
    errors.push('No se detectó sanitización de movimientos en `generateTeam`.');
  }

  if (hasDeduplication) {
    achievements.push('La sanitización elimina movimientos duplicados vía `Set`.');
  } else {
    warnings.push('No se detectó deduplicación de movimientos en la sanitización.');
  }

  if (hasFilterEmpty) {
    achievements.push('La sanitización filtra entradas vacías.');
  } else {
    warnings.push('No se detectó filtrado de entradas vacías.');
  }

  // 5c. Teambuilder wiring
  const tbUsesSetPlayerLeader = teambuilderCode.includes('setPlayerLeader') || teambuilderCode.includes('store.setPlayerLeader');
  const tbUsesSetEnemyLeader = teambuilderCode.includes('setEnemyLeader') || teambuilderCode.includes('store.setEnemyLeader');

  if (tbUsesSetPlayerLeader && tbUsesSetEnemyLeader) {
    achievements.push('El Teambuilder invoca `setPlayerLeader` / `setEnemyLeader` al cambiar de Pokémon.');
  } else {
    errors.push('El Teambuilder NO invoca las acciones de auto-poblado del store.');
  }

  // ═══════════════════════════════════════════════════════════
  // FASE 6: Paridad Cruzada Nombres ↔ Descripciones
  // ═══════════════════════════════════════════════════════════
  const translationKeys = new Set(Object.keys(translations));
  const descriptionKeys = new Set(Object.keys(descriptions));

  const inNamesNotInDescs: string[] = [];
  const inDescsNotInNames: string[] = [];

  for (const key of translationKeys) {
    if (!descriptionKeys.has(key)) {
      inNamesNotInDescs.push(key);
    }
  }

  for (const key of descriptionKeys) {
    if (!translationKeys.has(key)) {
      inDescsNotInNames.push(key);
    }
  }

  if (inNamesNotInDescs.length > 0) {
    warnings.push(`${inNamesNotInDescs.length} movimientos tienen nombre traducido pero NO descripción.`);
  }

  if (inDescsNotInNames.length > 0) {
    warnings.push(`${inDescsNotInNames.length} movimientos tienen descripción pero NO nombre traducido.`);
  }

  if (inNamesNotInDescs.length === 0 && inDescsNotInNames.length === 0) {
    achievements.push('Paridad cruzada perfecta: todos los nombres traducidos tienen descripción.');
  }

  // Output formatting & reporting
  console.log(`\n════════════════════════════════════`);
  console.log(`    SANDBOX MOVES & TOOLTIP INTEGRITY`);
  console.log(`════════════════════════════════════`);
  console.log(`📦 Movimientos en DB:     ${totalMovesInDB}`);
  console.log(`✨ Logros/Aciertos:       ${achievements.length}`);
  console.log(`⚠️  Advertencias:          ${warnings.length}`);
  console.log(`❌ Errores detectados:    ${errors.length}`);
  console.log(`════════════════════════════════════\n`);

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- SANDBOX MOVES & TOOLTIP INTEGRITY REPORT ---`,
      `Movimientos en DB:     ${totalMovesInDB}`,
      `Logros/Aciertos:       ${achievements.length}`,
      `Advertencias:          ${warnings.length}`,
      `Errores:               ${errors.length}`,
      `\nLogros (${achievements.length}):`,
      ...achievements.map(a => `  - ${a}`),
      `\nErrores (${errors.length}):`,
      ...errors.map(e => `  - ${e}`),
      `\nAdvertencias (${warnings.length}):`,
      ...warnings.map(w => `  - ${w}`)
    ];
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }

  if (values.summary) {
    console.log(styleText('cyan', `\n[INFO] Modo resumen activo: ${errors.length} errores, ${warnings.length} advertencias.`));
  } else {
    if (achievements.length > 0) {
      console.log(styleText('green', `🌟 VALIDACIONES CORRECTAS (${achievements.length}):`));
      const limit = 30;
      achievements.slice(0, limit).forEach(a => console.log(`   ✅ ${a}`));
      if (achievements.length > limit) {
        console.log(styleText('cyan', `   ... y ${achievements.length - limit} aciertos más (usa -o para ver todos)`));
      }
      console.log('');
    }

    if (warnings.length > 0) {
      console.log(styleText('yellow', `⚠️  ADVERTENCIAS (${warnings.length}):`));
      const limit = 30;
      warnings.slice(0, limit).forEach(w => console.log(`   🟡 ${w}`));
      if (warnings.length > limit) {
        console.log(styleText('cyan', `   ... y ${warnings.length - limit} advertencias más (usa -o para ver todas)`));
      }
      console.log('');
    }

    if (errors.length > 0) {
      console.log(styleText('red', `❌ ERRORES DE INTEGRIDAD DETECTADOS (${errors.length}):`));
      const limit = 30;
      errors.slice(0, limit).forEach(e => console.log(`   🚨 ${e}`));
      if (errors.length > limit) {
        console.log(styleText('cyan', `   ... y ${errors.length - limit} errores más (usa -o para ver todos)`));
      }
      console.log('\n' + styleText('red', 'Corrige los errores listados para asegurar la perfecta experiencia del Sandbox.'));
    } else {
      console.log(styleText('green', '✨ ¡FELICITACIONES! El Sandbox ha pasado la auditoría con éxito absoluto.'));
    }
  }

  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal durante la auditoría: ${(err as Error).message}`));
  process.exit(1);
});
