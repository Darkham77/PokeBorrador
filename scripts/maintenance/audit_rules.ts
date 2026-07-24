// fallow-ignore-file security-sink unit-size
/**
 * scripts/maintenance/audit_rules.ts
 * 
 * Centralized audit rules and checkers for the Poke Vicio audit engine.
 */

import path from 'node:path';
import { statSync, existsSync, readdirSync } from 'node:fs';
import { Z_LAYERS } from '../../src/logic/constants/visuals.ts';

export interface AuditRule {
  regex: RegExp;
  message: string | ((match: string) => string);
  fix?: (match: string) => string;
  check?: (context: string, match: RegExpExecArray, filePath?: string) => boolean;
  severity?: 'error' | 'warning';
  fixable?: boolean;
  addImport?: string;
  maxLines?: number;
  ignorePattern?: RegExp;
}

export interface Violation {
  file: string;
  line: number;
  message: string;
  context: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

// Invert Z_LAYERS for lookup
export const Z_VALUE_MAP = Object.fromEntries(
  Object.entries(Z_LAYERS).map(([key, value]) => [value, key])
);

// Sorted values for nearest search
export const Z_SORTED_ENTRIES = Object.entries(Z_LAYERS).sort((a, b) => a[1] - b[1]);

export const viewport: AuditRule = {
  regex: /\b\d+(?:\.\d+)?(vw|vh)\b/gi,
  message: (match: string) => `Unidad legacy detectada: '${match}'. Usa 'd${match.slice(-2)}' para soporte mobile dinámico.`,
  fix: (match: string) => `d${match.toLowerCase().slice(-2)}`
};

export const gpuGaps: AuditRule = {
  regex: /(backdrop-filter|filter):/gi,
  message: "Filtro detectado sin 'will-change'. Considera añadir promoción de capa.",
  severity: 'error',
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    const start = Math.max(0, match.index - 500);
    const end = Math.min(content.length, match.index + 500);
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
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const lowerPath = filePath.toLowerCase();
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
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    if (filePath.endsWith('timeUtils.ts')) return false;
    const lowerPath = filePath.toLowerCase();
    const isTestOrMock = lowerPath.includes('test') || lowerPath.includes('mock');
    return !isTestOrMock;
  },
  fixable: false
};

