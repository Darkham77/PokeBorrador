<script setup lang="ts">
import { computed } from 'vue';
import { getCombinedEffectiveness } from '../../src/logic/pokemon/typeEngine';
import { getMoveDescription } from '../../src/logic/pokemonUtils';
import { pokemonDataProvider } from '../../src/logic/providers/pokemonDataProvider';
import moveTranslations from '../sandbox_db/data/move_translations.json';
import moveDescriptions from '../sandbox_db/data/move_descriptions.json';
import showdownDB from '../sandbox_db/data/showdown_db.json';
import type { ShowdownLocalDB } from '../sandbox_db/cloner/extract_logic';
import gsap from 'gsap';

interface Props {
  moveId: string;
  attacker: {
    id: string;
    name: string;
    types: string[];
  } | null;
  defender: {
    id: string;
    name: string;
    types: string[];
  } | null;
  visible: boolean;
}

const props = defineProps<Props>();

const typedDB = showdownDB as unknown as ShowdownLocalDB;

// Mapeo de tipos en español
const TYPE_TRANSLATIONS: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  grass: 'Planta',
  electric: 'Eléctrico',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  dark: 'Siniestro',
  steel: 'Acero',
  fairy: 'Hada'
};

const translateType = (type: string) => {
  return TYPE_TRANSLATIONS[type.toLowerCase()] || type;
};

// Mapeo de categorías
const translateCategory = (cat: string) => {
  if (cat.toLowerCase() === 'physical') return 'Físico';
  if (cat.toLowerCase() === 'special') return 'Especial';
  return 'Estado';
};

// Obtener datos crudos de Showdown para el movimiento
const move = computed(() => {
  if (!props.moveId) return null;
  const cleanId = props.moveId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return typedDB.moves[cleanId] || null;
});

// Nombre oficial en español
const moveNameEs = computed(() => {
  if (!move.value) return '';
  const cleanId = move.value.id.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (moveTranslations as Record<string, string>)[cleanId] || move.value.name;
});

// Descripción oficial en español
const moveDesc = computed(() => {
  if (!move.value) return '';
  const nameEs = moveNameEs.value;
  
  // Buscar en la base de datos interna de Poke Vicio por nombre en español
  const gameMoveData = pokemonDataProvider.getMoveData(nameEs);
  if (gameMoveData) {
    return getMoveDescription(nameEs, gameMoveData);
  }
  
  // Fallback a descripciones oficiales en español de PokeAPI para Showdown Sandbox
  const cleanId = move.value.id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const translatedDesc = (moveDescriptions as Record<string, string>)[cleanId];
  if (translatedDesc) {
    return translatedDesc;
  }
  
  // Fallback si no está en ninguna base de datos
  return move.value.shortDesc || move.value.desc || 'Causa daño al oponente sin efectos secundarios adicionales.';
});

// Cálculo dinámico de STAB (Mismo Tipo)
const hasStab = computed(() => {
  if (!props.attacker || !props.attacker.types || !move.value) return false;
  const moveType = move.value.type.toLowerCase();
  return props.attacker.types.some(t => t.toLowerCase() === moveType);
});

const stabMultiplier = computed(() => {
  if (!move.value || move.value.category.toLowerCase() === 'status') return 1.0;
  return hasStab.value ? 1.5 : 1.0;
});

// Cálculo dinámico de efectividad cruzada contra defensor
const effectiveness = computed(() => {
  if (!props.defender || !props.defender.types || !move.value) return 1.0;
  const moveType = move.value.type.toLowerCase();
  
  const def = {
    type: props.defender.types[0]?.toLowerCase() || 'normal',
    type2: props.defender.types[1]?.toLowerCase() || undefined
  };
  
  return getCombinedEffectiveness(moveType, def);
});

// Calificación visual de efectividad
const effectivenessLabel = computed(() => {
  const eff = effectiveness.value;
  if (eff === 0) return 'Inmune (x0)';
  if (eff === 0.25) return 'Muy poco eficaz (x0.25)';
  if (eff === 0.5) return 'Poco eficaz (x0.5)';
  if (eff === 2.0) return '¡Súper eficaz! (x2)';
  if (eff === 4.0) return '¡Eficacia letal! (x4)';
  return 'Neutro (x1)';
});

