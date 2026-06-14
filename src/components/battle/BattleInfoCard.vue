<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import HPBar from './HPBar.vue'
import { useBattleStore } from '@/stores/battle'
import { useProfileStore } from '@/stores/profile'
import { supabase } from '@/logic/supabase'
import { getStatBreakdown } from '@/logic/battle/battleEngine'
import { useCombatantStatus } from '@/composables/useCombatantStatus'

import type { Pokemon } from '@/types/pokemon'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'

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

const formatMult = (m: number) => {
  if (m === 1) return ''
  const formatted = Number(m.toFixed(2))
  return ` x${formatted}`
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
          {{ isScrambled ? '???' : p.name }}
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

        <!-- Admin Info Icon -->
        <PVTooltip
          v-if="isAdmin"
          position="bottom"
          title="😈 ADMIN: UNIT STATS"
          class="admin-info-trigger"
        >
          <span class="admin-icon-btn">❓</span>
          
          <template #content>
            <div class="admin-stat-debug">
              <div 
                v-for="stat in adminStatConfig" 
                :key="stat.key"
                class="debug-stat-row"
                :class="{
                  'is-up': getStatModifier(stat.key) > 0,
                  'is-down': getStatModifier(stat.key) < 0
                }"
              >
                <div class="stat-main-line">
                  <span class="d-icon">{{ stat.icon }}</span>
                  <span class="d-label">{{ stat.label }}</span>
                  <span class="d-val">{{ Math.round(getBreakdown(stat.key).final) }}</span>
                  <span
                    v-if="getStatModifier(stat.key) !== 0"
                    class="d-mod"
                  >
                    {{ getStatModifier(stat.key) > 0 ? '↑' : '↓' }}{{ Math.abs(getStatModifier(stat.key)) }}
                  </span>
                </div>
                <div class="stat-breakdown-line">
                  <span class="b-base">{{ getBreakdown(stat.key).base }}</span>
                  <span class="b-ops">
                    {{ formatMult(getBreakdown(stat.key).weatherMult) }}
                    {{ formatMult(getBreakdown(stat.key).stageMult) }}
                    {{ formatMult(getBreakdown(stat.key).abilityMult) }}
                    {{ formatMult(getBreakdown(stat.key).statusMult) }}
                  </span>
                </div>
              </div>
              <div class="admin-notice">
                ⚠️ Solo visible para ADMIN
              </div>
            </div>
          </template>
        </PVTooltip>
      </div>
        
      <div class="level-row">
        <div class="poke-level m-badge-level">
          Nv. {{ isScrambled ? '??' : p.level }}
        </div>
        <div
          v-if="!isPlayer && !isScrambled && gameStore.state.playerClass === 'criador'"
          class="m-badge-nature"
        >
          {{ p.nature || 'Serio' }}
        </div>
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
          :description="status.description"
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
        </PVTooltip>
      </div>

      <!-- Escáner de IVs Activo (debajo de estados, solo para Pokémon salvaje rival) -->
      <div 
        v-if="isIvScannerActive && !isPlayer && !isScrambled && !battleStore.state?.isTrainer && !battleStore.state?.isGym && !battleStore.state?.isPvP"
        class="iv-scanner-radar-hud"
      >
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
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.glass-card {
  background: Rgba(15, 23, 42, 0.4);
  backdrop-filter: Blur(12px);
  -webkit-backdrop-filter: Blur(12px);
  -webkit-will-change: transform, opacity, backdrop-filter;
  will-change: transform, opacity, backdrop-filter;
  @include gpu-layer;
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 18px;
  padding: 15px;
  min-width: 200px;
  box-shadow: 0 10px 30px Rgba(0,0,0,0.5), inset 0 0 10px Rgba(255,255,255,0.05);
  color: $white;

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
  
  &.active {
    background: linear-gradient(180deg, #ff3e3e 50%, #ffffff 50%);
    box-shadow: 0 0 5px Rgba(255, 62, 62, 0.6);
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
  align-items: center;
  gap: 8px;
  width: fit-content;
  line-height: 1;

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
</style>
