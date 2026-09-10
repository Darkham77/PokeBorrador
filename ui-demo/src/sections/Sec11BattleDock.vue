<script setup lang="ts">
import { ref } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ItemId } from '@/data/inventory/itemIds'
import type { PokemonType } from '@/data/battle/types'

interface DockPokemon {
  uid: string
  id: number
  name: string
  level: number
  gender: 'm' | 'f'
  tier: string
  tierColor: string
  passive: string
  iv: number
  heldItem?: ItemId
  isFavorite?: boolean
  isShiny?: boolean
  types: { id: string; label: string }[]
  hpPercent: number
}

const activeIndex = ref(0) // Gengar active

const teamMembers: DockPokemon[] = [
  {
    uid: 'dock-gengar',
    id: 94,
    name: 'GENGAR',
    level: 60,
    gender: 'f',
    tier: 'A',
    tierColor: '#a855f7',
    passive: '🌱',
    iv: 31,
    heldItem: 'focussash',
    isFavorite: true,
    isShiny: true,
    types: [
      { id: 'ghost', label: 'FANTASMA' },
      { id: 'poison', label: 'VENENO' }
    ],
    hpPercent: 100
  },
  {
    uid: 'dock-dragonite',
    id: 149,
    name: 'DRAGONITE',
    level: 85,
    gender: 'm',
    tier: 'C',
    tierColor: '#22c55e',
    passive: '🌱',
    iv: 31,
    heldItem: 'leftovers',
    isFavorite: true,
    types: [
      { id: 'dragon', label: 'DRAGÓN' },
      { id: 'flying', label: 'VOLADOR' }
    ],
    hpPercent: 100
  },
  {
    uid: 'dock-nidorino',
    id: 33,
    name: 'NIDORINO',
    level: 52,
    gender: 'm',
    tier: 'B',
    tierColor: '#3b82f6',
    passive: '🌱',
    iv: 31,
    heldItem: 'poisonbarb',
    isFavorite: true,
    types: [{ id: 'poison', label: 'VENENO' }],
    hpPercent: 100
  },
  {
    uid: 'dock-wartortle',
    id: 8,
    name: 'WARTORTLE',
    level: 35,
    gender: 'm',
    tier: 'D',
    tierColor: '#f59e0b',
    passive: '🌱',
    iv: 28,
    types: [{ id: 'water', label: 'AGUA' }],
    hpPercent: 90
  },
  {
    uid: 'dock-dratini',
    id: 147,
    name: 'DRATINI',
    level: 26,
    gender: 'f',
    tier: 'A',
    tierColor: '#a855f7',
    passive: '🌱',
    iv: 31,
    types: [{ id: 'dragon', label: 'DRAGÓN' }],
    hpPercent: 100
  },
  {
    uid: 'dock-ninetales',
    id: 38,
    name: 'NINETALES',
    level: 44,
    gender: 'f',
    tier: 'A',
    tierColor: '#a855f7',
    passive: '🔥',
    iv: 31,
    heldItem: 'charcoal',
    types: [{ id: 'fire', label: 'FUEGO' }],
    hpPercent: 100
  }
]

interface DockMove {
  id: string
  name: string
  typeId: PokemonType
  typeLabel: string
  pot: string
  potBuff?: boolean
  prec: string
  cat: string
  catIcon: string
  ppCur: number
  ppMax: number
}

const moves: DockMove[] = [
  {
    id: 'shadowpunch',
    name: 'PUÑO SOMBRA',
    typeId: 'ghost',
    typeLabel: 'FANTASMA',
    pot: '90',
    potBuff: true,
    prec: '~',
    cat: 'Físico',
    catIcon: '⚔',
    ppCur: 20,
    ppMax: 32
  },
  {
    id: 'confuseray',
    name: 'RAYO CONFUSO',
    typeId: 'ghost',
    typeLabel: 'FANTASMA',
    pot: '-',
    prec: '100',
    cat: 'Estado',
    catIcon: '🌀',
    ppCur: 10,
    ppMax: 16
  },
  {
    id: 'hypnosis',
    name: 'HIPNOSIS',
    typeId: 'psychic',
    typeLabel: 'PSÍQUICO',
    pot: '-',
    prec: '60',
    cat: 'Estado',
    catIcon: '🌀',
    ppCur: 20,
    ppMax: 32
  },
  {
    id: 'meanlook',
    name: 'MAL DE OJO',
    typeId: 'normal',
    typeLabel: 'NORMAL',
    pot: '-',
    prec: '--',
    cat: 'Estado',
    catIcon: '🌀',
    ppCur: 5,
    ppMax: 8
  }
]

