import fs from 'node:fs/promises';
import path from 'node:path';

const REPORT_PATH = 'scratch/audit_report.json';
const OUTPUT_MD_PATH = 'scratch/audit_report_animaciones.md';

async function main() {
  try {
    const rawData = await fs.readFile(REPORT_PATH, 'utf-8');
    const violations = JSON.parse(rawData);

    // 1. Filter out showdown
    const filteredViolations = violations.filter(v => {
      const normalizedPath = v.file.toLowerCase();
      return !normalizedPath.includes('showdown');
    });

    console.log(`Loaded ${violations.length} total violations.`);
    console.log(`Filtered down to ${filteredViolations.length} violations (excluding showdown).`);

    // 2. Classify violations
    const classification = {
      manualAnimations: [],
      timers: [],
      zIndex: [],
      gpuGaps: [],
      fileLength: [],
      others: []
    };

    for (const v of filteredViolations) {
      const msg = v.message;
      if (msg.includes('Animación manual detectada')) {
        classification.manualAnimations.push(v);
      } else if (msg.includes('timer de ANIMACIÓN') || msg.includes('setTimeout manual')) {
        classification.timers.push(v);
      } else if (msg.includes('Z-Index')) {
        classification.zIndex.push(v);
      } else if (msg.includes('will-change')) {
        classification.gpuGaps.push(v);
      } else if (msg.includes('archivo tiene') || msg.includes('Mantenibilidad CRÍTICA')) {
        classification.fileLength.push(v);
      } else {
        classification.others.push(v);
      }
    }

    // 3. Count GSAP usages in src/ by scanning files for 'gsap'
    const gsapUsage = await scanGsapUsage('src');

    // 4. Group violations by logical module/component group
    const modules = {};
    for (const v of filteredViolations) {
      const relPath = path.relative(process.cwd(), v.file);
      const mod = getModuleGroup(relPath);
      if (!modules[mod]) {
        modules[mod] = {
          name: mod,
          total: 0,
          manualAnimations: 0,
          timers: 0,
          zIndex: 0,
          gpuGaps: 0,
          fileLength: 0,
          others: 0,
          files: {}
        };
      }
      modules[mod].total++;
      if (v.message.includes('Animación manual detectada')) modules[mod].manualAnimations++;
      else if (v.message.includes('timer de ANIMACIÓN') || v.message.includes('setTimeout manual')) modules[mod].timers++;
      else if (v.message.includes('Z-Index')) modules[mod].zIndex++;
      else if (v.message.includes('will-change')) modules[mod].gpuGaps++;
      else if (v.message.includes('archivo tiene') || v.message.includes('Mantenibilidad CRÍTICA')) modules[mod].fileLength++;
      else modules[mod].others++;

      modules[mod].files[relPath] = (modules[mod].files[relPath] || 0) + 1;
    }

    // Sort modules by total violations
    const sortedModules = Object.values(modules).sort((a, b) => b.total - a.total);

    // Create the markdown report content
    let md = `# 📊 Reporte Especializado: Auditoría de Animaciones, Timers y GSAP\n\n`;
    md += `Este reporte analiza en detalle las violaciones detectadas por el motor de auditoría inteligente \`audit_project.ts\` en el proyecto **Poké Vicio**, excluyendo temporalmente el módulo de **showdown**.\n\n`;
    
    md += `> [!NOTE]\n`;
    md += `> De acuerdo con los lineamientos del archivo **AGENTS.md**, Poké Vicio prohíbe estrictamente el uso de animaciones manuales (CSS \`@keyframes\` o \`transition\`) y timers (\`setTimeout\`, \`setInterval\`) para controlar flujos visuales en la interfaz del cliente. Toda animación debe estar orquestada con **GSAP** de forma determinista.\n\n`;

    md += `## 📈 Resumen General de Violaciones (Sin Showdown)\n\n`;
    md += `* **Total de archivos analizados (con incidentes):** ${new Set(filteredViolations.map(v => v.file)).size}\n`;
    md += `* **Total de violaciones activas:** ${filteredViolations.length}\n`;
    md += `  * 🔴 **Animaciones manuales (CSS/SASS):** ${classification.manualAnimations.length}\n`;
    md += `  * 🔴 **Timers prohibidos en UI (\`setTimeout\` / \`setInterval\`):** ${classification.timers.length}\n`;
    md += `  * 🟡 **Z-Index fuera de estándar:** ${classification.zIndex.length}\n`;
    md += `  * 🟡 **Falta \`will-change\` (GPU):** ${classification.gpuGaps.length}\n`;
    md += `  * 🟡 **Archivos que exceden límite de líneas (>300/500 SLOC):** ${classification.fileLength.length}\n`;
    md += `  * ⚪ **Otros incidentes:** ${classification.others.length}\n\n`;

    md += `## 🔌 Análisis de Uso Directo de GSAP\n\n`;
    md += `Se ha escaneado la carpeta \`src/\` para identificar la presencia de integraciones legítimas con **GSAP**.\n\n`;
    md += `* **Archivos que importan o usan GSAP:** ${gsapUsage.totalFiles} archivos.\n`;
    md += `* **Usos detectados (referencias a \`gsap\`):** ${gsapUsage.totalHits} ocurrencias.\n\n`;
    
    md += `### Top 10 Archivos con Mayor Integración de GSAP:\n\n`;
    md += `| Archivo | Ocurrencias de GSAP | Propósito Visual |\n`;
    md += `| :--- | :---: | :--- |\n`;
    gsapUsage.topFiles.slice(0, 10).forEach(f => {
      md += `| [\`${path.basename(f.file)}\`](file:///${path.resolve(f.file).replace(/\\/g, '/')}) | ${f.count} | ${getVisualPurpose(f.file)} |\n`;
    });
    md += `\n`;

    md += `## 📦 Módulos Más Afectados (Mapeo de Impacto)\n\n`;
    md += `Se han clasificado los archivos con violaciones en **Módulos Lógicos** para entender qué áreas del juego sufren mayor desvío del estándar:\n\n`;

    md += `| Módulo Lógico | Total Incidencias | Animaciones CSS | Timers Prohibidos | GPU / Z-Index | Notas de Arquitectura |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
    
    sortedModules.forEach(m => {
      const gpuZ = m.gpuGaps + m.zIndex;
      md += `| **${m.name}** | **${m.total}** | ${m.manualAnimations} | ${m.timers} | ${gpuZ} | ${getModuleArchitectureNote(m.name)} |\n`;
    });
    md += `\n`;

    md += `--- \n\n`;
    md += `## 🔍 Detalles por Módulo de Alto Impacto\n\n`;

    for (const m of sortedModules.slice(0, 8)) {
      md += `### 📂 Módulo: ${m.name} (${m.total} Violaciones)\n`;
      md += `Este módulo contiene lógica y estilos dedicados a ${getModuleDescription(m.name)}.\n\n`;
      md += `**Archivos críticos con violaciones:**\n`;
      
      const sortedFiles = Object.entries(m.files).sort((a, b) => b[1] - a[1]);
      sortedFiles.slice(0, 5).forEach(([file, count]) => {
        md += `- [\`${file}\`](file:///${path.resolve(file).replace(/\\/g, '/')}) - **${count}** violaciones de estándar.\n`;
        // List visual issues
        const fileViolations = filteredViolations.filter(v => path.relative(process.cwd(), v.file) === file);
        const animCount = fileViolations.filter(v => v.message.includes('Animación manual')).length;
        const timerCount = fileViolations.filter(v => v.message.includes('timer de ANIMACIÓN') || v.message.includes('setTimeout manual')).length;
        const zCount = fileViolations.filter(v => v.message.includes('Z-Index')).length;
        
        if (animCount > 0) md += `  * *Animaciones manuales (CSS):* ${animCount} transiciones/keyframes detectados.\n`;
        if (timerCount > 0) md += `  * *Timers (setTimeout):* ${timerCount} temporizadores en UI.\n`;
        if (zCount > 0) md += `  * *Z-Indexes hardcodeados:* ${zCount} valores directos.\n`;
      });
      md += `\n`;
    }

    md += `## ⚠️ Foco en Timers Prohibidos (\`setTimeout\` / \`setInterval\`)\n\n`;
    md += `> [!WARNING]\n`;
    md += `> El uso de timers crudos para visuales es altamente peligroso. Provoca desincronización en cambios de pestañas o lag. A continuación se listan los timers prohibidos en UI activos:\n\n`;

    if (classification.timers.length === 0) {
      md += `*¡Excelente! No se encontraron timers crudos prohibidos en los archivos del frontend analizados (excluyendo showdown).* \n\n`;
    } else {
      md += `| Archivo | Línea | Contexto de Código | Razón de Rechazo |\n`;
      md += `| :--- | :---: | :--- | :--- |\n`;
      classification.timers.forEach(t => {
        const rel = path.relative(process.cwd(), t.file);
        md += `| [\`${path.basename(t.file)}\`](file:///${path.resolve(t.file).replace(/\\/g, '/')}) | ${t.line} | \`${t.context.substring(0, 40).replace(/`/g, '\\`').replace(/\n/g, ' ')}\` | Debe migrarse a \`gsap.delayedCall\` o timeline. |\n`;
      });
      md += `\n`;
    }

    md += `## 💡 Recomendaciones del Estándar Poké Vicio\n\n`;
    md += `1. **Animaciones SASS/CSS (\`transition\` y \`@keyframes\`):** Deben ser migradas por completo a GSAP tweens (\`gsap.to()\`, \`gsap.fromTo()\`). Esto garantiza que el motor de renderizado controle toda la línea de tiempo y limpie los estados al finalizar.\n`;
    md += `2. **Promoción de Capa (GPU):** Los elementos interactivos que aplican transformaciones o filtros visuales intensos deben tener declarada la propiedad CSS \`will-change\` de forma selectiva para evitar layout thrashing.\n`;
    md += `3. **Z-Index Unificado:** Sustituir los valores numéricos hardcodeados (\`z-index: 10\`, \`z-index: 50\`, etc.) por variables semánticas basadas en \`visuals.ts\` (\`var(--z-map-spawns)\`, etc.).\n`;
    md += `4. **Modularidad:** Los archivos que superan las 300/500 líneas (como \`LoginView.vue\` u \`WalkedEggsPanel.vue\`) deben fragmentarse extrayendo sub-componentes y composables.\n`;

    await fs.writeFile(OUTPUT_MD_PATH, md, 'utf-8');
    console.log(`Successfully generated markdown report at ${OUTPUT_MD_PATH}`);

  } catch (error) {
    console.error('Error analyzing audit:', error);
  }
}

