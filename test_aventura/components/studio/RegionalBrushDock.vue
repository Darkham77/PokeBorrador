<script setup lang="ts">
/**
 * test_aventura/components/studio/RegionalBrushDock.vue
 *
 * CONTEXTUAL FLOATING CREATIVE & HEALING BRUSH DOCK
 *
 * Houses:
 *   - 5 Brush Modes (`heal`, `paint`, `line`, `fill`, `eyedropper`)
 *   - Domain selector when healing (`auto`, `mountain`, `water`, `path`, `macro_biome`)
 *   - Categorized 19 Paint Targets (`Terreno`, `Montaña`, `Biomas`, `Rutas`, `Naturaleza`)
 *   - Size presets (1, 3, 5, 9, 15), Shape (`square`/`circle`), `Auto-sanar borde`, Mountain Policy/Palette
 *   - Defect Inspector filter, count badge, Prev/Next navigation & active sample status
 */

import { computed, ref, watch } from 'vue';

import { MAX_FLOOD_FILL_CELLS } from '../../config/brushConfig.ts';
import { isValidHealingDomain } from '../../logic/map/autotileHealingEngine.ts';
import type { MountainPalette } from '../../logic/map/mountainAutotileEngine.ts';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import type { HealingDomain } from '../../types/map/autotileHealingTypes.ts';
import {
  BRUSH_SIZE_OPTIONS,
  type BrushMode,
  type BrushShape,
  type BrushTargetCategory,
  type MountainHealPolicy,
  type TerrainPaintTarget
} from '../../types/map/continentBrushTypes.ts';

interface HelpGuideEntry {
  readonly title: string;
  readonly description: string;
  readonly example: string;
}

interface BrushModeOption {
  readonly id: BrushMode;
  readonly label: string;
  readonly icon: string;
  readonly help: HelpGuideEntry;
}

interface HealingDomainOption {
  readonly id: HealingDomain;
  readonly label: string;
  readonly icon: string;
  readonly help: HelpGuideEntry;
}

interface CategoryTabOption {
  readonly id: BrushTargetCategory;
  readonly label: string;
  readonly icon: string;
  readonly help: HelpGuideEntry;
}

interface PaintTargetOption {
  readonly id: TerrainPaintTarget;
  readonly category: BrushTargetCategory;
  readonly label: string;
  readonly icon: string;
  readonly help: HelpGuideEntry;
}

interface BrushShapeOption {
  readonly id: BrushShape;
  readonly label: string;
  readonly icon: string;
  readonly help: HelpGuideEntry;
}

interface MountainPolicyOption {
  readonly id: MountainHealPolicy;
  readonly label: string;
  readonly help: HelpGuideEntry;
}

interface MountainPaletteOption {
  readonly id: MountainPalette;
  readonly label: string;
  readonly help: HelpGuideEntry;
}

const BRUSH_MODE_OPTIONS: readonly BrushModeOption[] = [
  {
    id: 'heal',
    label: 'Sanador',
    icon: '🩹',
    help: {
      title: 'Modo Sanador (🩹)',
      description:
        'Repara automáticamente bordes rotos, piezas sueltas o costuras mal conectadas donde hagas clic.',
      example:
        'Haz clic sobre una montaña cortada o una orilla rota para que el mapa reconstruya sus bordes.'
    }
  },
  {
    id: 'paint',
    label: 'Pintar',
    icon: '🖌️',
    help: {
      title: 'Modo Pintar a mano alzada (🖌️)',
      description:
        'Pinta libremente sobre el mapa mientras mantienes presionado el botón izquierdo del ratón.',
      example:
        'Elige "💧 Agua" o "⛰️ Subir +1" y arrastra el cursor por el mapa para dibujar un lago o una meseta.'
    }
  },
  {
    id: 'line',
    label: 'Línea',
    icon: '📏',
    help: {
      title: 'Modo Línea Recta (📏 o Shift+clic)',
      description: 'Une dos puntos del mapa con un trazo recto perfecto.',
      example:
        'Elige "🛤️ Camino" o "🌉 Puente", haz clic en el inicio y arrastra hasta el final para trazar una ruta recta.'
    }
  },
  {
    id: 'fill',
    label: 'Rellenar',
    icon: '🪣',
    help: {
      title: 'Modo Balde de Relleno (🪣)',
      description: `Inunda de golpe toda una zona conectada del mismo suelo (hasta ${MAX_FLOOD_FILL_CELLS} casillas).`,
      example:
        'Haz clic con "💧 Agua" dentro de un hueco rodeado de arena para convertirlo en un lago entero con un solo clic.'
    }
  },
  {
    id: 'eyedropper',
    label: 'Muestra',
    icon: '💉',
    help: {
      title: 'Modo Cuentagotas / Muestra (💉 o Alt+clic)',
      description:
        'Lee cualquier casilla del mapa y selecciona automáticamente esa misma herramienta para que sigas pintando igual.',
      example:
        'Haz clic sobre una montaña de granito o un puente existente para copiar su tipo y color exactos.'
    }
  }
] as const;