const effectivenessClass = computed(() => {
  const eff = effectiveness.value;
  if (eff === 0) return 'eff-immune';
  if (eff < 1.0) return 'eff-resisted';
  if (eff > 1.0) return 'eff-super';
  return 'eff-neutral';
});

// Potencia final estimada
const estimatedPower = computed(() => {
  if (!move.value) return 0;
  if (move.value.category.toLowerCase() === 'status' || move.value.basePower === 0) return 0;
  return Math.floor(move.value.basePower * stabMultiplier.value * effectiveness.value);
});

// Animaciones GSAP usando hooks de Vue Transition
const onBeforeEnter = (el: Element) => {
  gsap.set(el, {
    opacity: 0,
    y: 15,
    scale: 0.95
  });
};

const onEnter = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.25,
    ease: 'power2.out',
    onComplete: done
  });
};

const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    y: 10,
    scale: 0.95,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: done
  });
};
</script>

<template>
  <div class="move-tooltip-container">
    <Transition
      :css="false"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="visible && move"
        class="move-tooltip-card"
      >
        <!-- Header -->
        <div class="tooltip-header">
          <div class="header-main">
            <span class="move-title">{{ moveNameEs }}</span>
            <div class="badges-row">
              <span :class="['type-badge', `badge-${move.type.toLowerCase()}`]">
                {{ translateType(move.type) }}
              </span>
              <span :class="['cat-badge', `cat-${move.category.toLowerCase()}`]">
                {{ translateCategory(move.category) }}
              </span>
            </div>
          </div>
          <div class="move-stats">
            <div class="stat-item">
              <span class="stat-label">PP:</span>
              <span class="stat-value">{{ move.pp }}/{{ move.pp }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Prec:</span>
              <span class="stat-value">{{ move.accuracy === true ? '—' : move.accuracy + '%' }}</span>
            </div>
          </div>
        </div>

        <!-- Math breakdown -->
        <div class="tooltip-math-section">
          <h4 class="section-title">
            📊 ANÁLISIS MATEMÁTICO
          </h4>
          
          <div class="math-grid">
            <div class="math-row">
              <span class="math-label">Poder Base (BP):</span>
              <span class="math-value highlight">{{ move.basePower || '—' }}</span>
            </div>

            <div class="math-row">
              <span class="math-label">STAB (x1.5 Coincidencia):</span>
              <span :class="['math-value', { 'stab-active': hasStab && move.category.toLowerCase() !== 'status' }]">
                {{ hasStab && move.category.toLowerCase() !== 'status' ? '✓ Sí (x1.5)' : '✗ No (x1.0)' }}
              </span>
            </div>

            <div class="math-row">
              <span class="math-label">Eficacia vs {{ defender?.name }}:</span>
              <span :class="['math-value', effectivenessClass]">
                {{ effectivenessLabel }}
              </span>
            </div>

            <div class="math-total-row">
              <span class="total-label">POTENCIA ESTIMADA:</span>
              <span
                v-if="move.category.toLowerCase() !== 'status' && move.basePower > 0"
                class="total-value"
              >
                {{ move.basePower }} x {{ stabMultiplier }} x {{ effectiveness }} = <strong class="total-result">{{ estimatedPower }}</strong>
              </span>
              <span
                v-else
                class="total-value status-only"
              >
                Efecto de Estado (N/A)
              </span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="tooltip-desc-section">
          <p class="desc-text">
            {{ moveDesc }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.move-tooltip-container {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  right: 0;
  z-index: 150;
  display: flex;
  justify-content: center;
  pointer-events: none; // Evita interferir con los clics en el juego
}

.move-tooltip-card {
  width: 95%;
  max-width: 440px;
  background: linear-gradient(135deg, Rgba(10, 12, 22, 0.95) 0%, Rgba(20, 24, 45, 0.98) 100%);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 -10px 30px Rgba(0, 0, 0, 0.8), 
              0 0 0 1px Rgba(10, 132, 255, 0.2), 
              inset 0 1px 1px Rgba(255, 255, 255, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  pointer-events: auto; // Reactiva clics locales si se necesitan en el futuro
  backdrop-filter: Blur(8px);
}

// Header Section
.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;

  .header-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .move-title {
    font-family: var(--font-pixel);
    font-size: 13px;
    color: var(--yellow, #ffd60a);
    text-shadow: 1px 1px 2px Rgba(0, 0, 0, 0.8);
    letter-spacing: 0.5px;
  }

  .badges-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .type-badge {
    font-family: var(--font-pixel);
    font-size: 7px;
    text-transform: uppercase;
    padding: 3px 6px;
    border-radius: 4px;
    color: white;
    text-shadow: 1px 1px 0px Rgba(0, 0, 0, 0.5);
    border: 1px solid Rgba(255, 255, 255, 0.1);
    
    // Clases específicas de tipo
    &.badge-normal { background: #a8a77a; }
    &.badge-fire { background: #ee8130; }
    &.badge-water { background: #6390f0; }
    &.badge-electric { background: #f7d02c; color: #333; text-shadow: none; }
    &.badge-grass { background: #7ac74c; }
    &.badge-ice { background: #96d9d6; color: #333; text-shadow: none; }
    &.badge-fighting { background: #c22e28; }
    &.badge-poison { background: #a33ea1; }
    &.badge-ground { background: #e2bf65; }
    &.badge-flying { background: #a98ff3; }
    &.badge-psychic { background: #f95587; }
    &.badge-bug { background: #a6b91a; }
    &.badge-rock { background: #b6a136; }
    &.badge-ghost { background: #705746; }
    &.badge-dragon { background: #6f35fc; }
    &.badge-dark { background: #705746; }
    &.badge-steel { background: #b7b7ce; color: #333; text-shadow: none; }
    &.badge-fairy { background: #d685ad; }
  }

  .cat-badge {
    font-family: var(--font-pixel);
    font-size: 7px;
    text-transform: uppercase;
    padding: 3px 6px;
    border-radius: 4px;
    color: white;
    text-shadow: 1px 1px 0px Rgba(0,0,0,0.5);
    border: 1px solid Rgba(255, 255, 255, 0.1);

    &.cat-physical { background: #c22e28; }
    &.cat-special { background: #6390f0; }
    &.cat-status { background: #7ac74c; }
  }

  .move-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    font-family: var(--font-pixel);
    font-size: 7px;
    color: #86868b;

    .stat-label {
      margin-right: 3px;
    }

    .stat-value {
      color: #fff;
    }
  }
}

// Math Section
.tooltip-math-section {
  background: Rgba(0, 0, 0, 0.35);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px;

  .section-title {
    font-family: var(--font-pixel);
    font-size: 8px;
    color: #86868b;
    margin: 0 0 8px 0;
    letter-spacing: 0.5px;
  }

  .math-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .math-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-pixel);
    font-size: 7px;
    color: #aeaebe;
    
    .math-label {
      text-transform: uppercase;
    }

    .math-value {
      color: #fff;

      &.highlight {
        color: var(--yellow, #ffd60a);
        font-size: 8px;
      }

      &.stab-active {
        color: #32d74b;
        text-shadow: 0 0 4px Rgba(50, 215, 75, 0.3);
      }

      &.eff-immune {
        color: #ff453a;
        font-weight: bold;
      }
      &.eff-resisted {
        color: #ff9f0a;
      }
      &.eff-super {
        color: #32d74b;
        font-weight: bold;
        text-shadow: 0 0 4px Rgba(50, 215, 75, 0.3);
      }
      &.eff-neutral {
        color: #fff;
      }
    }
  }

  .math-total-row {
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: var(--font-pixel);

    .total-label {
      font-size: 7px;
      color: #86868b;
      letter-spacing: 0.5px;
    }

    .total-value {
      font-size: 7px;
      color: #aeaebe;
      
      .total-result {
        font-size: 11px;
        color: var(--yellow, #ffd60a);
        text-shadow: 0 0 6px Rgba(255, 214, 10, 0.4);
      }

      &.status-only {
        color: #86868b;
        font-style: italic;
      }
    }
  }
}

// Description Section
.tooltip-desc-section {
  font-family: var(--font-ui, 'Nunito', sans-serif);
  font-size: 12px;
  line-height: 1.4;
  color: #c7c7cc;
  background: Rgba(255, 255, 255, 0.02);
  border-left: 3px solid var(--blue, #0a84ff);
  padding: 6px 10px;
  border-radius: 0 6px 6px 0;

  .desc-text {
    margin: 0;
  }
}
</style>
