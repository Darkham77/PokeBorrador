// fallow-ignore-file security-sink
/**
 * scripts/maintenance/audit_rules.ts
 * 
 * Centralized audit rules and checkers for the Poke Vicio audit engine.
 */

import path from 'node:path';
import { statSync, existsSync, readdirSync } from 'node:fs';
import { Z_LAYERS } from '../../src/logic/constants/visuals.ts';

export const AUDIT_SEVERITIES = ['error', 'warning'] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export interface AuditRule {
  regex: RegExp;
  message: string | ((match: string) => string);
  fix?: (match: string) => string;
  check?: (context: string, match: RegExpExecArray, filePath?: string) => boolean;
  severity?: AuditSeverity;
  fixable?: boolean;
  addImport?: string;
  maxLines?: number;
  ignorePattern?: RegExp;
  exemptConfigFiles?: RegExp;
}

export interface Violation {
  file: string;
  line: number;
  message: string;
  context: string;
  severity: AuditSeverity;
  fixable: boolean;
}

// Invert Z_LAYERS for lookup
export const Z_VALUE_MAP = Object.fromEntries(
  Object.entries(Z_LAYERS).map(([key, value]) => [value, key])
);

// Sorted values for nearest search
export const Z_SORTED_ENTRIES = Object.entries(Z_LAYERS).sort((a, b) => a[1] - b[1]);
/** Sentinel: initial minDiff larger than any possible difference between Z layer values. */
const Z_LAYERS_DIFF_SENTINEL = Z_SORTED_ENTRIES.length + 1;

/** 
 * Native cross-platform path resolver using node:path.
 * Produces a normalized relative POSIX path from the project root for deterministic rule evaluation.
 */
export function normalizeFilePath(filePath: string): string {
  const rel = path.isAbsolute(filePath) ? path.relative(process.cwd(), filePath) : filePath;
  return rel.split(path.sep).join(path.posix.sep).toLowerCase();
}

export const viewport: AuditRule = { // string-ok
  regex: /\b\d+(?:\.\d+)?(vw|vh)\b/gi,
  message: (match: string) => `Unidad legacy detectada: '${match}'. Usa 'd${match.slice(-2)}' para soporte mobile dinámico.`,
  fix: (match: string) => `d${match.toLowerCase().slice(-2)}` // string-ok
};

const CONTEXT_WINDOW_SPAN_CHARS = 500;

export const gpuGaps: AuditRule = {
  regex: /(backdrop-filter|filter):/gi,
  message: "Filtro detectado sin 'will-change'. Considera añadir promoción de capa.",
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    // Only check CSS/SCSS files and <style> blocks in .vue files
    if (filePath) {
      const norm = normalizeFilePath(filePath);
      const isCssFile = norm.endsWith('.scss') || norm.endsWith('.css');
      const isVueFile = norm.endsWith('.vue');
      if (!isCssFile && !isVueFile) return false;

      // For .vue files, check only inside <style> block
      if (isVueFile) {
        const styleOpenIndex = content.lastIndexOf('<style', match.index);
        const styleCloseIndex = content.lastIndexOf('</style>', match.index);
        if (styleOpenIndex === -1 || styleOpenIndex < styleCloseIndex) return false;
      }
    }

    const start = Math.max(0, match.index - CONTEXT_WINDOW_SPAN_CHARS);
    const end = Math.min(content.length, match.index + CONTEXT_WINDOW_SPAN_CHARS);
    const context = content.substring(start, end);

    if (/audit-disable\s+gpu-gaps|will-change:\s*(skip|ignore|false)/i.test(context)) {
      return false;
    }

    const beforeMatch = content.substring(start, match.index);
    const lastSemi = Math.max(beforeMatch.lastIndexOf(';'), beforeMatch.lastIndexOf('}'), beforeMatch.lastIndexOf('{'));
    const selectorText = beforeMatch.substring(lastSemi + 1).trim();

    const highDensityKeywords = /(card|item|sprite|avatar|nickname|badge|icon|grid|list|row|cell|weather|overlay|background)/i;
    if (highDensityKeywords.test(selectorText) || (filePath && highDensityKeywords.test(filePath))) {
      return false;
    }

    const isDynamic = /transition\s*:[^;]*(filter|backdrop-filter|all)|animation\s*:/gi.test(context);
    if (!isDynamic) {
      return false;
    }

    return !/(will-change|will-animate)/gi.test(context);
  },
  fixable: false 
};

export const legacyDates: AuditRule = {
  regex: /new Date\(|Date\.now\(\)/g,
  message: "Uso de 'Date' detectado. Usa 'Temporal'.",
  severity: 'error', // string-ok
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const lowerPath = normalizeFilePath(filePath);
    if (lowerPath.endsWith('.sim.ts') || lowerPath.includes('scripts/e2e/')) {
      return true;
    }
    const isTestOrMock = lowerPath.includes('test') || lowerPath.includes('mock');
    return !isTestOrMock;
  },
  fixable: false
};