const HEALING_DOMAIN_OPTIONS: readonly HealingDomainOption[] = [
  {
    id: 'auto',
    label: 'Todo',
    icon: '🪄',
    help: {
      title: 'Sanar Todo Automático (🪄)',
      description:
        'Detecta y corrige a la vez montañas, agua, playas, caminos, puentes y biomas en la zona donde hagas clic.',
      example:
        'Úsalo cuando veas varios fallos juntos y quieras arreglar toda esa esquina de una sola pasada.'
    }
  },
  {
    id: 'mountain',
    label: 'Montaña',
    icon: '⛰️',
    help: {
      title: 'Sanar solo Montañas (⛰️)',
      description:
        'Corrige únicamente acantilados y crestas de montaña de 1 casilla, sin tocar lagos ni caminos.',
      example:
        'Úsalo sobre una cordillera fina para aplicar "Erodir" o "Rellenar" sin modificar el río de al lado.'
    }
  },
  {
    id: 'water',
    label: 'Agua',
    icon: '🌊',
    help: {
      title: 'Sanar solo Agua y Playas (🌊)',
      description:
        'Repara únicamente orillas de ríos, lagos, playas de arena y bordes de océano profundo.',
      example:
        'Pásalo por una costa con picos de agua sueltos para redondear la orilla sin alterar caminos ni montañas.'
    }
  },
  {
    id: 'path',
    label: 'Camino',
    icon: '🛤️',
    help: {
      title: 'Sanar solo Caminos y Puentes (🛤️)',
      description:
        'Ensancha caminos de tierra de 1 casilla al mínimo de 2 casillas y elimina restos de puentes mal cortados.',
      example:
        'Haz clic sobre un sendero o puente entrecortado para que recupere su ancho completo.'
    }
  },
  {
    id: 'macro_biome',
    label: 'Suelo',
    icon: '🌲',
    help: {
      title: 'Sanar solo Suelos Especiales (🌲)',
      description:
        'Limpia manchas sueltas de 1 casilla de Sierra o Ceniza volcánica y reconstruye su marco de piedra.',
      example: 'Pásalo por el borde de una zona volcánica para cerrar su anillo de contención.'
    }
  }
] as const;

const CATEGORY_TABS: readonly CategoryTabOption[] = [
  {
    id: 'terrain',
    label: 'Terreno',
    icon: '🗺️',
    help: {
      title: 'Categoría: Terreno y Suelos (🗺️)',
      description:
        'Los 6 tipos de suelo base del mapa: Océano, Agua, Arena, Pasto verde, Sierra menta y Ceniza volcánica.',
      example: 'Elige cualquiera de estos 6 suelos para cambiar la superficie base del continente.'
    }
  },
  {
    id: 'mountain',
    label: 'Montaña',
    icon: '⛰️',
    help: {
      title: 'Categoría: Relieve de Montaña (⛰️)',
      description:
        'Herramientas para levantar o bajar pisos de montaña, cambiar entre roca Café o Granito y poner escaleras.',
      example:
        'Usa "Subir +1" con tamaño 5 para crear una meseta y luego "Escalera" en su borde sur.'
    }
  },
  {
    id: 'route',
    label: 'Rutas',
    icon: '🛤️',
    help: {
      title: 'Categoría: Caminos y Puentes (🛤️)',
      description:
        'Construye senderos de tierra sobre suelo firme y puentes de madera para cruzar ríos o lagos.',
      example: 'Combina esta pestaña con el modo "📏 Línea" para unir dos pueblos rápidamente.'
    }
  },
  {
    id: 'wilderness',
    label: 'Natura',
    icon: '🌳',
    help: {
      title: 'Categoría: Naturaleza y Borrador (🌳)',
      description:
        'Añade hierba salvaje, árboles o adornos naturales sobre el pasto, o usa el Borrador para limpiarlos.',
      example:
        'Pinta "🌾 Hierba" y "🌳 Árbol" alrededor de un camino, y usa "🧹 Borrador" si quieres despejar un claro.'
    }
  }
] as const;