// Map logical components
function getModuleGroup(filePath) {
  const parts = filePath.split(path.sep);
  if (filePath.includes('styles' + path.sep + 'core') || filePath.includes('styles' + path.sep + 'layouts')) {
    return 'Estilos Globales & Core';
  }
  if (filePath.includes('styles' + path.sep + 'views' + path.sep + 'box')) {
    return 'Estilos Vista de Cajas (PC)';
  }
  if (filePath.includes('styles' + path.sep + 'views') || filePath.includes('views')) {
    if (filePath.toLowerCase().includes('bag')) return 'Módulo: Mochila (Bag)';
    if (filePath.toLowerCase().includes('social')) return 'Módulo: Social & Amigos';
    if (filePath.toLowerCase().includes('login') || filePath.toLowerCase().includes('auth')) return 'Módulo: Login & Autenticación';
    if (filePath.toLowerCase().includes('pokedex')) return 'Módulo: Pokedex';
    if (filePath.toLowerCase().includes('game')) return 'Módulo: Juego General (Core)';
    return 'Vistas (Otras)';
  }
  if (filePath.includes('components' + path.sep + 'battle')) {
    return 'Módulo: Batalla (Battle)';
  }
  if (filePath.includes('components' + path.sep + 'breeding')) {
    return 'Módulo: Crianza (Breeding)';
  }
  if (filePath.includes('components' + path.sep + 'gts') || filePath.toLowerCase().includes('gts')) {
    return 'Módulo: GTS / Comercio';
  }
  if (filePath.includes('components' + path.sep + 'modals') || filePath.toLowerCase().includes('modal')) {
    return 'Componentes: Modales Globales';
  }
  if (filePath.includes('components' + path.sep + 'admin') || filePath.includes('debug')) {
    return 'Módulo: Administración & Debug';
  }
  if (filePath.includes('stores')) {
    return 'Módulo: Estado Global (Stores)';
  }
  if (filePath.includes('scripts')) {
    return 'Scripts de Soporte & Utilidades';
  }
  
  return 'Componentes Comunes / Otros';
}