export const hardcodedTimezone: AuditRule = {
  regex: /toZonedDateTimeISO\(\s*['"]([^'"]+)['"]\s*\)|toPlainDateTime\(\s*['"]([^'"]+)['"]\s*\)|Temporal\.TimeZone\.from\(\s*['"]([^'"]+)['"]\s*\)/g,
  message: (match: string) => `Timezone hardcodeado detectado: '${match}'. Usa la variable global 'GAME_TIMEZONE' importada desde '@/logic/utils/timeUtils' para respetar la configuración del servidor.`,
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => { // string-ok
    if (!filePath) return false;
    if (filePath.endsWith('timeUtils.ts')) return false;
    const lowerPath = normalizeFilePath(filePath);
    const isTestOrMock = lowerPath.includes('test') || lowerPath.includes('mock');
    return !isTestOrMock;
  },
  fixable: false
};

export const noDomainIdFallbacks: AuditRule = {
  regex: /(?:heldItem|item|species|ability|move)\s*(?:=|:)\s*.*(?:\?|\|\||\?\?)\s*['"]['"]|\b(?:id|species|ability|move|item)\s*(?:\|\||\?\?)\s*[^,\n;)]*\bname\b|\bname\s*(?:\|\||\?\?)\s*[^,\n;)]*\b(?:id|species|ability|move|item)\b|toID\s*\([^)]*(?:\|\||\?\?)[^)]*\)/g,
  message: "FALLBACK SILENCIOSO EN ID DE DOMINIO / NOMBRE DETECTADO. Queda estrictamente prohibido usar fallbacks silenciosos (|| '', ?? '', .id || .name, .species || .name, toID(x || y)) para identificadores de dominio (ItemId, PokemonSpeciesId, AbilityId, PokemonMoveId). Debe usarse una función de validación estricta (requireItemId, requirePokemonSpeciesId, etc.) que lance un error explícito (Fail Loud) si el ID falta o es inválido.",
  severity: 'error', // string-ok
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const normPath = normalizeFilePath(filePath);
    if (normPath.includes('audit_rules.ts') || normPath.includes('.test.') || normPath.includes('.spec.')) return false;
    if (!normPath.includes('src/logic/') && !normPath.includes('src/stores/')) return false;

    // Respect standard escape hatches for pure display localization / text
    const matchIndex = match.index ?? 0;
    const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
    const lineEnd = content.indexOf('\n', matchIndex);
    const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/\/\/\s*(?:text-ok|domain-ok|string-ok|no-domain)/.test(line)) return false;

    return true;
  },
  fixable: false
};

export const nodePrefix: AuditRule = {
  regex: /import .* from ['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/g,
  message: "Import de Node sin prefijo 'node:'.",
  fix: (match: string) => match.replace(/['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/, (m) => m.slice(0, 1) + 'node:' + m.slice(1))
};

const RULES_TARGET_NODE_VERSION_LABEL = '26';

export const esmExtensions: AuditRule = {
  regex: /import\s+[\s\S]*?\s+from\s+['"](\.\.?[^'"]+)['"]/g,
  message: (match: string) => `Import relativo sin extensión: '${match}'. En Node.js ${RULES_TARGET_NODE_VERSION_LABEL}+ nativo las extensiones son obligatorias.`,
  severity: 'error',
  fix: (match: string) => match.replace(/(['"])(\.\.?\/[^'"]+)(?<!\.[jt]s)(?<!\.vue)(?<!\.json)(['"])/g, '$1$2.ts$3'),
  check: (_content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath || filePath.endsWith('.vue')) return false;
    const importPath = match[1] || '';
    if (/\.(ts|js|vue|json|scss|css|svg|png|jpg|jpeg|webp|ogg|mp3|wasm)$/i.test(importPath)) return false;
    return true;
  }
};

export const tsIgnore: AuditRule = {
  regex: /\/\/\s*@ts-(ignore|nocheck|expect-error)/g,
  message: "Uso de supresión de TypeScript detectado. Prohibido por la política 'Zero-Ignore'.",
  severity: 'error',
  fix: () => '',
  fixable: true
};

export const noAliasConstants: AuditRule = {
  regex: /\bconst\s+([A-Z0-9_]{3,})\s*(?::\s*[^=]+)?=\s*([A-Z0-9_]+(?:\.[A-Z0-9_]+)*)\s*(?:as\s+[^;]+)?;?\s*$/gm,
  message: (match: string) => `Alias de constante detectado: '${match.trim()}'. Está PROHIBIDO inicializar una constante con otra constante o propiedad de constante existente para crear un alias duplicado/intermedio. Usa la constante canónica de origen de forma directa.`,
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    if (norm.includes('node_modules') || norm.includes('external')) return false;
    const constA = match[1];
    const constB = match[2];
    if (!constA || !constB || constA === constB) return false;
    // Do not flag if right-hand side is followed by a dot (.) or function invocation indicating a method call
    const afterMatch = content.substring(match.index + match[0].length);
    if (afterMatch.trimStart().startsWith('.') || afterMatch.trimStart().startsWith('(')) return false;
    // Do not flag if the right-hand side value is purely numeric digits or formatted numeric literals (e.g. 3_000)
    if (/^[\d_]+$/.test(constB) || /^\d/.test(constB)) return false;
    return true;
  }
};

export const noLiteralSuffixInConstantName: AuditRule = {
  regex: /\b([A-Z0-9_]+_(\d{2,}))\b/g,
  message: (match: string) => `Constante con sufijo numérico crudo detectada: '${match}'. Está PROHIBIDO incluir literales numéricos al final de los nombres de constantes (ej: _100, _600, _10000). Usa nombres semánticos descriptivos.`,
  severity: 'error',
  check: (_content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    if (norm.includes('node_modules') || norm.includes('external') || norm.includes('.spec.') || norm.includes('.test.')) return false;
    const constName = match[1] || '';
    if (/^\d/.test(constName)) return false;
    // Ignorar excepciones conocidas legítimas como Gen1, Gen2, RGB, HTTP, 2D, 3D, W3C, ISO, etc.
    if (/(?:GEN_\d|ISO_\d|UTF_8|BASE_64|RGB_|RGBA_|WASM_|HTML_5|CSS_3|HTTP_\d)/i.test(constName)) return false;
    return true;
  }
};

export const timersPromises: AuditRule = {
  regex: /new Promise\(r => setTimeout\(r, (\d+)\)\)/g,
  message: "Uso de setTimeout manual en script Node. Considera 'import { setTimeout } from \"node:timers/promises\"'.",
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => !!filePath && normalizeFilePath(filePath).includes('scripts/') && !normalizeFilePath(filePath).includes('node_modules'),
  fixable: false
};

export const explicitResource: AuditRule = {
  regex: /const (\w+) = (new DatabaseSync|fs\.openSync)/g,
  message: `Recurso detectado sin 'using'. Usa Explicit Resource Management (Node ${RULES_TARGET_NODE_VERSION_LABEL}+).`,
  fix: (match: string) => match.replace('const', 'using'),
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => !!filePath && normalizeFilePath(filePath).includes('scripts/')
};

export const manualAnimations: AuditRule = {
  regex: /@keyframes\b|\btransition\s*:/g,
  message: (match: string) => `Animación manual detectada: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Está strictly PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual.`,
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    return norm.endsWith('.scss') || norm.endsWith('.css') || norm.endsWith('.vue');
  },
  fixable: false
};