const PAINT_TARGET_OPTIONS: readonly PaintTargetOption[] = [
  {
    id: 'terrain_water_deep',
    category: 'terrain',
    label: 'Océano',
    icon: '🌊',
    help: {
      title: 'Océano Profundo (🌊)',
      description:
        'Pinta mar profundo azul oscuro. Si "Auto-sanar borde" está activo, crea su orilla de agua clara automáticamente.',
      example: 'Pinta con tamaño 5 o 9 en las afueras de la isla para abrir mar profundo.'
    }
  },
  {
    id: 'terrain_water',
    category: 'terrain',
    label: 'Agua',
    icon: '💧',
    help: {
      title: 'Agua Costera / Río (💧)',
      description: 'Pinta agua clara para lagos interiores, ríos y costas navegables.',
      example:
        'Arrastra con tamaño 3 o 5 a través del pasto para abrir un río que luego puedas cruzar con un puente.'
    }
  },
  {
    id: 'terrain_sand',
    category: 'terrain',
    label: 'Arena',
    icon: '🏖️',
    help: {
      title: 'Arena de Playa / Desierto (🏖️)',
      description: 'Pinta suelo de arena dorada con bordes suaves hacia el pasto y el agua.',
      example: 'Pásalo entre el pasto y el agua para formar una playa o una explanada desértica.'
    }
  },
  {
    id: 'terrain_grass',
    category: 'terrain',
    label: 'Pasto',
    icon: '🟩',
    help: {
      title: 'Pasto Verde Clásico (🟩)',
      description:
        'Restaura el suelo firme de hierba verde normal sobre cualquier agua, arena, sierra o ceniza.',
      example:
        'Úsalo para rellenar un lago con tierra firme o volver a pintar de verde una zona volcánica.'
    }
  },
  {
    id: 'biome_mint_highland',
    category: 'terrain',
    label: 'Sierra',
    icon: '🌲',
    help: {
      title: 'Pasto de Sierra / Altiplano (🌲)',
      description:
        'Pinta suelo de hierba fresca color verde menta, ideal para zonas altas y bosques de pinos.',
      example:
        'Pinta una zona con "🌲 Sierra" y luego añade "🌳 Árbol" en Natura para que crezcan pinos de montaña.'
    }
  },
  {
    id: 'biome_volcanic_plateau',
    category: 'terrain',
    label: 'Ceniza',
    icon: '🌋',
    help: {
      title: 'Suelo de Ceniza Volcánica (🌋)',
      description:
        'Pinta tierra gris oscura de ceniza volcánica rodeada automáticamente por un borde de roca.',
      example: 'Pinta alrededor de una montaña con tamaño 5 para crear la base de un volcán.'
    }
  },
  {
    id: 'elevation_raise',
    category: 'mountain',
    label: 'Subir +1',
    icon: '⬆️',
    help: {
      title: 'Subir Altura de Montaña +1 (⬆️)',
      description:
        'Eleva el suelo firme 1 piso de montaña (hasta 3 pisos) y genera sus paredes de roca automáticamente.',
      example:
        'Pinta con tamaño 5 sobre el pasto para levantar una meseta de piso 1; vuelve a pasar encima para subirla a piso 2.'
    }
  },
  {
    id: 'elevation_lower',
    category: 'mountain',
    label: 'Bajar -1',
    icon: '⬇️',
    help: {
      title: 'Bajar Altura de Montaña -1 (⬇️)',
      description:
        'Rebaja 1 piso de altura en una montaña existente hasta dejarla al nivel del suelo.',
      example: 'Pásalo por el centro de una montaña para abrir un cañón o deshacer una colina.'
    }
  },
  {
    id: 'mountain_palette',
    category: 'mountain',
    label: 'Color Roca',
    icon: '🎨',
    help: {
      title: 'Cambiar Color de Roca (🎨)',
      description:
        'Cambia el color de una montaña ya construida entre roca Café (marrón) y Granito (gris) sin cambiar su altura.',
      example:
        'Elige "⚪ Granito" abajo y pinta sobre una montaña marrón para transformarla en roca gris.'
    }
  },
  {
    id: 'mountain_stair',
    category: 'mountain',
    label: 'Escalera',
    icon: '🪜',
    help: {
      title: 'Escalera de Montaña (🪜)',
      description:
        'Coloca una escalera de 2 casillas de ancho sobre la pared sur recta de una montaña.',
      example:
        'Haz clic justo en el borde inferior (pared sur) de una meseta para incrustar los escalones de subida.'
    }
  },
  {
    id: 'path_dirt',
    category: 'route',
    label: 'Camino',
    icon: '🛤️',
    help: {
      title: 'Camino de Tierra (🛤️)',
      description:
        'Dibuja senderos de tierra sobre suelo firme (con "Auto-sanar borde" mantiene siempre un ancho limpio de 2 casillas).',
      example:
        'Arrastra sobre el pasto o usa el modo "📏 Línea" para conectar un pueblo con una escalera de montaña.'
    }
  },
  {
    id: 'bridge_wood',
    category: 'route',
    label: 'Puente',
    icon: '🌉',
    help: {
      title: 'Puente de Madera (🌉)',
      description:
        'Construye pasarelas de madera exclusivamente sobre casillas de agua (ignora la tierra firme).',
      example:
        'Usa tamaño 3 y modo "📏 Línea" de una orilla a la otra de un río para tender un puente completo.'
    }
  },
  {
    id: 'wilderness_tall_grass',
    category: 'wilderness',
    label: 'Hierba',
    icon: '🌾',
    help: {
      title: 'Hierba Salvaje Pokémon (🌾)',
      description: 'Planta matas de hierba alta sobre el pasto donde aparecen Pokémon salvajes.',
      example: 'Pinta al costado de un camino con tamaño 3 o 5 para crear una zona de captura.'
    }
  },
  {
    id: 'wilderness_tree',
    category: 'wilderness',
    label: 'Árbol',
    icon: '🌳',
    help: {
      title: 'Árboles de Bosque (🌳)',
      description:
        'Planta árboles grandes sin superponerse (crecen robles en el pasto verde y pinos en el suelo de Sierra).',
      example:
        'Arrastra con tamaño 5 alrededor de una ruta para cerrarla con una muralla natural de árboles.'
    }
  },
  {
    id: 'wilderness_prop',
    category: 'wilderness',
    label: 'Adorno',
    icon: '🌸',
    help: {
      title: 'Adornos Naturales (🌸)',
      description:
        'Coloca flores rojas, rocas pequeñas o carteles de madera según el tipo de suelo.',
      example:
        'Haz toques con tamaño 1 o 3 junto a la entrada de un pueblo para decorar el paisaje.'
    }
  },
  {
    id: 'eraser_overlay',
    category: 'wilderness',
    label: 'Borrador',
    icon: '🧹',
    help: {
      title: 'Borrador de Objetos y Rutas (🧹)',
      description:
        'Quita hierba alta, árboles, adornos, caminos, puentes y escaleras dejando intacto el suelo y los edificios.',
      example:
        'Pásalo sobre un bosque tupido o un puente que ya no quieras para despejar el terreno al instante.'
    }
  }
] as const;

