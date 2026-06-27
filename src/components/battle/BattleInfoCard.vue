<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import HPBar from './HPBar.vue'
import { useBattleStore } from '@/stores/battle/battle'
import { useProfileStore } from '@/stores/player/profile'
import { supabase } from '@/logic/db/supabase'
import { getStatBreakdown } from '@/logic/battle/battleEngine'
import { useCombatantStatus } from '@/composables/battle/useCombatantStatus'

import type { Pokemon } from '@/types/pokemon/pokemon'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { NATURE_DATA } from '@/data/battle/natures'

const getNatureData = (nat: string | undefined) => {
  if (!nat) return NATURE_DATA['serious']
  const key = nat.toLowerCase()
  return NATURE_DATA[key as keyof typeof NATURE_DATA] || Object.values(NATURE_DATA).find(n => n.name.toLowerCase() === key)
}

interface Props {
  pokemon?: Pokemon | null
  isPlayer?: boolean
  isScrambled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  isPlayer: false,
  isScrambled: false
})

const p = computed(() => props.pokemon as Pokemon)
const battleStore = useBattleStore()
const profileStore = useProfileStore()
import { useGameStore } from '@/stores/game'
const gameStore = useGameStore()

const ivTotal = computed(() => {
  if (!p.value || !p.value.ivs) return 0
  return (p.value.ivs.hp || 0) + (p.value.ivs.atk || 0) + (p.value.ivs.def || 0) + (p.value.ivs.spa || 0) + (p.value.ivs.spd || 0) + (p.value.ivs.spe || 0)
})

const pokemonTierInfo = computed(() => {
  if (!p.value) return null
  return getPokemonTier(p.value)
})

const isIvScannerActive = computed(() => {
  return (gameStore.state.ivScannerSecs || 0) > 0
})

const isAdmin = computed(() => {
  const win = window as unknown as { __ADMIN_DEBUG__: boolean }
  return profileStore.profileData.isAdmin || (typeof window !== 'undefined' && win.__ADMIN_DEBUG__) || supabase.isLocal
})

const showStatsTable = computed(() => {
  return props.isPlayer || isIvScannerActive.value || isAdmin.value
})

const cardRef = ref<HTMLElement | null>(null)

// --- GESTIÓN DE XP Y LEVEL UP (Phase 3) ---
const isLevelingUp = ref(false)

watch(() => p.value.level, (newLevel, oldLevel) => {
  if (oldLevel && newLevel > oldLevel) {
    // 1. Efecto de Destello (Flash) con GSAP
    if (cardRef.value) {
      gsap.fromTo(cardRef.value, 
        { filter: 'Brightness(1) contrast(1)', scale: 1 },
        { 
          filter: 'Brightness(2) contrast(1.2)', 
          scale: 1.05, 
          duration: 0.15, 
          yoyo: true, 
          repeat: 3, 
          ease: 'power2.inOut',
          onComplete: () => {
            gsap.set(cardRef.value, { clearProps: 'filter,scale' })
            isLevelingUp.value = false
          }
        }
      )
    }
    isLevelingUp.value = true
  }
}, { immediate: false })

const getGenderText = (g: string) => (({ M: '♂', F: '♀' } as Record<string, string>)[g] || '')
const getGenderCls = (g: string) => (({ M: 'gender-male', F: 'gender-female' } as Record<string, string>)[g] || 'gender-none')

// Hook de orquestación de estados y etapas de combate
const { unifiedStatuses, volatileStatuses } = useCombatantStatus(p, battleStore, computed(() => props.isPlayer))

defineExpose({
  unifiedStatuses,
  volatileStatuses
})

const adminStatConfig = [
  { key: 'atk', label: 'ATK', icon: '⚔️' },
  { key: 'def', label: 'DEF', icon: '🛡️' },
  { key: 'spa', label: 'SPA', icon: '🔮' },
  { key: 'spd', label: 'SPD', icon: '✨' },
  { key: 'spe', label: 'SPE', icon: '⚡' }
]