function getModuleDescription(modName) {
  switch (modName) {
    case 'Estilos Vista de Cajas (PC)':
      return 'la renderización de la cuadrícula de Pokémon, selección, filtros y caja de almacenamiento principal.';
    case 'Estilos Globales & Core':
      return 'el layout general, reset CSS, mixins reutilizables y variables base de la interfaz.';
    case 'Módulo: Mochila (Bag)':
      return 'el inventario del jugador, uso de ítems y clasificación de objetos.';
    case 'Módulo: Batalla (Battle)':
      return 'el motor de combate por turnos, animaciones de ataque, estados y el HUD de arena.';
    case 'Componentes: Modales Globales':
      return 'ventanas emergentes como perfiles de entrenador, rankings, configuraciones y cosméticos.';
    case 'Módulo: Crianza (Breeding)':
      return 'el sistema de guardería, eclosión de huevos por pasos recorridos y genética Pokémon.';
    case 'Módulo: GTS / Comercio':
      return 'la tienda online de intercambio de Pokémon, ofertas de mercado y búsqueda.';
    case 'Módulo: Login & Autenticación':
      return 'las pantallas de inicio de sesión, registro, selector de servidor y carga inicial de assets.';
    default:
      return 'las interacciones generales de la interfaz de usuario.';
  }
}