const BRUSH_SHAPE_OPTIONS: readonly BrushShapeOption[] = [
  {
    id: 'square',
    label: 'Cuadro',
    icon: '⬜',
    help: {
      title: 'Forma Cuadrada (⬜)',
      description: 'El pincel pinta un bloque cuadrado exacto de casillas (1×1, 3×3, 5×5...).',
      example: 'Ideal para levantar mesetas de montaña rectas, caminos y puentes.'
    }
  },
  {
    id: 'circle',
    label: 'Círculo',
    icon: '⚪',
    help: {
      title: 'Forma Circular (⚪)',
      description: 'El pincel recorta las esquinas para pintar manchas redondas más naturales.',
      example: 'Ideal con tamaño 9 o 15 para dibujar lagos redondos, islas o playas curvas.'
    }
  }
] as const;

const MOUNTAIN_POLICY_OPTIONS: readonly MountainPolicyOption[] = [
  {
    id: 'erode',
    label: 'Erodir',
    help: {
      title: 'Política de Montaña: Erodir',
      description:
        'Si una montaña queda demasiado fina (1 o 2 casillas) y no caben sus paredes, la rebaja suavemente.',
      example: 'Úsalo para limpiar picos sueltos o rebabas finas al esculpir montañas.'
    }
  },
  {
    id: 'fill',
    label: 'Rellenar',
    help: {
      title: 'Política de Montaña: Rellenar',
      description:
        'Si dibujas una línea fina de montaña, la engrosa automáticamente a 3 casillas para que forme una meseta sólida.',
      example:
        'Actívalo antes de trazar una cordillera con tamaño 1 para que se convierta sola en un macizo completo.'
    }
  }
] as const;

const MOUNTAIN_PALETTE_OPTIONS: readonly MountainPaletteOption[] = [
  {
    id: 'brown',
    label: '🟤 Café',
    help: {
      title: 'Roca Café (🟤)',
      description: 'Acantilados y mesetas de piedra marrón clásica.',
      example: 'Úsalo para colinas, rutas rocosas y montañas tradicionales.'
    }
  },
  {
    id: 'gray',
    label: '⚪ Granito',
    help: {
      title: 'Roca de Granito Gris (⚪)',
      description: 'Acantilados y mesetas de piedra gris clara de alta montaña.',
      example: 'Úsalo para distinguir cordilleras altas o zonas rocosas especiales.'
    }
  }
] as const;

const AUTO_HEAL_HELP: HelpGuideEntry = {
  title: 'Auto-sanar borde al pintar',
  description:
    'Mientras está marcado, cada trazo que pintas corrige automáticamente sus orillas, acantilados y esquinas.',
  example:
    'Déjalo activado para que todo quede limpio al instante, o desmárcalo si quieres poner casillas sueltas.'
};

function getBrushSizeHelp(sz: number): HelpGuideEntry {
  return {
    title: `Tamaño del pincel: ${sz}×${sz} casillas`,
    description:
      sz === 1
        ? 'Pinta una única casilla exacta (1×1). También puedes cambiar el tamaño con las teclas [ y ].'
        : `Abarca un área de ${sz} por ${sz} casillas en cada toque.`,
    example:
      sz <= 3
        ? 'Usa 1 o 3 para detalles finos, escaleras, caminos y puentes.'
        : 'Usa 5, 9 o 15 para levantar montañas enteras, abrir lagos o rellenar bosques rápido.'
  };
}