export const manualTimersFrontend: AuditRule = {
  regex: /\b(set|clear)(Timeout|Interval)\b/g,
  message: (match: string) => `Timer de ANIMACIÓN/UI detectado: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Prohibido en componentes UI y lógicas para gestionar flujo visual o reintentos de carga. Usa gsap.delayedCall, timelines o promesas deterministas.`,
  severity: 'error', 
  check: (content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    if (/audit-disable\s+timers/i.test(content)) return false;
    const norm = normalizeFilePath(filePath);
    if (!norm.includes('src/')) return false;
    if (norm.includes('.spec.') || norm.includes('.test.') || norm.includes('node_modules') || norm.includes('external')) return false;
    if (norm.includes('src/logic/utils/timeutils') || norm.includes('src/logic/battle/showdownworkerclient') || norm.includes('src/logic/battle/battledebug') || norm.includes('src/logic/db/sqliteengine') || norm.includes('src/stores/auth') || norm.includes('src/views/auth/')) return false;
    return true;
  },
  fixable: false
};

export const zeroTimerBattleLogic: AuditRule = {
  regex: /\b(sleep)\s*\(/g,
  message: "Uso de 'sleep()' nativo detectado en lógica/animaciones de combate. MIGRACIÓN OBLIGATORIA A GSAP: Usa 'gsapSleep' (reloj GSAP) o promesas de animación 'awaitTween' para que las animaciones respondan a timeScale y a eventos deterministas.",
  severity: 'error',
  check: (content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    if (/audit-disable\s+timers/i.test(content)) return false;
    const norm = normalizeFilePath(filePath);
    if (!norm.includes('src/logic/battle/') && !norm.includes('src/components/battle/')) return false;
    if (norm.includes('.spec.') || norm.includes('.test.') || norm.includes('gsaphelpers')) return false;
    return true;
  },
  fixable: false
};

export const noPlaywrightWaitForTimeout: AuditRule = {
  regex: /\bpage\.waitForTimeout\s*\(/g,
  message: "Uso de 'page.waitForTimeout()' detectado. Está ESTRICTAMENTE PROHIBIDO usar esperas de tiempo arbitrarias en simulaciones/tests E2E. La sincronización debe ser 100% orientada a eventos mediante señales públicas ('battle-ready-for-input', 'battle-forced-switch-required') o selectores deterministas (#id).",
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    if (norm.includes('node_modules') || norm.includes('external')) return false;
    if (norm.includes('tests/unit/')) return false;
    return norm.includes('scripts/e2e/') || norm.includes('tests/');
  },
  fixable: false
};

export const jsonStringifyInWatch: AuditRule = {
  regex: /\bwatch\s*\(\s*(?:\(\)\s*=>\s*)?JSON\.stringify/g,
  message: "Uso de 'JSON.stringify' dentro de un watcher detectado. Serializar objetos/arrays en watchers de alta frecuencia satura la CPU. Realiza comparaciones directas por elementos o usa watchers profundos ({ deep: true }) con moderación.",
  severity: 'error',
  fixable: false
};

export const intersectionObserverRoot: AuditRule = {
  regex: /new\s+IntersectionObserver\s*\(\s*[^,]+,\s*\{\s*[^}]*root\s*:\s*(?!null\b)[a-zA-Z0-9_$]/g,
  message: "Uso de 'root' dinámico o DOM en IntersectionObserver detectado. En contenedores escalados o con zoom (ej: #zoomable-content), usar un root distinto de null genera fallos de cálculo de visibilidad que apagan animaciones. Deja 'root' como 'null' (viewport) o no lo declares.",
  severity: 'warning',
  fixable: false
};

export const dbInTemplates: AuditRule = {
  regex: /\b(pokemonDataProvider|DBRouter|sqlite|supabase)\b/g,
  message: "Acceso directo a Base de Datos o Data Provider detectado dentro de un bloque <template>. Está PROHIBIDO consultar datos en el render loop. Cachea los datos reactivamente con 'computed' en <script> y expón una estructura de datos lista para renderizar.",
  severity: 'error',
  fixable: false
};

export const functionCallsInTemplates: AuditRule = {
  regex: /(?::[a-z0-9-]+|v-bind:[a-z0-9-]+)="([a-zA-Z0-9_$]+)\([^"]*\)"|\{\{\s*([a-zA-Z0-9_$]+)\([^}]*\)\}/gi,
  message: (match: string) => `Llamada a función/método '${match}' detectada en plantilla Vue. Está PROHIBIDO llamar a funciones que realicen consultas a bases de datos, transformaciones de array (.map/.filter) o lógica pesada en el render loop. Cachea los datos con 'computed'.`,
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const funcName = match[1] || match[2];
    if (!funcName) return false;
    
    const safeFunctions = /^(t|i18n|translate|formatCurrency|formatNumber|class|style|typeof)$/i;
    if (safeFunctions.test(funcName)) return false;
    
    try {
      const scriptStart = content.indexOf('<script');
      const scriptEnd = content.indexOf('</script>');
      if (scriptStart === -1 || scriptEnd === -1) return false;
      const scriptContent = content.substring(scriptStart, scriptEnd);
      
      const funcDefRegex = new RegExp(`(?:const|let|var|function)\\s+${funcName}\\b[^;]*`, 'g');
      const defMatch = funcDefRegex.exec(scriptContent);
      if (!defMatch) return false;
      
      const defStart = defMatch.index;
      const defContext = scriptContent.substring(defStart, Math.min(scriptContent.length, defStart + 1000));
      
      const isHeavy = /\b(pokemonDataProvider|DBRouter|sqlite|supabase|getGuardianData|\.map\(|\.filter\(|\.reduce\()/i.test(defContext);
      return isHeavy;
    } catch (_e) {
      return false;
    }
  },
  fixable: false
};

export const fileLength: AuditRule = {
  regex: /(?!.*)/,
  message: () => `Archivo demasiado largo.`,
  maxLines: 500,
  ignorePattern: /\[PureVue-Ignore-Length\]/,
  exemptConfigFiles: /^(vite|vitest|playwright|eslint)\.config\./i
};

export const zIndexAudit: AuditRule = {
  // Matches both CSS `z-index: N` and JS inline-style `zIndex: N`
  regex: /(?:z-index|zIndex)\s*:\s*(-?\d+)\b/gi,
  message: (match: string) => {
    const val = parseInt(match.match(/-?\d+/)![0]!);
     // string-ok
    const entry = Z_VALUE_MAP[val];
    if (entry) {
      const key = entry.toLowerCase().replace(/_/g, '-'); // string-ok
      return `Z-Index hardcodeado detectado: '${match}'. Corresponde a Z_LAYERS.${entry}. Usa 'var(--z-${key})'.`;
    }

    let nearestKey = '';
    let minDiff = Z_LAYERS_DIFF_SENTINEL;
    for (const [key, zVal] of Z_SORTED_ENTRIES) {
      const diff = Math.abs(val - zVal);
      if (diff < minDiff) {
        minDiff = diff;
        nearestKey = key;
      }
    } // string-ok

    if (nearestKey) {
      const key = nearestKey.toLowerCase().replace(/_/g, '-'); // string-ok
      const offset = val - Z_LAYERS[nearestKey as keyof typeof Z_LAYERS]; // domain-ok
      const sign = offset >= 0 ? '+' : '-';
      return `Z-Index relativo detectado: '${match}'. Cerca de Z_LAYERS.${nearestKey}. Usa 'calc(var(--z-${key}) ${sign} ${Math.abs(offset)})'.`;
    }

    return `Z-Index hardcodeado fuera de estándar: '${match}'. Define una nueva capa en 'visuals.ts' o usa una existente.`;
  },
  severity: 'error',
  fix: (match: string) => {
    const valMatch = match.match(/-?\d+/);
    if (!valMatch) return match;
    const val = parseInt(valMatch[0]);

    const entry = Z_VALUE_MAP[val];
    const isJsProp = match.startsWith('zIndex'); // string-ok
    const propName = isJsProp ? 'zIndex' : 'z-index';
    if (entry) {
      const key = entry.toLowerCase().replace(/_/g, '-'); // string-ok
      const valStr = `var(--z-${key})`;
      return isJsProp ? `${propName}: '${valStr}'` : `${propName}: ${valStr}`;
    }

    let nearestKey = '';
    let minDiff = Z_LAYERS_DIFF_SENTINEL;
    for (const [key, zVal] of Z_SORTED_ENTRIES) {
      const diff = Math.abs(val - zVal);
      if (diff < minDiff) {
        minDiff = diff;
        nearestKey = key;
      }
    } // string-ok

    if (nearestKey) {
      const key = nearestKey.toLowerCase().replace(/_/g, '-'); // string-ok
      const offset = val - Z_LAYERS[nearestKey as keyof typeof Z_LAYERS]; // domain-ok
      const sign = offset >= 0 ? '+' : '-';
      const valStr = `calc(var(--z-${key}) ${sign} ${Math.abs(offset)})`;
      return isJsProp ? `${propName}: '${valStr}'` : `${propName}: ${valStr}`;
    }

    return match;
  },
  fixable: true
};

export const zIndexConstantDeclaration: AuditRule = {
  regex: /const\s+([A-Z0-9_]*Z_INDEX[A-Z0-9_]*)\s*=\s*(?:'[^']+'|"[^"]+"|\d+)/gi,
  message: (match: string) => `Declaración de constante de Z-Index aislada detectada: '${match}'. Está PROHIBIDO declarar constantes de Z-Index fuera de 'src/logic/constants/visuals.ts' (Z_LAYERS). Registra la capa en Z_LAYERS o consume 'Z_LAYERS.<CAPA>'.`,
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    return !norm.includes('src/logic/constants/visuals.ts') && !norm.includes('node_modules') && !norm.includes('external');
  },
  fixable: false
};

export const forbiddenFallbacks: AuditRule = {
  regex: /\b(getItemByName|resolveMoveId)\b|\b(getItemById|getPoke|getMove|getAbility|getNature|pokemonDataProvider\.\w+)\b\([^)]*\)\s*(?:\|\||\?\?)|\b([a-zA-Z0-9_$]+)\.(?:species|name|id)\s*(?:\|\||\?\?)\s*\3\.(?:species|name|id)\b|\b(?:\w+\??\.)*\w*[uU]id\s*(?:\|\||\?\?)\s*(?:\w+\??\.)*\w*[uU]id\b|\.catch\(\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)?\s*=>\s*(?:true|false|null|undefined|\{\}|""|''|\[\])\s*\)/g,
  message: (match: string) => `Patrón de fallback silencioso o búsqueda prohibida detectado: '${match}'. En Poké Vicio (Zero-Fallback Mandate), está ESTRICTAMENTE PROHIBIDO encadenar fallbacks en UIDs/especies/IDs, usar .name como fallback de ID, o silenciar promesas con .catch(() => false/null/{}/void). Se debe fallar ruidosamente con throw new Error().`,
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    if (norm.includes('node_modules') || norm.includes('external')) return false;
    const isTestOrMock = norm.includes('.spec.') || norm.includes('.test.') || norm.includes('tests/fixtures');
    if (isTestOrMock) return false;
    return norm.includes('src/') || norm.includes('scripts/e2e/');
  },
  fixable: false
};