export const nodePrefix: AuditRule = {
  regex: /import .* from ['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/g,
  message: "Import de Node sin prefijo 'node:'.",
  fix: (match: string) => match.replace(/['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/, (m) => m.slice(0, 1) + 'node:' + m.slice(1))
};

export const esmExtensions: AuditRule = {
  regex: /import\s+[\s\S]*?\s+from\s+['"](\.\.?[^'"]+)['"]/g,
  message: (match: string) => `Import relativo sin extensión: '${match}'. En Node.js 26+ nativo las extensiones son obligatorias.`,
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

export const timersPromises: AuditRule = {
  regex: /new Promise\(r => setTimeout\(r, (\d+)\)\)/g,
  message: "Uso de setTimeout manual en script Node. Considera 'import { setTimeout } from \"node:timers/promises\"'.",
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => !!filePath && filePath.includes('scripts' + path.sep) && !filePath.includes('node_modules'),
  fixable: false
};

export const explicitResource: AuditRule = {
  regex: /const (\w+) = (new DatabaseSync|fs\.openSync)/g,
  message: "Recurso detectado sin 'using'. Usa Explicit Resource Management (Node 26+).",
  fix: (match: string) => match.replace('const', 'using'),
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => !!filePath && filePath.includes('scripts' + path.sep)
};

export const manualAnimations: AuditRule = {
  regex: /@keyframes\b|\btransition\s*:/g,
  message: (match: string) => `Animación manual detectada: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Está strictly PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual.`,
  severity: 'error',
  fixable: false
};

export const manualTimersFrontend: AuditRule = {
  regex: /\b(set|clear)(Timeout|Interval)\b/g,
  message: (match: string) => `Timer de ANIMACIÓN/UI detectado: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Prohibido en componentes UI y lógicas para gestionar flujo visual o reintentos de carga. Usa gsap.delayedCall, timelines o promesas deterministas.`,
  severity: 'error', 
  check: (content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    if (/audit-disable\s+timers/i.test(content)) return false;
    return filePath.endsWith('.vue') && filePath.includes('src' + path.sep + 'components');
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
  regex: /[\s\S]*/,
  message: () => `Archivo demasiado largo.`,
  maxLines: 500,
  ignorePattern: /\[PureVue-Ignore-Length\]/
};

export const zIndexAudit: AuditRule = {
  regex: /z-index\s*:\s*(-?\d+)\b/gi,
  message: (match: string) => {
    const val = parseInt(match.match(/-?\d+/)![0]!);
    
    const entry = Z_VALUE_MAP[val];
    if (entry) {
      const key = entry.toLowerCase().replace(/_/g, '-');
      return `Z-Index hardcodeado detectado: '${match}'. Corresponde a Z_LAYERS.${entry}. Usa 'var(--z-${key})'.`;
    }

    let nearestKey = '';
    let minDiff = 11;
    for (const [key, zVal] of Z_SORTED_ENTRIES) {
      const diff = Math.abs(val - zVal);
      if (diff < minDiff) {
        minDiff = diff;
        nearestKey = key;
      }
    }

    if (nearestKey) {
      const key = nearestKey.toLowerCase().replace(/_/g, '-');
      const offset = val - Z_LAYERS[nearestKey as keyof typeof Z_LAYERS];
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
    if (entry) {
      const key = entry.toLowerCase().replace(/_/g, '-');
      return `z-index: var(--z-${key})`;
    }

    let nearestKey = '';
    let minDiff = 11;
    for (const [key, zVal] of Z_SORTED_ENTRIES) {
      const diff = Math.abs(val - zVal);
      if (diff < minDiff) {
        minDiff = diff;
        nearestKey = key;
      }
    }

    if (nearestKey) {
      const key = nearestKey.toLowerCase().replace(/_/g, '-');
      const offset = val - Z_LAYERS[nearestKey as keyof typeof Z_LAYERS];
      const sign = offset >= 0 ? '+' : '-';
      return `z-index: calc(var(--z-${key}) ${sign} ${Math.abs(offset)})`;
    }

    return match;
  },
  fixable: true
};

export const forbiddenFallbacks: AuditRule = {
  regex: /\b(getItemByName|resolveMoveId)\b|\b(getItemById|getPoke|getMove|getAbility|getNature)\b\([^)]*\)\s*(?:\|\||\?\?)|\b([a-zA-Z0-9_$]+)\.id\s*(?:\|\||\?\?)\s*\3\.name\b/g,
  message: (match: string) => `Patrón de fallback o búsqueda por nombre prohibido: '${match}'. En archivos de lógica (src/logic, src/stores) se debe buscar exclusivamente por ID y lanzar error si no existe. Queda strictly PROHIBIDO caer a .name cuando falta un ID.`,
  severity: 'error',
  check: (_content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const lowerPath = filePath.toLowerCase();
    const isTestOrMock = lowerPath.includes('test') || lowerPath.includes('spec');
    if (isTestOrMock) return false;
    const isLogicOrStore = lowerPath.includes('src/logic') || lowerPath.includes('src/stores') || lowerPath.includes('src\\logic') || lowerPath.includes('src\\stores');
    return isLogicOrStore;
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

export const auditRulesConfig = {
  viewport, gpuGaps, legacyDates, hardcodedTimezone, nodePrefix, esmExtensions, tsIgnore, timersPromises, explicitResource, fileLength, zIndexAudit, manualAnimations, manualTimersFrontend, jsonStringifyInWatch, intersectionObserverRoot, dbInTemplates, functionCallsInTemplates, forbiddenFallbacks, doxIndexIntegrity
};