function formatTooltip(help: HelpGuideEntry): string {
  return `${help.title}: ${help.description} Ejemplo: ${help.example}`;
}

const store = useRegionalContinentStudioStore();
const activeCategory = ref<BrushTargetCategory>('terrain');
const hoveredHelp = ref<HelpGuideEntry | null>(null);
const lastTargetByCategory: Record<BrushTargetCategory, TerrainPaintTarget> = {
  terrain: 'terrain_water',
  mountain: 'elevation_raise',
  route: 'path_dirt',
  wilderness: 'wilderness_tree'
};

function setHoveredHelp(help: HelpGuideEntry): void {
  hoveredHelp.value = help;
}

function clearHoveredHelp(): void {
  hoveredHelp.value = null;
}

watch(
  () => store.paintTarget,
  (target) => {
    if (target === 'biome_temperate_meadow' || target === 'biome_viridian_forest') {
      store.setPaintTarget('terrain_grass');
      return;
    }
    if (target === 'biome_arid_desert') {
      store.setPaintTarget('terrain_sand');
      return;
    }
    const matched = PAINT_TARGET_OPTIONS.find((opt) => opt.id === target);
    if (matched) {
      activeCategory.value = matched.category;
      lastTargetByCategory[matched.category] = matched.id;
    }
  },
  { immediate: true }
);

watch(
  () => store.mountainPalette,
  (pal) => {
    if (pal === 'volcanic') {
      store.setMountainPalette('brown');
    }
  },
  { immediate: true }
);

const activeHelp = computed<HelpGuideEntry>(() => {
  if (hoveredHelp.value) return hoveredHelp.value;
  if (store.brushMode === 'heal') {
    const dom = HEALING_DOMAIN_OPTIONS.find((d) => d.id === store.healingBrushDomain);
    return dom?.help ?? BRUSH_MODE_OPTIONS[0]!.help;
  }
  if (store.brushMode === 'eyedropper') {
    return BRUSH_MODE_OPTIONS.find((m) => m.id === 'eyedropper')!.help;
  }
  const targetOpt = PAINT_TARGET_OPTIONS.find((opt) => opt.id === store.paintTarget);
  if (targetOpt) {
    if (store.brushMode === 'line') {
      return {
        title: `📏 Línea Recta con ${targetOpt.icon} ${targetOpt.label}`,
        description: `Traza una franja recta de ${targetOpt.label} sobre el mapa uniendo dos puntos.`,
        example: `En el mapa: haz clic en el Punto 1 y luego clic en el Punto 2 (o mantén presionado y arrastra).`
      };
    }
    if (store.brushMode === 'fill') {
      return {
        title: `🪣 Rellenar área con ${targetOpt.icon} ${targetOpt.label}`,
        description: targetOpt.help.description,
        example: `Haz clic sobre una zona del mapa para inundarla entera con ${targetOpt.label}.`
      };
    }
    return targetOpt.help;
  }
  return BRUSH_MODE_OPTIONS[0]!.help;
});

const visibleTargets = computed<readonly PaintTargetOption[]>(() =>
  PAINT_TARGET_OPTIONS.filter((opt) => opt.category === activeCategory.value)
);

const showsMountainPalette = computed<boolean>(
  () =>
    store.brushMode !== 'heal' &&
    (store.paintTarget === 'elevation_raise' || store.paintTarget === 'mountain_palette')
);

const defectPositionLabel = computed<string>(() => {
  const total = store.filteredDefectRecords.length;
  if (total === 0) return '0';
  if (store.activeDefectIndex < 0) return `0 / ${total}`;
  return `${store.activeDefectIndex + 1} / ${total}`;
});

function selectCategory(catId: BrushTargetCategory): void {
  activeCategory.value = catId;
  const currentOpt = PAINT_TARGET_OPTIONS.find((opt) => opt.id === store.paintTarget);
  if (!currentOpt || currentOpt.category !== catId) {
    store.setPaintTarget(lastTargetByCategory[catId]);
  }
  if (store.brushMode === 'heal' || store.brushMode === 'eyedropper') {
    store.setBrushMode('paint');
  }
}

function selectTarget(opt: PaintTargetOption): void {
  lastTargetByCategory[opt.category] = opt.id;
  store.setPaintTarget(opt.id);
  if (store.brushMode === 'heal' || store.brushMode === 'eyedropper') {
    store.setBrushMode('paint');
  }
}

function handleAutoHealToggle(e: Event): void {
  const input = e.target as HTMLInputElement;
  store.setAutoHealOnPaint(input.checked);
}

function handleDefectDomainFilterChange(e: Event): void {
  const select = e.target as HTMLSelectElement;
  if (isValidHealingDomain(select.value)) {
    store.setDefectFilterDomain(select.value);
  }
}
</script>

