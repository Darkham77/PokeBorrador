<script setup lang="ts">
/**
 * src/components/map/POIDetailDrawer.vue
 *
 * RETRACTABLE DETAIL DRAWER FOR SELECTED REGIONAL POI
 *
 * Displays:
 *   - Settlement name, type badge, elevation cota, grid & pixel coordinates.
 *   - Urban architecture layout: buildings, doors, plaza pavement.
 *   - Incident routes with connection destinations and distances.
 */

import { ref, computed } from 'vue';
import { gsap } from 'gsap';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import type { RouteEdge } from '../../types/map/poiTypes.ts';
import RegionalLocalMapModal from './RegionalLocalMapModal.vue';

const store = useRegionalContinentStudioStore();
const showLocalMapModal = ref(false);

const currentPoi = computed(() => store.selectedPOI);

// Incident routes connected to this POI
const incidentRoutes = computed<readonly RouteEdge[]>(() => {
  if (!currentPoi.value) return [];
  const id = currentPoi.value.id;
  return store.routes.filter((r) => r.fromNodeId === id || r.toNodeId === id);
});

function getDestinationName(edge: RouteEdge): string {
  if (!currentPoi.value) return '';
  const targetId = edge.fromNodeId === currentPoi.value.id ? edge.toNodeId : edge.fromNodeId;
  const target = store.pois.find((p) => p.id === targetId);
  return target?.name ?? targetId;
}

function closeDrawer(): void {
  store.selectPOI(null);
}

const DRAWER_SLIDE_DURATION_SEC = 0.25;
const DRAWER_SLIDE_OFFSET_X = 20;

function beforeDrawerEnter(el: Element): void {
  gsap.set(el, { opacity: 0, x: DRAWER_SLIDE_OFFSET_X });
}

function onDrawerEnter(el: Element, done: () => void): void {
  gsap.to(el, {
    opacity: 1,
    x: 0,
    duration: DRAWER_SLIDE_DURATION_SEC,
    ease: 'power3.out',
    onComplete: done
  });
}

function onDrawerLeave(el: Element, done: () => void): void {
  gsap.to(el, {
    opacity: 0,
    x: DRAWER_SLIDE_OFFSET_X,
    duration: DRAWER_SLIDE_DURATION_SEC,
    ease: 'power2.in',
    onComplete: done
  });
}
</script>

<template>
  <Transition
    :css="false"
    @before-enter="beforeDrawerEnter"
    @enter="onDrawerEnter"
    @leave="onDrawerLeave"
  >
    <aside
      v-if="currentPoi"
      class="poi-detail-drawer"
    >
      <header class="drawer-header">
        <div class="poi-title-block">
          <div
            class="poi-type-tag"
            :class="currentPoi.type"
          >
            {{ currentPoi.type }}
          </div>
          <h3 class="poi-name">
            {{ currentPoi.name }}
          </h3>
        </div>
        <button
          id="poidetail-drawer-btn-closedrawer"
          type="button"
          class="close-btn"
          title="Cerrar detalle"
          @click="closeDrawer"
        >
          <span class="emoji-inline">✕</span>
        </button>
      </header>

      <div class="drawer-body">
        <!-- Geographical Location -->
        <section class="drawer-section">
          <h4 class="section-title">
            Ubicación Geográfica
          </h4>
          <div class="meta-grid">
            <div class="meta-item">
              <span class="lbl">Coordenadas Grid</span>
              <span class="val">({{ currentPoi.gridX }}, {{ currentPoi.gridY }})</span>
            </div>
            <div class="meta-item">
              <span class="lbl">Elevación (Cota)</span>
              <span class="val">Z = {{ currentPoi.elevation }}</span>
            </div>
            <div class="meta-item">
              <span class="lbl">Huella Urbana</span>
              <span class="val">{{ currentPoi.footprint.width }} × {{ currentPoi.footprint.height }} tiles</span>
            </div>
            <div class="meta-item">
              <span class="lbl">Preferencia Terreno</span>
              <span class="val">{{ currentPoi.terrainPreference }}</span>
            </div>
          </div>
        </section>

        <!-- Urban Architecture (Buildings & Layout) -->
        <section
          v-if="currentPoi.urbanLayout"
          class="drawer-section"
        >
          <h4 class="section-title">
            Distribución Urbanística
          </h4>
          <div class="urban-summary">
            <div class="stat-bubble">
              <span class="b-count">{{ currentPoi.urbanLayout.buildings.length }}</span>
              <span class="b-label">Edificios</span>
            </div>
            <div class="stat-bubble">
              <span class="b-count">{{ currentPoi.urbanLayout.internalStreets.length }}</span>
              <span class="b-label">Calles Internas</span>
            </div>
            <div class="stat-bubble">
              <span class="b-count">{{ currentPoi.urbanLayout.props.length }}</span>
              <span class="b-label">Atrezzo</span>
            </div>
          </div>

          <!-- Buildings List -->
          <ul class="buildings-list">
            <li
              v-for="b in currentPoi.urbanLayout.buildings"
              :key="b.id"
              class="building-item"
            >
              <span class="b-icon">
                {{ b.type === 'pokecenter' ? '🏥' : b.type === 'pokemart' ? '🛒' : b.type === 'gym' ? '🏛️' : '🏠' }}
              </span>
              <div class="b-meta">
                <span class="b-type">{{ b.type }}</span>
                <span class="b-door">Acceso: ({{ b.doorX }}, {{ b.doorY }})</span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Incident Route Network Connections -->
        <section class="drawer-section">
          <h4 class="section-title">
            Rutas de Conexión ({{ incidentRoutes.length }})
          </h4>
          <ul class="routes-list">
            <li
              v-for="edge in incidentRoutes"
              id="poidetail-drawer-li-store-selectroute"
              :key="edge.id"
              class="route-item"
              :class="{ 'is-selected': store.selectedRouteId === edge.id }"
              @click="store.selectRoute(edge.id)"
            >
              <div class="route-lead">
                <span
                  class="route-bullet"
                  :class="edge.routeType"
                />
                <span class="dest-name"><span class="icon">→</span> {{ getDestinationName(edge) }}</span>
              </div>
              <div class="route-meta">
                <span class="route-type-badge">{{ edge.routeType }}</span>
                <span class="route-dist">{{ edge.distance }} tiles</span>
              </div>
            </li>
          </ul>
        </section>

        <!-- Local Map Inspector Action -->
        <section class="drawer-section">
          <button
            id="poidetail-drawer-btn-ver-croquis-local"
            type="button"
            class="view-local-map-btn"
            @click="showLocalMapModal = true"
          >
            <span class="icon">🔍</span> Ver Croquis Local
          </button>
        </section>
      </div>

      <RegionalLocalMapModal
        v-if="showLocalMapModal && currentPoi"
        :poi="currentPoi"
        :regional-seed="store.seed"
        @close="showLocalMapModal = false"
      />
    </aside>
  </Transition>