interface QuickBagItem {
  id: ItemId
  name: string
  qty: number
}

const quickBagItems: QuickBagItem[] = [
  { id: 'maxpotion', name: 'Poción Máxima', qty: 3 },
  { id: 'hyperpotion', name: 'Hiperpoción', qty: 3 },
  { id: 'superpotion', name: 'Superpoción', qty: 2 },
  { id: 'potion', name: 'Poción', qty: 7 },
  { id: 'fullrestore', name: 'Restaurar Todo', qty: 3 },
  { id: 'revive', name: 'Revivir', qty: 3 },
  { id: 'revivemax', name: 'Max Revivir', qty: 2 },
  { id: 'antidote', name: 'Antídoto', qty: 2 }
]
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">⚔️</span>
      <span>11. Barra Inferior de Combate (BattleArenaControls, QuickTeam & QuickBag Canónicos 1:1)</span>
    </h2>

    <div class="pv-panel-wrap has-cast-shadow">
      <div class="pv-curve-xl battle-dock-container">
        <div class="dock-zone-intro">
          DOCK INFERIOR DE CONTROL DE COMBATE EN TIEMPO REAL (PARIDAD 1:1 CON src/components/battle/):
        </div>

        <div class="battle-dock-grid">
          <!-- ZONA 1: EQUIPO RÁPIDO (6 POKÉMON EN FILA HORIZONTAL CANÓNICA) -->
          <div class="dock-zone-team-wrapper">
            <div class="dock-team-row">
              <div
                v-for="(poke, idx) in teamMembers"
                :key="poke.uid"
                v-gsap-hover="'card'"
                class="pv-curve-md dock-pokemon-card"
                :class="{ 'is-active': activeIndex === idx }"
                :style="{ '--card-border-color': poke.tierColor }"
                @click="activeIndex = idx"
              >
                <!-- Píldora Vertical Izquierda (IV, Ítem, Estrella, Shiny) -->
                <div class="dock-vertical-pill">
                  <span class="dock-iv-tag">{{ poke.iv }}</span>
                  <img
                    v-if="poke.heldItem"
                    :src="getAssetUrl(ASSET_TYPES.ITEM, poke.heldItem)"
                    :alt="poke.heldItem"
                    class="dock-item-icon"
                  >
                  <span
                    v-if="poke.isFavorite"
                    class="dock-star-icon"
                  >⭐</span>
                  <span
                    v-if="poke.isShiny"
                    class="dock-shiny-icon"
                  >🧬</span>
                </div>

                <!-- Columna Superior Derecha: Tier y Pasiva -->
                <div class="dock-top-right-tags">
                  <span
                    class="dock-tier-tag"
                    :style="{ color: poke.tierColor, borderColor: poke.tierColor }"
                  >
                    {{ poke.tier }}
                  </span>
                  <span class="dock-passive-icon">{{ poke.passive }}</span>
                </div>

                <!-- Sprite del Pokémon Centrado -->
                <div class="dock-sprite-wrap">
                  <img
                    :src="getAssetUrl(ASSET_TYPES.POKEMON, poke.id, { isShiny: poke.isShiny })"
                    :alt="poke.name"
                    class="dock-poke-sprite"
                  >
                </div>

                <!-- Nombre del Pokémon -->
                <div class="dock-poke-name">
                  {{ poke.name }}
                </div>

                <!-- Tipos Elementales (Píldoras ssm) -->
                <div class="dock-types-row">
                  <span
                    v-for="t in poke.types"
                    :key="t.id"
                    class="pv-type-pill pv-type-ssm"
                    :class="`type-${t.id}`"
                  >
                    {{ t.label }}
                  </span>
                </div>

                <!-- Nivel y Género -->
                <div class="dock-level-gender-row">
                  <span class="dock-poke-lvl">Nv. {{ poke.level }}</span>
                  <span
                    class="dock-gender-icon"
                    :class="poke.gender === 'm' ? 'gender-male' : 'gender-female'"
                  >
                    {{ poke.gender === 'm' ? '♂' : '♀' }}
                  </span>
                </div>

                <!-- Barra de HP en el borde inferior -->
                <div class="dock-card-hp-bar">
                  <div
                    class="dock-card-hp-fill"
                    :style="{ width: `${poke.hpPercent}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ZONA 2: MOVIMIENTOS & ACCIONES (2x2 MOVES + BARRA ACCIÓN) -->
          <div class="dock-center-zone">
            <!-- Grid 2x2 de Movimientos -->
            <div class="dock-moves-2x2">
              <div
                v-for="m in moves"
                :key="m.id"
                v-gsap-hover="'card'"
                class="pv-curve-sm dock-move-card"
              >
                <!-- Línea Superior: ?, Nombre, Píldora Tipo, ? -->
                <div class="dock-move-header">
                  <button
                    type="button"
                    class="dock-move-help-btn"
                    title="Información del ataque"
                  >
                    ?
                  </button>
                  <span class="dock-move-name">{{ m.name }}</span>
                  <span
                    class="pv-type-pill pv-type-sm"
                    :class="`type-${m.typeId}`"
                  >
                    {{ m.typeLabel }}
                  </span>
                  <button
                    type="button"
                    class="dock-move-help-btn"
                    title="Información del ataque"
                  >
                    ?
                  </button>
                </div>

                <!-- Línea Inferior: POT, PREC, CAT, PP -->
                <div class="dock-move-stats">
                  <div class="dock-stat-item">
                    <span class="stat-lbl">POT:</span>
                    <span
                      class="stat-val"
                      :class="{ 'stat-buff': m.potBuff }"
                    >
                      {{ m.pot }} {{ m.potBuff ? '▲' : '' }}
                    </span>
                  </div>
                  <div class="dock-stat-item">
                    <span class="stat-lbl">PREC:</span>
                    <span class="stat-val">{{ m.prec }}</span>
                  </div>
                  <div class="dock-stat-item">
                    <span class="stat-lbl">CAT:</span>
                    <span class="stat-val">{{ m.catIcon }} {{ m.cat }}</span>
                  </div>
                  <div class="dock-stat-item dock-move-pp">
                    <span class="stat-lbl">PP</span>
                    <span class="stat-val pp-val">{{ m.ppCur }}/{{ m.ppMax }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fila Inferior de Acciones: Cambiar, Poké Ball, Mochila -->
            <div class="dock-actions-row">
              <button
                id="btn-battle-cambiar"
                v-gsap-hover="'button'"
                type="button"
                class="pv-curve-sm pv-btn dock-btn-cambiar"
              >
                <span class="emoji">⚔️</span>
                <span>CAMBIAR</span>
              </button>

              <button
                id="btn-battle-pokeball"
                v-gsap-hover="'button'"
                type="button"
                class="pv-curve-md dock-center-pokeball"
                title="Acción Central Poké Ball"
              >
                <div class="pokeball-top" />
                <div class="pokeball-center-line" />
                <div class="pokeball-button" />
                <div class="pokeball-bottom" />
              </button>

              <button
                id="btn-battle-mochila"
                v-gsap-hover="'button'"
                type="button"
                class="pv-curve-sm pv-btn dock-btn-mochila"
              >
                <span class="emoji">🎒</span>
                <span>MOCHILA</span>
              </button>
            </div>
          </div>

          <!-- ZONA 3: MOCHILA RÁPIDA (8 RANURAS EN 4 COLS X 2 ROWS) -->
          <div class="dock-quickbag-zone">
            <div class="dock-quickbag-grid">
              <div
                v-for="item in quickBagItems"
                :key="item.id"
                v-gsap-hover="'pill'"
                class="pv-curve-xs dock-quickbag-slot"
                :title="item.name"
              >
                <img
                  :src="getAssetUrl(ASSET_TYPES.ITEM, item.id)"
                  :alt="item.name"
                  class="quickbag-item-img"
                >
                <span class="quickbag-qty-tag">x{{ item.qty }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}

.dock-zone-intro {
  font-size: 7.5px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}
</style>