<template>
  <aside
    id="panel-regional-brush-dock"
    class="regional-brush-dock"
    role="region"
    aria-label="Taller de pincel regional"
    @pointerdown.stop
  >
    <header class="dock-header">
      <div class="dock-title-group">
        <span class="emoji-inline">🎨</span>
        <h3 class="dock-title">Taller de Pincel</h3>
        <span
          v-if="store.lastBrushSample"
          id="badge-brush-sample"
          class="sample-pill"
          :title="store.lastBrushSample.description"
        >
          {{ store.lastBrushSample.description }}
        </span>
      </div>
      <button
        id="btn-close-brush-dock"
        type="button"
        class="dock-close-btn"
        aria-label="Cerrar taller de pincel"
        title="Cerrar (B)"
        @click="store.toggleHealingBrush(false)"
      >
        <span class="emoji-inline">✕</span>
      </button>
    </header>

    <!-- Row 1: Brush Mode Selector -->
    <section class="dock-section" aria-label="Modo de pincel">
      <div class="pill-row modes-row">
        <button
          v-for="mode in BRUSH_MODE_OPTIONS"
          :id="'btn-brush-mode-' + mode.id"
          :key="mode.id"
          type="button"
          class="dock-btn"
          :class="{ active: store.brushMode === mode.id }"
          :title="formatTooltip(mode.help)"
          @mouseenter="setHoveredHelp(mode.help)"
          @mouseleave="clearHoveredHelp"
          @click="store.setBrushMode(mode.id)"
        >
          <span class="emoji-inline">{{ mode.icon }}</span>
          <span class="btn-lbl">{{ mode.label }}</span>
        </button>
      </div>
    </section>

    <!-- Row 2A: Healing Domain (when in heal mode) -->
    <section
      v-if="store.brushMode === 'heal'"
      class="dock-section"
      aria-label="Dominio de sanación"
    >
      <div class="pill-row">
        <button
          v-for="dom in HEALING_DOMAIN_OPTIONS"
          :id="'btn-heal-domain-' + dom.id"
          :key="dom.id"
          type="button"
          class="dock-btn"
          :class="{ active: store.healingBrushDomain === dom.id }"
          :title="formatTooltip(dom.help)"
          @mouseenter="setHoveredHelp(dom.help)"
          @mouseleave="clearHoveredHelp"
          @click="store.setHealingBrushDomain(dom.id)"
        >
          <span class="emoji-inline">{{ dom.icon }}</span>
          <span>{{ dom.label }}</span>
        </button>
      </div>
    </section>

    <!-- Row 2B: Creative Paint Targets (when not in heal mode) -->
    <section v-else class="dock-section" aria-label="Objetivo de pintura">
      <div class="pill-row categories-row">
        <button
          v-for="cat in CATEGORY_TABS"
          :id="'btn-brush-cat-' + cat.id"
          :key="cat.id"
          type="button"
          class="dock-tab-btn"
          :class="{ active: activeCategory === cat.id }"
          :title="formatTooltip(cat.help)"
          @mouseenter="setHoveredHelp(cat.help)"
          @mouseleave="clearHoveredHelp"
          @click="selectCategory(cat.id)"
        >
          <span class="emoji-inline">{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <div class="pill-row targets-row">
        <button
          v-for="opt in visibleTargets"
          :id="'btn-paint-target-' + opt.id"
          :key="opt.id"
          type="button"
          class="dock-btn target-btn"
          :class="{ active: store.paintTarget === opt.id }"
          :title="formatTooltip(opt.help)"
          @mouseenter="setHoveredHelp(opt.help)"
          @mouseleave="clearHoveredHelp"
          @click="selectTarget(opt)"
        >
          <span class="emoji-inline">{{ opt.icon }}</span>
          <span>{{ opt.label }}</span>
        </button>
      </div>

      <div v-if="showsMountainPalette" class="sub-param-row">
        <span class="param-label">Color de roca:</span>
        <button
          v-for="pal in MOUNTAIN_PALETTE_OPTIONS"
          :id="'btn-mountain-palette-' + pal.id"
          :key="pal.id"
          type="button"
          class="dock-btn mini-btn"
          :class="{ active: store.mountainPalette === pal.id }"
          :title="formatTooltip(pal.help)"
          @mouseenter="setHoveredHelp(pal.help)"
          @mouseleave="clearHoveredHelp"
          @click="store.setMountainPalette(pal.id)"
        >
          {{ pal.label }}
        </button>
      </div>
    </section>

    <!-- Interactive Guide Box: Explains what the hovered or active tool does + concrete example -->
    <section
      id="brush-dock-help-card"
      class="dock-help-card"
      aria-live="polite"
      aria-label="Guía rápida de la herramienta"
    >
      <div class="help-card-header">
        <span class="emoji-inline">💡</span>
        <strong id="brush-dock-help-title" class="help-card-title">{{ activeHelp.title }}</strong>
      </div>
      <p id="brush-dock-help-desc" class="help-card-desc">{{ activeHelp.description }}</p>
      <p id="brush-dock-help-example" class="help-card-example">
        <strong>Ejemplo:</strong> {{ activeHelp.example }}
      </p>
    </section>

    <!-- Row 3: Parameters (Size, Shape, Auto-Heal, Mountain Policy) -->
    <section class="dock-section params-grid" aria-label="Parámetros del pincel">
      <div class="param-group">
        <span class="param-label">Tam:</span>
        <button
          v-for="sz in BRUSH_SIZE_OPTIONS"
          :id="'btn-brush-size-' + sz"
          :key="sz"
          type="button"
          class="dock-btn mini-btn"
          :class="{ active: store.brushSize === sz }"
          :aria-label="`Tamaño ${sz} por ${sz}`"
          :title="formatTooltip(getBrushSizeHelp(sz))"
          @mouseenter="setHoveredHelp(getBrushSizeHelp(sz))"
          @mouseleave="clearHoveredHelp"
          @click="store.setBrushSize(sz)"
        >
          {{ sz }}
        </button>
      </div>

      <div class="param-group">
        <button
          v-for="sh in BRUSH_SHAPE_OPTIONS"
          :id="'btn-brush-shape-' + sh.id"
          :key="sh.id"
          type="button"
          class="dock-btn mini-btn"
          :class="{ active: store.brushShape === sh.id }"
          :title="formatTooltip(sh.help)"
          @mouseenter="setHoveredHelp(sh.help)"
          @mouseleave="clearHoveredHelp"
          @click="store.setBrushShape(sh.id)"
        >
          <span class="emoji-inline">{{ sh.icon }}</span>
          <span>{{ sh.label }}</span>
        </button>
      </div>

      <div class="param-group policy-group">
        <label
          class="auto-heal-check"
          :title="formatTooltip(AUTO_HEAL_HELP)"
          @mouseenter="setHoveredHelp(AUTO_HEAL_HELP)"
          @mouseleave="clearHoveredHelp"
        >
          <input
            id="chk-auto-heal-paint"
            type="checkbox"
            :checked="store.autoHealOnPaint"
            aria-label="Auto-sanar borde al pintar"
            @change="handleAutoHealToggle"
          />
          <span>Auto-sanar borde</span>
        </label>

        <div class="policy-switch">
          <button
            v-for="pol in MOUNTAIN_POLICY_OPTIONS"
            :id="'btn-mountain-policy-' + pol.id"
            :key="pol.id"
            type="button"
            class="dock-btn mini-btn"
            :class="{ active: store.mountainPolicy === pol.id }"
            :title="formatTooltip(pol.help)"
            @mouseenter="setHoveredHelp(pol.help)"
            @mouseleave="clearHoveredHelp"
            @click="store.setMountainPolicy(pol.id)"
          >
            {{ pol.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Row 4: Autotile Defect Inspector -->
    <footer class="dock-footer" aria-label="Inspector de defectos">
      <div class="inspector-controls">
        <select
          id="select-defect-filter-domain"
          class="inspector-select"
          aria-label="Filtrar defectos por dominio"
          :value="store.defectFilterDomain"
          @change="handleDefectDomainFilterChange"
        >
          <option value="auto">Todos ({{ store.defectCountsByDomain.auto }})</option>
          <option value="mountain">Montañas ({{ store.defectCountsByDomain.mountain }})</option>
          <option value="water">Agua ({{ store.defectCountsByDomain.water }})</option>
          <option value="path">Caminos ({{ store.defectCountsByDomain.path }})</option>
          <option value="macro_biome">Suelos ({{ store.defectCountsByDomain.macro_biome }})</option>
        </select>

        <div class="nav-pair">
          <button
            id="btn-defect-prev"
            type="button"
            class="dock-btn mini-btn"
            :disabled="store.filteredDefectRecords.length === 0"
            aria-label="Defecto anterior"
            title="Ir al defecto anterior en el mapa"
            @click="store.stepToDefect(-1)"
          >
            <span class="emoji-inline">◀</span>
          </button>
          <span class="defect-counter">{{ defectPositionLabel }}</span>
          <button
            id="btn-defect-next"
            type="button"
            class="dock-btn mini-btn"
            :disabled="store.filteredDefectRecords.length === 0"
            aria-label="Siguiente defecto"
            title="Ir al siguiente defecto en el mapa"
            @click="store.stepToDefect(1)"
          >
            <span class="emoji-inline">▶</span>
          </button>
        </div>
      </div>

      <p v-if="store.activeDefect" class="inspector-caption">
        ({{ store.activeDefect.x }}, {{ store.activeDefect.y }}) ·
        {{ store.activeDefect.description }}
      </p>
      <p v-else class="inspector-caption">
        Atajos: [WASD] Mover mapa · [B] Pincel · [ ] Tamaño · [Shift] Línea · [Alt] Muestra
      </p>
    </footer>
  </aside>
</template>

<style scoped lang="scss">
.regional-brush-dock {
  position: absolute;
  z-index: calc(var(--z-map-floor) + 18);
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 10px 12px;
  border: 1px solid Rgb(56 189 248 / 32%);
  border-radius: $radius-lg;
  background: Rgb(15 23 42 / 94%);
  color: var(--slate-50);
  font-size: var(--font-12);
  line-height: 1.35;
  inset-block-end: calc(56px + env(safe-area-inset-bottom, 0px));
  inset-inline-start: calc(16px + env(safe-area-inset-left, 0px));
  inline-size: min(448px, calc(100dvw - 32px));
  backdrop-filter: Blur(10px);
  box-shadow: $shadow-lg;
  overflow: clip;
  user-select: none;

  @media (width <= 768px) {
    padding: 8px 10px;
    inset-block-end: calc(10px + env(safe-area-inset-bottom, 0px));
    inset-inline: 8px 66px;
    inline-size: auto;
    max-block-size: 46dvh;
    overflow-y: auto;
  }
}

.dock-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm;
  border-bottom: 1px solid Rgb(255 255 255 / 10%);
  padding-bottom: 6px;
}

.dock-title-group {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  min-inline-size: 0;
}

.dock-title {
  margin: 0;
  color: var(--sky);
  font-size: var(--font-13);
  font-weight: $font-weight-bold;
  white-space: nowrap;
}

.sample-pill {
  padding: 2px 6px 3px;
  border: 1px solid Rgb(16 185 129 / 45%);
  border-radius: $radius-full;
  background: Rgb(16 185 129 / 15%);
  color: var(--emerald-400);
  font-size: var(--font-10);
  font-weight: $font-weight-semibold;
  max-inline-size: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-close-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border: 1px solid Rgb(255 255 255 / 16%);
  border-radius: $radius-full;
  background: Rgb(255 255 255 / 8%);
  color: var(--slate-300);
  inline-size: 24px;
  block-size: 24px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--sky);
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      background: Rgb(255 255 255 / 18%);
      color: var(--white);
    }
  }
}