export const doxIndexIntegrity: AuditRule = {
  regex: /^# Purpose/gm,
  message: 'Inconsistencia en jerarquía de documentación DOX Index (AGENTS.md)',
  severity: 'error',
  check: (content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath || !filePath.endsWith('AGENTS.md')) return false;

    // 1. Verify presence of Child DOX Index section
    if (!content.includes('## Child DOX Index')) {
      return true; // Missing mandatory DOX Index header
    }

    const dir = path.dirname(filePath);

    // 2. Extract and validate linked entries strictly inside Child DOX Index section
    const childIndexPos = content.indexOf('## Child DOX Index');
    const childSectionContent = childIndexPos !== -1 ? content.slice(childIndexPos) : '';

    const linkRegex = /-\s*\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch;
    const indexedSubdirs = new Set<string>();

    while ((linkMatch = linkRegex.exec(childSectionContent)) !== null) {
      const linkPath = linkMatch[2];
      if (!linkPath || linkPath.startsWith('http') || linkPath.startsWith('#')) continue;
      if (linkPath.includes('(gitignored')) continue;

      const cleanPath = linkPath.split('#')[0]!;
      const resolved = path.resolve(dir, cleanPath);

      // STRICT MANDATE: Entry MUST be an AGENTS.md file or a directory containing an AGENTS.md file
      try {
        const stat = statSync(resolved);
        if (stat.isDirectory()) {
          const targetAgents = path.join(resolved, 'AGENTS.md');
          if (!existsSync(targetAgents)) {
            return true; // Directory in Child DOX Index lacks an AGENTS.md file
          }
          indexedSubdirs.add(path.basename(resolved));
        } else if (cleanPath.endsWith('AGENTS.md')) {
          indexedSubdirs.add(path.basename(path.dirname(resolved)));
        } else {
          return true; // Only AGENTS.md files or directories containing AGENTS.md allowed
        }
      } catch (_e) {
        return true; // Broken link
      }
    }

    // 3. Verify that all child subdirectories containing an AGENTS.md are indexed by parent
    try {
      const dirEntries = readdirSync(dir, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        const childAgentsPath = path.join(dir, entry.name, 'AGENTS.md');
        if (existsSync(childAgentsPath)) {
          if (!indexedSubdirs.has(entry.name)) {
            return true; // Parent AGENTS.md omitted child AGENTS.md in its Child DOX Index
          }
        }
      }
    } catch (err) {
      void err;
    }

    return false;
  },
  fixable: false
};

