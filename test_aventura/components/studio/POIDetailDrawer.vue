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

import { computed } from 'vue';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import type { RouteEdge } from '../../types/map/poiTypes.ts';

const store = useRegionalContinentStudioStore();

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
</script>

<template>
  <transition name="drawer-slide">
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
      </div>
    </aside>
  </transition>
</template>

<style scoped lang="scss">
.poi-detail-drawer {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 16px;
  width: 340px;
  background: Rgba(15, 23, 42, 0.95);
  backdrop-filter: Blur(14px);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 10px 25px Rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  color: #f8fafc;
  z-index: 25;
  overflow: hidden;
}

.drawer-header {
  padding: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

  .poi-title-block {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .poi-type-tag {
      display: inline-block;
      align-self: flex-start;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;

      &.metropolis {
        background: Rgba(245, 158, 11, 0.2);
        color: #fbbf24;
      }
      &.city {
        background: Rgba(239, 68, 68, 0.2);
        color: #f87171;
      }
      &.town {
        background: Rgba(59, 130, 246, 0.2);
        color: #60a5fa;
      }
      &.cave_entrance {
        background: Rgba(139, 92, 246, 0.2);
        color: #a78bfa;
      }
      &.port_dock {
        background: Rgba(6, 182, 212, 0.2);
        color: #22d3ee;
      }
      &.route_gate {
        background: Rgba(100, 116, 139, 0.2);
        color: #94a3b8;
      }
      &.dungeon_forest {
        background: Rgba(16, 185, 129, 0.2);
        color: #34d399;
      }
      &.water_landmark {
        background: Rgba(99, 102, 241, 0.2);
        color: #818cf8;
      }
    }

    .poi-name {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
    }
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 1.1rem;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.2s ease, background 0.2s ease;

    &:hover {
      color: #ffffff;
      background: Rgba(255, 255, 255, 0.1);
    }
  }
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .section-title {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #94a3b8;
    letter-spacing: 0.05em;
  }
}

.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  .meta-item {
    background: Rgba(0, 0, 0, 0.3);
    padding: 8px;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;

    .lbl {
      font-size: 0.65rem;
      color: #94a3b8;
    }
    .val {
      font-size: 0.85rem;
      font-weight: 600;
      color: #38bdf8;
      font-family: monospace;
    }
  }
}

.urban-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;

  .stat-bubble {
    background: Rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    padding: 8px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;

    .b-count {
      font-size: 1.1rem;
      font-weight: 700;
      color: #38bdf8;
      font-family: monospace;
    }
    .b-label {
      font-size: 0.65rem;
      color: #94a3b8;
    }
  }
}

.buildings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .building-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: Rgba(0, 0, 0, 0.2);
    padding: 6px 10px;
    border-radius: 6px;

    .b-icon {
      font-size: 1.1rem;
    }

    .b-meta {
      display: flex;
      flex-direction: column;

      .b-type {
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: capitalize;
        color: #f1f5f9;
      }
      .b-door {
        font-size: 0.7rem;
        color: #94a3b8;
        font-family: monospace;
      }
    }
  }
}

.routes-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .route-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: Rgba(0, 0, 0, 0.2);
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
    border: 1px solid transparent;

    &:hover,
    &.is-selected {
      background: Rgba(2, 132, 199, 0.15);
      border-color: #0284c7;
    }

    .route-lead {
      display: flex;
      align-items: center;
      gap: 8px;

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
          background: #2ecc71;
        }
      }

      .dest-name {
        font-size: 0.8rem;
        font-weight: 600;
      }
    }

    .route-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .route-type-badge {
        font-size: 0.65rem;
        color: #94a3b8;
      }
      .route-dist {
        font-size: 0.75rem;
        font-family: monospace;
        color: #38bdf8;
      }
    }
  }
}

// Transitions
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: Translatex(20px);
  opacity: 0;
}
</style>