const getStatModifier = (key: string) => {
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  if (!stages) return 0
  return (stages as Record<string, number>)[key] || 0
}

const getBreakdown = (key: string) => {
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  const weather = battleStore.state?.weather
  return getStatBreakdown(p.value, key as 'atk' | 'def' | 'spa' | 'spd' | 'spe', stages, weather || null)
}

const showTeamBalls = computed(() => {
  // En la presentación del entrenador (FIRST_INTRO) se muestra la fila de Pokéballs disponibles.
  return battleStore.state?.isTrainer || battleStore.state?.isGym || battleStore.state?.isPvP
})

const teamBallsStatus = computed(() => {
  if (!battleStore.state) return []
  const team = props.isPlayer 
    ? (battleStore.state.playerTeam || []) 
    : (battleStore.state.enemyTeam || [])
  
  const statuses: ('active' | 'fainted' | 'empty')[] = []
  for (let i = 0; i < 6; i++) {
    if (i < team.length) {
      const poke = team[i]
      if (poke && poke.hp > 0) {
        statuses.push('active')
      } else {
        statuses.push('fainted')
      }
    } else {
      statuses.push('empty')
    }
  }
  return statuses
})
</script>

<template>
  <div 
    ref="cardRef"
    class="glass-card battle-info-card" 
    :class="[
      isPlayer ? 'player-card' : 'enemy-card', 
      { 
        'is-admin-view': isAdmin,
        'is-leveling-up': isLevelingUp
      }
    ]"
  >
    <div class="card-content-wrapper">
      <div class="card-header">
        <span 
          class="poke-name"
        >
          {{ isScrambled ? '???' : (p.name === 'Nidoran-M' || p.name === 'Nidoran-F' ? 'Nidoran' : p.name) }}
        </span>
        <div
          v-if="p.gender && !isScrambled && !p.name.includes(getGenderText(p.gender))"
          class="m-badge-gender"
          :class="getGenderCls(p.gender)"
        >
          {{ getGenderText(p.gender) }}
        </div>
        <img
          v-if="!isPlayer && p.caught"
          :src="getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')"
          class="caught-icon"
          @error="e => (e.target as HTMLImageElement).style.display = 'none'"
        >
      </div>
        
      <div class="level-row">
        <div class="poke-level m-badge-level">
          Nv. {{ isScrambled ? '??' : p.level }}
        </div>
        <PVTooltip
          v-if="!isPlayer && !isScrambled && gameStore.state.playerClass === 'criador'"
          position="bottom"
          :title="getNatureData(p.nature)?.name.toUpperCase() || 'SERIA'"
        >
          <div class="m-badge-nature">
            {{ p.nature || 'Serio' }}
          </div>
          <template #content>
            <div class="nature-pro-tooltip">
              <div
                v-if="getNatureData(p.nature)?.up || getNatureData(p.nature)?.down"
                class="modifiers-row"
                style="display: flex; gap: 8px; margin: 4px 0;"
              >
                <span
                  v-if="getNatureData(p.nature)?.up"
                  class="stat-mod mod-up"
                  style="color: #32d74b; font-weight: bold; font-size: 7.5px;"
                >▲ {{ getNatureData(p.nature)?.up?.toUpperCase() }} (+10%)</span>
                <span
                  v-if="getNatureData(p.nature)?.down"
                  class="stat-mod mod-down"
                  style="color: #ff453a; font-weight: bold; font-size: 7.5px;"
                >▼ {{ getNatureData(p.nature)?.down?.toUpperCase() }} (-10%)</span>
              </div>
              <p style="margin: 4px 0 0 0; font-size: 8px; color: #aeaebe; line-height: 1.4;">
                {{ getNatureData(p.nature)?.desc || 'Sin efecto en estadísticas.' }}
              </p>
            </div>
          </template>
        </PVTooltip>
        <PokemonTypePills 
          v-if="!isScrambled"
          :pokemon="p" 
          :size="p.type2 ? 'ssm' : 'sm'"
          class="poke-types"
        />
      </div>

      <!-- Poké Balls Status Row for Trainers/NPCs/PvP -->
      <div
        v-if="showTeamBalls"
        class="team-balls-row"
      >
        <div 
          v-for="(status, idx) in teamBallsStatus" 
          :key="idx"
          class="ball-slot"
          :class="status"
        />
      </div>

      <HPBar
        :hp="p.hp"
        :max-hp="p.maxHp"
        :level="p.level"
        :exp="p.exp"
        :exp-needed="p.expNeeded"
        :is-player="isPlayer"
        :is-scrambled="isScrambled"
        :pokemon-uid="p.uid"
      />

      <!-- Contenedor de Estados Unificado -->
      <div 
        v-if="!isScrambled && unifiedStatuses.length > 0"
        class="status-container"
      >
        <PVTooltip
          v-for="status in unifiedStatuses"
          :key="status.id"
          :title="status.title"
          position="bottom"
        >
          <div
            class="m-status-tag"
            :class="[status.class, { 'is-boosted': status.isBoosted }]"
          >
            {{ status.emoji }}<span 
              v-if="status.stageValue !== undefined" 
              class="stage-arrow"
              :class="status.stageValue > 0 ? 'up' : 'down'"
            >{{ status.stageValue > 0 ? '▲' : '▼' }}{{ Math.abs(status.stageValue) }}</span>
            <span
              v-if="status.count"
              class="status-counter"
            >
              {{ status.count }}t
            </span>
          </div>

          <template #content>
            <div class="status-pro-tooltip">
              <div 
                v-if="status.isAdminOnly"
                class="admin-only-disclaimer"
              >
                ⚠️ esto es visible solo para administradores
              </div>
              <p class="status-desc-text">
                {{ status.description }}
              </p>
              
              <template v-if="showStatsTable">
                <div class="tooltip-divider" />
                
                <div class="stats-comparison-grid">
                  <div class="grid-header-row">
                    <span class="grid-header">STAT</span>
                    <span class="grid-header">BASE</span>
                    <span class="grid-header">MULT</span>
                    <span class="grid-header">REAL</span>
                  </div>
                  
                  <div 
                    v-for="statKey in ['atk', 'def', 'spa', 'spd', 'spe']" 
                    :key="statKey"
                    class="grid-stat-row"
                    :class="{
                      'is-up': getStatModifier(statKey) > 0 || getBreakdown(statKey).weatherMult > 1 || getBreakdown(statKey).abilityMult > 1,
                      'is-down': getStatModifier(statKey) < 0 || getBreakdown(statKey).statusMult < 1 || getBreakdown(statKey).weatherMult < 1
                    }"
                  >
                    <span class="stat-name-col">
                      {{ adminStatConfig.find(s => s.key === statKey)?.label }}
                    </span>
                    <span class="stat-val-col">{{ getBreakdown(statKey).base }}</span>
                    <span class="stat-mult-col">
                      x{{ (getBreakdown(statKey).stageMult * getBreakdown(statKey).weatherMult * getBreakdown(statKey).abilityMult * getBreakdown(statKey).statusMult).toFixed(2) }}
                    </span>
                    <span class="stat-final-col highlight-val">
                      {{ Math.round(getBreakdown(statKey).final) }}
                    </span>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </PVTooltip>
      </div>

      <!-- Escáner de IVs Activo (debajo de estados, solo para Pokémon salvaje rival) -->
      <div 
        v-if="isIvScannerActive && !isPlayer && !isScrambled && !battleStore.state?.isTrainer && !battleStore.state?.isGym && !battleStore.state?.isPvP"
        class="iv-scanner-radar-hud"
      >
        <div class="hud-main-info">
          <span class="hud-label">RADAR IV</span>
          <span class="hud-value">{{ ivTotal }}/186</span>
          <span 
            v-if="pokemonTierInfo" 
            class="hud-grade-badge" 
            :style="{ '--tier-color': pokemonTierInfo.color, '--tier-bg': pokemonTierInfo.bg }"
          >
            GRADO {{ pokemonTierInfo.tier }}
          </span>
        </div>
        <div
          v-if="p.ivs"
          class="hud-ivs-grid"
        >
          <span>HP:{{ p.ivs.hp }}</span>
          <span>ATK:{{ p.ivs.atk }}</span>
          <span>DEF:{{ p.ivs.def }}</span>
          <span>SPA:{{ p.ivs.spa }}</span>
          <span>SPD:{{ p.ivs.spd }}</span>
          <span>SPE:{{ p.ivs.spe }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-card {
  position: relative;
  background: transparent;
  @include gpu-layer;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 
    0 10px 30px Rgba(0,0,0,0.5), 
    inset 0 0 10px Rgba(255,255,255,0.05),
    inset 0 0 0 1px Rgba(255, 255, 255, 0.15);
  color: $white;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: calc(var(--z-base) - 1);
    background: Rgba(15, 23, 42, 0.85); /* Más opaco para compensar la falta de blur y mantener legibilidad */
    border-radius: 17px;
    pointer-events: none;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
  }

  @media (max-width: 600px) {
    padding: 8px 10px;
    min-width: 140px;
    border-radius: 12px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;

  @media (max-width: 600px) {
    gap: 4px;
    margin-bottom: 2px;
  }
}

.poke-name {
  @include pixelated;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;

  @media (max-width: 600px) {
    font-size: 8px;
  }
}

.poke-level {
  margin-bottom: 0;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;

  @media (max-width: 600px) {
    gap: 4px;
    margin-bottom: 4px;
  }
}

.is-leveling-up {
  will-change: filter, transform;
}

.m-badge-level {
  @include pixelated;
  font-size: 8px;
}

.m-badge-nature {
  background: Rgba(234, 179, 8, 0.15);
  border: 1px solid Rgba(234, 179, 8, 0.4);
  color: #fef08a;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 8px;
  @include pixelated;
  text-transform: uppercase;
}

.status-container {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 0;
  height: 20px;
  align-items: center;

  @media (max-width: 600px) {
    gap: 2px;
    margin-top: 0;
    height: 15px;
  }
}





.status-counter {
  margin-left: 3px;
  opacity: 0.9;
  font-size: 6px;
  font-weight: 400;
}

.gender-male { color: Rgba(59, 139, 255, 1); }
.gender-female { color: Rgba(255, 110, 255, 1); }

.admin-info-trigger {
  margin-left: auto;
  cursor: help;
}

.admin-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: Rgba(255, 214, 10, 0.2);
  border: 1px solid Rgba(255, 214, 10, 0.4);
  border-radius: 50%;
  font-size: 10px;
  color: #ffd60a;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  box-shadow: 0 0 10px Rgba(255, 214, 10, 0.2);
  

  &:hover {
    background: Rgba(255, 214, 10, 0.4);
    transform: Scale(1.2);
    box-shadow: 0 0 15px Rgba(255, 214, 10, 0.4);
  }
}