</template>

<style scoped lang="scss">
.poi-detail-drawer {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 16px;
  z-index: calc(var(--z-map-ui) + 5);
  display: flex;
  flex-direction: column;
  width: 340px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-xl;
  background: Rgb(15 23 42 / 95%);
  color: var(--slate-50);
  backdrop-filter: Blur(14px);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid Rgb(255 255 255 / 10%);

  .poi-title-block {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .poi-type-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: $radius-sm;
      font-size: var(--font-10);
      font-weight: 700;
      align-self: flex-start;
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.metropolis {
        background: Rgb(245 158 11 / 20%);
        color: var(--amber);
      }
      &.city {
        background: Rgb(239 68 68 / 20%);
        color: var(--rose);
      }
      &.town {
        background: Rgb(59 130 246 / 20%);
        color: var(--blue-400);
      }
      &.cave_entrance {
        background: Rgb(139 92 246 / 20%);
        color: var(--purple-400);
      }
      &.port_dock {
        background: Rgb(6 182 212 / 20%);
        color: var(--cyan);
      }
      &.route_gate {
        background: Rgb(100 116 139 / 20%);
        color: var(--slate-400);
      }
      &.dungeon_forest {
        background: Rgb(16 185 129 / 20%);
        color: var(--emerald-400);
      }
      &.water_landmark {
        background: Rgb(99 102 241 / 20%);
        color: var(--blue-400);
      }
    }

    .poi-name {
      margin: 0;
      color: var(--white);
      font-size: var(--font-18);
      font-weight: 700;
    }
  }

  .close-btn {
    padding: 4px;
    border: none;
    border-radius: $radius-sm;
    background: transparent;
    color: var(--slate-400);
    font-size: var(--font-18);
    cursor: pointer;

    &:hover {
      background: Rgb(255 255 255 / 10%);
      color: var(--white);
    }
  }
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  .section-title {
    margin: 0;
    color: var(--slate-400);
    font-size: var(--font-12);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.meta-grid {
  display: grid;
  gap: $spacing-sm;
  grid-template-columns: 1fr 1fr;

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: $spacing-2xs;
    padding: 8px;
    border-radius: $radius-md;
    background: Rgb(0 0 0 / 30%);

    .lbl {
      color: var(--slate-400);
      font-size: var(--font-10);
    }
    .val {
      color: var(--sky);
      font-family: monospace;
      font-size: var(--font-14);
      font-weight: 600;
    }
  }
}

.urban-summary {
  display: grid;
  gap: $spacing-sm-alt;
  grid-template-columns: repeat(3, 1fr);

  .stat-bubble {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 4px;
    border-radius: $radius-md;
    background: Rgb(0 0 0 / 30%);

    .b-count {
      color: var(--sky);
      font-family: monospace;
      font-size: var(--font-18);
      font-weight: 700;
    }
    .b-label {
      color: var(--slate-400);
      font-size: var(--font-10);
    }
  }
}

.buildings-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  margin: 0;
  padding: 0;
  list-style: none;

  .building-item {
    display: flex;
    align-items: center;
    gap: $spacing-md-alt;
    padding: 6px 10px;
    border-radius: $radius-md;
    background: Rgb(0 0 0 / 20%);

    .b-icon {
      font-size: var(--font-18);
    }

    .b-meta {
      display: flex;
      flex-direction: column;

      .b-type {
        color: var(--slate-100);
        font-size: var(--font-13);
        font-weight: 600;
        text-transform: capitalize;
      }
      .b-door {
        color: var(--slate-400);
        font-family: monospace;
        font-size: var(--font-11);
      }
    }
  }
}

.routes-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  margin: 0;
  padding: 0;
  list-style: none;

  .route-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: $radius-md;
    background: Rgb(0 0 0 / 20%);
    cursor: pointer;

    &:hover,
    &.is-selected {
      background: Rgb(2 132 199 / 15%);
      border-color: var(--sky-dark);
    }

    .route-lead {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .route-bullet {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.road {
          background: #f1c40f;
        }
        &.mountain_pass {
          background: #b08968;
        }
        &.water_crossing {
          background: #00d2d3;
        }
        &.forest_path {
          background: var(--emerald);
        }
      }

      .dest-name {
        font-size: var(--font-13);
        font-weight: 600;
      }
    }

    .route-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .route-type-badge {
        color: var(--slate-400);
        font-size: var(--font-10);
      }
      .route-dist {
        color: var(--sky);
        font-family: monospace;
        font-size: var(--font-12);
      }
    }
  }
}
</style>
