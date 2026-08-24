<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { gsap } from 'gsap'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import BattleInfoCardStatusContainer from './BattleInfoCardStatusContainer.vue'
import BattleInfoCardIvRadar from './BattleInfoCardIvRadar.vue'
import PartyPreviewGrid from './PartyPreviewGrid.vue'
import HPBar from './HPBar.vue'
import { useBattleStore } from '@/stores/battle/battle'
import type { PartySlotStatus } from '@/types/battle/battle'
import { useProfileStore } from '@/stores/player/profile'
import { supabase } from '@/logic/db/supabase'
import { getStatBreakdown } from '@/logic/battle/battleEngine'
import { useCombatantStatus } from '@/composables/battle/useCombatantStatus'

import type { Pokemon } from '@/types/pokemon/pokemon'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { NATURE_DATA, isNatureId } from '@/data/battle/natures'

const getNatureData = (nat: string | undefined) => {
  if (!nat) return NATURE_DATA['serious']
  const key = nat.toLowerCase()
  return (isNatureId(key) ? NATURE_DATA[key] : undefined) || Object.values(NATURE_DATA).find(n => n.name.toLowerCase() === key)
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
  return profileStore.profileData.isAdmin || (typeof window !== 'undefined' && Boolean(Reflect.get(window, '__ADMIN_DEBUG__'))) || supabase.isLocal
})

const showStatsTable = computed(() => {
  return props.isPlayer || isIvScannerActive.value || isAdmin.value
})

const cardRef = ref<HTMLElement | null>(null)

import BattleInfoCardHeader from './BattleInfoCardHeader.vue'

// --- GESTIÓN DE XP Y LEVEL UP (Phase 3) ---
const isLevelingUp = ref(false)

const GSAP_LEVEL_UP_CARD_SCALE_BOOST = 1.05
const GSAP_LEVEL_UP_FLASH_DURATION_SEC = 0.15

watch(() => p.value.level, (newLevel, oldLevel) => {
  if (oldLevel && newLevel > oldLevel) {
    // 1. Efecto de Destello (Flash) con GSAP
    if (cardRef.value) {
      gsap.fromTo(cardRef.value, 
        { filter: 'Brightness(1) contrast(1)', scale: 1 },
        { 
          filter: 'Brightness(2) contrast(1.2)', 
          scale: GSAP_LEVEL_UP_CARD_SCALE_BOOST, 
          duration: GSAP_LEVEL_UP_FLASH_DURATION_SEC, 
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
  return (stages as Record<string, number>)[key] || 0 // open-record
}

import { isStatIdExceptHP, type StatIDExceptHP } from '@/logic/pokemon/statsMath'

const getBreakdown = (key: string) => {
  const stages = props.isPlayer ? battleStore.playerStages : battleStore.enemyStages
  const weather = battleStore.state?.weather
  const statKey: StatIDExceptHP = isStatIdExceptHP(key) ? key : 'atk'
  return getStatBreakdown(p.value, statKey, stages, weather || null)
}

const showTeamBalls = computed(() => {
  // En la presentación del entrenador (FIRST_INTRO) se muestra la fila de Pokéballs disponibles.
  return battleStore.state?.isTrainer || battleStore.state?.isGym || battleStore.state?.isPvP
})

const MAX_TEAM_CAPACITY = 6

const teamBallsStatus = computed(() => {
  if (!battleStore.state) return []
  const team = props.isPlayer 
    ? ((battleStore.state.playerTeam && battleStore.state.playerTeam.length > 0) ? battleStore.state.playerTeam : (gameStore.state.team || []))
    : (battleStore.state.enemyTeam || [])
  
  const statuses: PartySlotStatus[] = []
  for (let i = 0; i < MAX_TEAM_CAPACITY; i++) {
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
      <BattleInfoCardHeader
        :pokemon="p"
        :is-player="isPlayer"
        :is-scrambled="isScrambled"
      />
        
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
            {{ getNatureData(p.nature)?.name || 'Seria' }}
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
      <PartyPreviewGrid
        v-if="showTeamBalls"
        :team-balls-status="teamBallsStatus"
      />

      <HPBar
        :hp="p.hp"
        :max-hp="p.maxHp"
        :level="p.level"
        :exp="p.exp || 0"
        :exp-needed="p.expNeeded || 100"
        :is-player="isPlayer"
        :is-scrambled="isScrambled"
        :pokemon-uid="p.uid"
      />

      <BattleInfoCardStatusContainer
        v-if="!isScrambled && unifiedStatuses.length > 0"
        :unified-statuses="unifiedStatuses"
        :show-stats-table="showStatsTable"
        :admin-stat-config="adminStatConfig"
        :get-stat-modifier="getStatModifier"
        :get-breakdown="getBreakdown"
        :pokemon="p"
      />

      <!-- Escáner de IVs Activo (debajo de estados, solo para Pokémon salvaje rival) -->
      <BattleInfoCardIvRadar
        :is-iv-scanner-active="isIvScannerActive"
        :is-player="isPlayer"
        :is-scrambled="isScrambled"
        :is-trainer-or-gym-or-pv-p="!!(battleStore.state?.isTrainer || battleStore.state?.isGym || battleStore.state?.isPvP)"
        :iv-total="ivTotal"
        :pokemon-tier-info="pokemonTierInfo"
        :p="p"
      />
    </div>
  </div>
</template>

<style scoped src="./BattleInfoCard.styles.scss" lang="scss"></style>