.dock-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.sub-param-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-xs;
}

.params-grid {
  border-top: 1px solid Rgb(255 255 255 / 8%);
  padding-top: 6px;
}

.param-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-xs;
}

.policy-group {
  justify-content: space-between;
}

.policy-switch {
  display: inline-flex;
  gap: $spacing-xs;
}

.param-label {
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: $font-weight-semibold;
}

.auto-heal-check {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  color: var(--slate-300);
  font-size: var(--font-11);
  font-weight: $font-weight-semibold;
  cursor: pointer;

  input[type='checkbox'] {
    accent-color: var(--emerald-400);
    cursor: pointer;
  }
}

.dock-btn,
.dock-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 4px 8px;
  border: 1px solid Rgb(255 255 255 / 14%);
  border-radius: $radius-md;
  background: Rgb(255 255 255 / 7%);
  color: var(--slate-50);
  font-size: var(--font-11);
  font-weight: $font-weight-semibold;
  line-height: 1.35;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--sky);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.active {
    background: Rgb(16 185 129 / 28%);
    color: var(--emerald-400);
    border-color: var(--emerald-400);
  }

  &.mini-btn {
    padding: 3px 7px;
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      background: Rgb(255 255 255 / 16%);
    }
  }
}

.dock-tab-btn.active {
  background: Rgb(56 189 248 / 22%);
  color: var(--sky);
  border-color: var(--sky);
}