.admin-stat-debug {
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  background: none;
  border: none;
}

.debug-stat-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  @include pixelated;
  padding: 4px 6px;
  border-radius: 8px;
  background: #000000;
  

  &:hover {
    background: #1a1a1a;
  }

  .stat-main-line {
    display: flex;
    align-items: center;
    width: 100%;
    font-size: 10px;
  }

  .stat-breakdown-line {
    display: flex;
    align-items: center;
    font-size: 8px;
    opacity: 0.7;
    padding-left: 18px;
    color: Rgba(255, 255, 255, 0.5);
    
    .b-ops { 
      margin-left: auto; 
      color: $coin-gold;
      font-weight: bold;
    }
  }

  .d-icon { width: 18px; font-size: 12px; }
  .d-label { width: 40px; color: var(--gray); opacity: 0.8; }
  .d-val { font-weight: bold; margin-left: auto; color: white; font-size: 11px; }
  .d-mod { 
    margin-left: 8px;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 4px;
    background: Rgba(255, 255, 255, 0.1);
  }

  &.is-up {
    color: $green;
    .d-mod { background: Rgba(16, 185, 129, 0.2); }
  }
  &.is-down {
    color: $red;
    .d-mod { background: Rgba(239, 68, 68, 0.2); }
  }
}

.admin-notice {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed Rgba(255, 255, 0, 0.2);
  color: $yellow;
  font-size: 8px;
  @include pixelated;
  text-align: center;
  opacity: 0.8;
}