function getModuleArchitectureNote(modName) {
  switch (modName) {
    case 'Estilos Vista de Cajas (PC)':
      return 'Alta densidad de transiciones manuales en filtros. Requiere migración a GSAP.';
    case 'Estilos Globales & Core':
      return 'Contiene mixins de botones con transitions tradicionales. Deben migrarse a GSAP hover effects.';
    case 'Módulo: Mochila (Bag)':
      return 'Visualizaciones y transiciones de uso de items directas en la hoja de estilos.';
    case 'Módulo: Batalla (Battle)':
      return 'Área más activa del motor de animación. El HUD tiene transiciones manuales que deben refactorizarse.';
    case 'Componentes: Modales Globales':
      return 'Supera límites de SLOC por concentración de lógica de cosméticos y rankings.';
    case 'Módulo: Login & Autenticación':
      return 'Falta modularidad severa en la vista de Login (>600 líneas).';
    default:
      return 'Módulo regular en proceso de alineación.';
  }
}

function getVisualPurpose(file) {
  const name = file.toLowerCase();
  if (name.includes('battle')) return 'Orquestación de efectos de combate, movimientos y barra de salud';
  if (name.includes('avatar')) return 'Animación de frames, oscilaciones y efectos de estado del entrenador';
  if (name.includes('navigation') || name.includes('hud')) return 'Micro-interacciones del HUD principal y menús deslizantes';
  if (name.includes('trade')) return 'Transición de ofertas de intercambio y confirmación de transacciones';
  if (name.includes('app.vue')) return 'Carga inicial del juego y transiciones del overlay de carga';
  return 'Transición general de elementos y feedback táctil';
}

async function scanGsapUsage(dir) {
  let totalFiles = 0;
  let totalHits = 0;
  const topFiles = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS_LOCAL.has(entry.name)) continue;
        await walk(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        if (entry.name.includes('showdown')) continue;
        const content = await fs.readFile(fullPath, 'utf-8');
        const matches = content.match(/gsap\b/gi);
        if (matches) {
          totalFiles++;
          totalHits += matches.length;
          topFiles.push({ file: fullPath, count: matches.length });
        }
      }
    }
  }

  const IGNORE_DIRS_LOCAL = new Set(['node_modules', '.git', 'dist', 'backup_legacy_code', 'public', 'docs', 'scratch']);
  await walk(dir);

  topFiles.sort((a, b) => b.count - a.count);
  return { totalFiles, totalHits, topFiles };
}

main();