.dock-help-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: $spacing-xs;
  padding: 7px 9px;
  border: 1px solid Rgb(56 189 248 / 28%);
  border-radius: $radius-md;
  background: Rgb(30 41 59 / 88%);
  block-size: 82px;
  overflow: hidden;
}

.help-card-header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.help-card-title {
  color: var(--sky);
  font-size: var(--font-11);
  font-weight: $font-weight-bold;
}

.help-card-desc {
  margin: 0;
  color: var(--slate-200);
  font-size: var(--font-11);
  line-height: 1.35;
}

.help-card-example {
  margin: 0;
  color: var(--emerald-400);
  font-size: var(--font-10);
  line-height: 1.35;
}

.dock-footer {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  border-top: 1px solid Rgb(255 255 255 / 8%);
  padding-top: 6px;
}

.inspector-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm;
}

.inspector-select {
  padding: 3px 8px;
  border: 1px solid Rgb(255 255 255 / 16%);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-11);
  font-weight: $font-weight-semibold;
  flex: 1;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--sky);
    outline-offset: 1px;
  }
}

.nav-pair {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
}

.defect-counter {
  color: var(--slate-300);
  font-family: monospace;
  font-size: var(--font-11);
  text-align: center;
  min-inline-size: 46px;
}

.inspector-caption {
  margin: 0;
  color: var(--slate-400);
  font-size: var(--font-10);
  line-height: 1.45;
  padding-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