.caught-icon {
  width: 16px;
  height: 16px;
  @include sprite-render;

  @media (max-width: 600px) {
    width: 12px;
    height: 12px;
  }
}

.team-balls-row {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  margin-bottom: 4px;
  padding: 2px 0;
}

.ball-slot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid Rgba(0, 0, 0, 0.6);
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  background: #ffffff;
  
  &.active {
    box-shadow: 0 0 5px Rgba(255, 62, 62, 0.6);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 50%;
      background: #ff3e3e;
    }
  }
  
  &.fainted {
    background: #555555;
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      background: #ff0000;
      transform: Translatey(-50%) Rotate(45deg);
    }
  }
  
  &.empty {
    background: transparent;
    border: 1px dashed Rgba(255, 255, 255, 0.3);
  }
}

.iv-scanner-radar-hud {
  @include pixelated;
  font-size: 8px;
  color: #00ffcc;
  text-shadow: 1px 1px 0 #000;
  margin-top: 6px;
  padding: 4px 8px;
  background: Rgba(0, 255, 204, 0.05);
  border: 1px solid Rgba(0, 255, 204, 0.25);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: fit-content;
  line-height: 1;

  .hud-main-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .hud-ivs-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px 6px;
    font-size: 7px;
    color: #a7f3d0;
  }

  .hud-label {
    color: Rgba(255, 255, 255, 0.6);
    font-size: 7px;
    letter-spacing: 0.5px;
  }

  .hud-value {
    color: #ffffff;
    font-weight: bold;
  }

  .hud-grade-badge {
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--tier-bg);
    border: 1px solid var(--tier-color);
    color: var(--tier-color);
    text-shadow: none;
    font-weight: bold;
    box-shadow: 0 0 6px var(--tier-bg);
    display: inline-block;
  }
}