export const forbiddenTypeCasts: AuditRule = {
  regex: /\bas\s+unknown\s+as\b|\bas\s+any\s+as\b/g,
  message: (match: string) => `Casteo arbitrario prohibido detectado: '${match}'. Viola las directivas de integridad de tipos (@/domain-type-first y Regla 7 de AGENTS.md). Define e importa la interfaz o unión de tipos explícita.`,
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    const isTestOrMock = norm.includes('test') || norm.includes('spec') || norm.includes('fuzzer') || norm.includes('simulation');
    if (isTestOrMock) return false;
    if (!norm.includes('src/') && !norm.includes('scripts/')) return false;

    return true;
  },
  fixable: false
};



/** Standard numeric identity values and HTTP status codes exempt from magic number audit */
export const EXEMPT_AUDIT_NUMERIC_LITERALS: ReadonlySet<number> = new Set([0, 1, 100, 200, 404, 500]); // runtime-set

export const magicNumbers: AuditRule = {
  regex: /([^A-Z0-9_\w#$])(\d{2,})(\b)/g,
  message: (match: string) => `Número mágico inline detectado: '${match.trim()}'. Viola el Absolute Prohibition on Magic Numbers (Named Constants Mandate). Declara la constante nominada descriptiva (readonly / as const) o impórtala desde un módulo de constantes.`,
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    
    // STRICT SCOPE: Only audit files in src/ and scripts/
    if (!norm.includes('src/') && !norm.includes('scripts/')) return false;

    // Ignore data files, constants definition modules, DB migrations fixtures, tests, specs, fuzzers, and CSS/SCSS files
    if (
      norm.includes('src/data/') || norm.includes('/constants/') || norm.endsWith('config.ts') ||
      norm.includes('migrations_data.ts') || norm.includes('db/migrations') ||
      norm.includes('test') || norm.includes('spec') || norm.includes('fuzzer') ||
      norm.endsWith('.scss') || norm.endsWith('.css')
    ) {
      return false;
    }

    const lineIndex = content.substring(0, match.index).split('\n').length - 1;
    const line = content.split('\n')[lineIndex] || '';
    const trimmed = line.trim();

    // Ignore actual comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;

    // Ignore numbers inside string literals (single, double, or template quotes).
    // Count quotes in the line UP TO AND INCLUDING the match character to detect if we're inside a string.
    const lineStartPos = content.lastIndexOf('\n', match.index - 1) + 1;
    const lineIncludingMatch = content.substring(lineStartPos, match.index + 1); // +1 to include match char
    const singleQuotes = (lineIncludingMatch.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (lineIncludingMatch.match(/(?<!\\)"/g) || []).length;
    const backticks = (lineIncludingMatch.match(/(?<!\\)`/g) || []).length;
    if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) return false;

    // Ignore declarations and imports where constants/types/enums are being defined
    if (trimmed.includes('const ') || trimmed.includes('readonly ') || trimmed.includes('import ') || trimmed.includes('enum ') || trimmed.includes('type ') || trimmed.includes('interface ')) return false;
    // Ignore property definitions alone on a line inside const objects (e.g. `FOG_MAX: 0.85,`)
    if (/^\w[\w]*\s*:\s*-?[\d.]+[,]?\s*$/.test(trimmed)) return false;

    // Ignore regex literal escape sequences (e.g. `\(16\)` inside /.../g patterns)
    if (match.index > 0 && content[match.index - 1] === '\\') return false;

    // Ignore numbers inside a const data-literal block using bracket-balance.
    // Walk backward from the match to find the last `const` declaration and check
    // whether there are more open brackets {/[ than close }/] since that point.
    const contentUpToMatch = content.substring(0, match.index);
    const lastConstPos = Math.max(
      contentUpToMatch.lastIndexOf('\nconst '),
      contentUpToMatch.lastIndexOf('\n  const '),
      contentUpToMatch.lastIndexOf('\n    const '),
    );
    if (lastConstPos !== -1) {
      const fromLastConst = contentUpToMatch.substring(lastConstPos);
      const openCount = (fromLastConst.split('{').length - 1) + (fromLastConst.split('[').length - 1);
      const closeCount = (fromLastConst.split('}').length - 1) + (fromLastConst.split(']').length - 1);
      if (openCount > closeCount) return false;
    }

    // Ignore CSS colors, properties, SVG paths, SQL definitions, hex literals, URLs, and <style> block contents
    if (/rgba?\s*\(|hsl\s*\(|#[0-9a-fA-F]{3,8}\b|0x[0-9a-fA-F]+/i.test(line)) return false;
    if (/<svg|<path|<rect|<circle|<g\b|viewBox=|d=["']M/i.test(line)) return false;
    if (/\b(?:VARCHAR|CHAR|INT|TIMESTAMP|DECIMAL)\s*\(\s*\d+/i.test(line)) return false;
    if (/https?:\/\/|localhost|127\.0\.0\.1|utf-8/i.test(line)) return false;

    // Check if line is inside a <style> block in .vue files
    if (filePath.endsWith('.vue')) {
      const styleOpenIndex = content.lastIndexOf('<style', match.index);
      const styleCloseIndex = content.lastIndexOf('</style>', match.index);
      if (styleOpenIndex !== -1 && styleOpenIndex > styleCloseIndex) {
        return false; // Inside <style> section of Vue component
      }
    }

    const num = parseInt(match[2] || '', 10);
    if (isNaN(num) || EXEMPT_AUDIT_NUMERIC_LITERALS.has(num)) return false;

    return true;
  },
  fixable: false
};

export const badConstantNames: AuditRule = {
  regex: /^\s*(?:export\s+)?const\s+([A-Z0-9_]+?_\d+)\b/gm,
  message: (match: string) => `Nombre de constante antipatrón detectado en declaración: '${match.trim()}'. Está PROHIBIDO incluir el valor numérico en el nombre de la constante (ej: usa ARCHAEOLOGY_CAVE_BASE_WEIGHT en lugar de ARCHAEOLOGY_CAVE_BASE_WEIGHT_10). Describe el propósito semántico o la intención de dominio.`,
  severity: 'error',
  check: (_content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const norm = normalizeFilePath(filePath);
    if (norm.includes('node_modules') || norm.includes('external') || norm.includes('.spec.') || norm.includes('.test.')) return false;
    const constName = match[1] || '';
    if (/(?:GEN_\d|ISO_\d|UTF_8|BASE_64|RGB_|RGBA_|WASM_|HTML_5|CSS_3|HTTP_\d|D3_|GEN1_|GEN2_|GEN3_|GEN4_|GEN5_|GEN6_|GEN7_|GEN8_|GEN9_)/i.test(constName)) return false;
    return true;
  },
  fixable: false
};

function checkTypeScriptRuleMatch(content: string, match: RegExpExecArray, filePath?: string, extraBypasses: string[] = []): boolean {
  if (!filePath) return false;
  const norm = normalizeFilePath(filePath);
  if (!norm.includes('src/') && !norm.includes('scripts/')) return false;

  const lineIndex = content.substring(0, match.index).split('\n').length - 1;
  const line = content.split('\n')[lineIndex] || '';
  const trimmed = line.trim();

  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
  if (line.includes('// domain-ok') || line.includes('// no-domain') || extraBypasses.some(b => line.includes(b))) return false;

  return true;
}

export const noLiteralBooleanType: AuditRule = {
  regex: /\b(?:(?:export\s+)?const|let|var)\s+[A-Z_a-z]\w*\s*:\s*(?:true|false)\b|\b(?:export\s+)?type\s+[A-Z_a-z]\w*\s*=\s*(?:true|false)\s*;|^\s*(?:readonly\s+)?[A-Z_a-z]\w*\??:\s*(?:true|false)\s*;|\(\s*[A-Z_a-z]\w*\??:\s*(?:true|false)\b/gm,
  message: (match: string) => `Tipo de dato booleano literal detectado: '${match.trim()}'. Queda prohibido declarar tipos de datos con literales booleanos (: true / : false) en lugar del tipo de dato canónico 'boolean'. Usa ': boolean'.`,
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => checkTypeScriptRuleMatch(content, match, filePath, ['// boolean-ok']),
  fixable: true,
  fix: (content: string) => content.replace(/:\s*(?:true|false)\b/g, ': boolean')
};

export const noInlineAnonymousObjectType: AuditRule = {
  regex: /\(\s*(?:[A-Z_a-z]\w*\s*,\s*)*[A-Z_a-z]\w*\??\s*:\s*\{\s*(?:readonly\s+)?[A-Z_a-z]\w*\??\s*:\s*(?:string|number|boolean|unknown|any|[A-Z]\w*)(?:\[\])?\s*(?:;|,)\s*(?:readonly\s+)?[A-Z_a-z]\w*\??\s*:[^\n}]*\}\s*[,)]/g,
  message: (match: string) => `Tipo de objeto anónimo inline detectado en parámetro: '${match.trim()}'. Está PROHIBIDO usar estructuras de objeto anónimas inline en firmas de función (estilo Java). Define e importa una interface o tipo nombrado (ej. UserPayload).`,
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => checkTypeScriptRuleMatch(content, match, filePath, ['// type-ok', 'withDefaults']),
  fixable: false
};

export const noFloatingPromises: AuditRule = {
  regex: /^\s*(?!(?:await|void|return|const|let|var)\s+)(?:[A-Z_a-z]\w*\.)?[a-z]\w*Async\s*\([^)]*\)\s*;/gm,
  message: (match: string) => `Promesa flotante detectada: '${match.trim()}'. Toda llamada a función asíncrona debe ser manejada explícitamente con await, void o .catch().`,
  severity: 'warning',
  check: (content: string, match: RegExpExecArray, filePath?: string) => checkTypeScriptRuleMatch(content, match, filePath, ['// promise-ok']),
  fixable: true,
  fix: (content: string) => content.replace(/^\s*([a-z]\w*Async\s*\([^)]*\)\s*;)/gm, 'void $1')
};

export const noLeakedGlobalState: AuditRule = {
  regex: /^(?:export\s+)?let\s+[a-z]\w*\s*=/gm,
  message: (match: string) => `Variable mutable global detectada a nivel de módulo: '${match.trim()}'. Encapsula el estado dentro de un Pinia store, clase o marca // singleton-ok.`,
  severity: 'warning',
  check: (content: string, match: RegExpExecArray, filePath?: string) => checkTypeScriptRuleMatch(content, match, filePath, ['// singleton-ok']),
  fixable: false
};

export const missingInteractiveId: AuditRule = {
  regex: /<([a-zA-Z0-9_-]+)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gis,
  message: (match: string) => `Elemento interactivo de UI sin atributo ID detectado: '${match.replace(/\s+/g, ' ').slice(0, 90)}...'. Todo elemento interactivo (button, input, select, textarea o elementos con eventos @click/@change/@submit) en templates Vue DEBE poseer un atributo 'id' o ':id' explícito para garantizar testabilidad y accesibilidad Playwright.`,
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath || !filePath.endsWith('.vue')) return false;
    const norm = normalizeFilePath(filePath);
    if (norm.includes('node_modules') || norm.includes('external')) return false;

    // Check if inside <template> block
    const templateOpenIndex = content.lastIndexOf('<template', match.index);
    const templateCloseIndex = content.lastIndexOf('</template>', match.index);
    if (templateOpenIndex === -1) return false;
    if (templateCloseIndex !== -1 && templateOpenIndex < templateCloseIndex) return false;

    const tagStr = match[0];
    const tagName = (match[1] || '').toLowerCase();

    // Is it an inherently interactive tag?
    const isInteractiveTag = ['button', 'input', 'select', 'textarea'].includes(tagName); // no-domain

    // Does it have interactive event bindings?
    const hasInteractiveEvent = /@(?:click|change|submit|input|keydown\.enter)\b|v-on:(?:click|change|submit|input)/i.test(tagStr);

    if (!isInteractiveTag && !hasInteractiveEvent) {
      return false;
    }

    // Exempt hidden inputs
    if (tagName === 'input' && /type\s*=\s*["']hidden["']/i.test(tagStr)) {
      return false;
    }

    // Check for id or :id or v-bind:id
    if (/\b(?:id|:id|v-bind:id)\s*=/i.test(tagStr)) {
      return false;
    }

    // Check for escape hatch
    if (/id-ok/i.test(tagStr)) {
      return false;
    }

    return true;
  },
  fixable: false
};

export const sassTraps: AuditRule = {
  regex: /(?<![.$])\b(scale|grayscale|invert|opacity|brightness|blur|rotate|translate|saturate|drop-shadow|translatex|translatey|translatez|skewx|skewy|matrix|rgba|rgb)\s*\(/g,
  message: (match: string) => `Función SASS/CSS propensa a colisión detectada en minúscula: '${match}'. ERROR: Para prevenir errores y advertencias de deprecación en Dart Sass, capitaliza la función manualmente (ej: Grayscale, Rgba, Scale).`,
  severity: 'error',
  fixable: false,
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return true;
    const norm = normalizeFilePath(filePath);
    if (!norm.endsWith('.scss') && !norm.endsWith('.css') && !norm.endsWith('.vue')) return false;
    const matchIndex = match.index ?? 0;
    if (matchIndex > 0) {
      const prevChar = content[matchIndex - 1];
      if (prevChar === '.' || prevChar === '$') return false;
    }
    return true;
  }
};

export const auditRulesConfig = {
  viewport, gpuGaps, legacyDates, hardcodedTimezone, nodePrefix, esmExtensions, tsIgnore, timersPromises, explicitResource, fileLength, zIndexAudit, zIndexConstantDeclaration, manualAnimations, manualTimersFrontend, zeroTimerBattleLogic, noPlaywrightWaitForTimeout, jsonStringifyInWatch, intersectionObserverRoot, dbInTemplates, functionCallsInTemplates, forbiddenFallbacks, forbiddenTypeCasts, doxIndexIntegrity, noDomainIdFallbacks, magicNumbers, badConstantNames, noAliasConstants, noLiteralSuffixInConstantName, noLiteralBooleanType, noInlineAnonymousObjectType, noFloatingPromises, noLeakedGlobalState, missingInteractiveId, sassTraps
};