.status-pro-tooltip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 170px;
  max-width: 240px;
  padding: 2px 0;
  
  .status-desc-text {
    margin: 0;
    font-size: 8px;
    color: #aeaebe;
    line-height: 1.4;
  }

  .tooltip-divider {
    height: 1px;
    background: Rgba(255, 255, 255, 0.1);
    margin: 2px 0;
  }

  .stats-comparison-grid {
    display: flex;
    flex-direction: column;
    gap: 3px;
    @include pixelated;
    font-size: 8px;

    .grid-header-row {
      display: grid;
      grid-template-columns: 35px 30px 40px 1fr;
      text-align: right;
      color: Rgba(255, 255, 255, 0.4);
      font-weight: bold;
      padding-bottom: 2px;
      border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

      .grid-header:first-child {
        text-align: left;
      }
    }

    .grid-stat-row {
      display: grid;
      grid-template-columns: 35px 30px 40px 1fr;
      text-align: right;
      align-items: center;
      padding: 1px 0;

      .stat-name-col {
        text-align: left;
        color: Rgba(255, 255, 255, 0.6);
      }

      .stat-val-col {
        color: Rgba(255, 255, 255, 0.8);
      }

      .stat-mult-col {
        color: #aeaebe;
        font-weight: bold;
      }

      .stat-final-col {
        color: #ffffff;
        font-weight: bold;
      }

      &.is-up {
        .stat-name-col, .stat-mult-col, .stat-final-col {
          color: #32d74b;
        }
      }

      &.is-down {
        .stat-name-col, .stat-mult-col, .stat-final-col {
          color: #ff453a;
        }
      }
    }
  }

  .admin-only-disclaimer {
    @include pixelated;
    font-size: 7px;
    color: #ffd60a;
    background: Rgba(255, 214, 10, 0.15);
    border: 1px dashed Rgba(255, 214, 10, 0.4);
    padding: 4px;
    border-radius: 4px;
    text-align: center;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
}
</style>
