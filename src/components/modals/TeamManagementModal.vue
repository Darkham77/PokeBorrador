<script setup lang="ts">
import { computed } from 'vue'
import gsap from 'gsap'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedTeamSlot from '@/components/team/UnifiedTeamSlot.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { TeamManagementTab } from '@/types/battle/pvp'
import { useTeamManagement } from '@/composables/team/useTeamManagement'

interface Props {
  initialTab?: TeamManagementTab
}

const props = withDefaults(defineProps<Props>(), {
  initialTab: 'adventure'
})

const TAB_TRANSITION_Y_PX = 4
const TAB_TRANSITION_DURATION_SEC = 0.3

const onTabEnter = (el: Element, done: () => void) => {
  gsap.fromTo(
    el,
    { opacity: 0, y: TAB_TRANSITION_Y_PX },
    { opacity: 1, y: 0, duration: TAB_TRANSITION_DURATION_SEC, ease: 'power2.out', onComplete: done }
  )
}

const uiStore = useUIStore()
const isSmallScreen = computed(() => uiStore.isSmallScreen)

const {
  activeTab,
  adventureTeam,
  pvpTeam,
  pvpTeam6,
  warTeam,
  adventureCount,
  pvpCount,
  pvp6Count,
  warCount,
  maxWarSlots,
  tournamentThemeName,
  tournamentLevelCap,
  tournamentIsLittleCup,
  tournamentAllowedTypes,
  pvpEvaluations,
  pvp6Evaluations,
  touchOverIndex,
  isDragging,
  runAutoFillTeam,
  handleDragStart,
  handleDragEnd,
  handleDrop,
  handleSlotSelect,
  openDetail,
  openItem,
  unequipItem,
  sendToBox
} = useTeamManagement(props)
</script>

<template>
  <BaseModal
    show
    header-background="transparent"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '940px'"
    padding="standard"
    @close="uiStore.toggleTeamManagement"
  >
    <template #header>
      <div class="team-header-tabs">
        <PVTooltip 
          title="EQUIPO DE AVENTURA"
          description="Tu equipo principal para viajar por el mapa y enfrentarte a gimnasios."
          position="top"
        >
          <button 
            id="team-management-tab-adventure-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'adventure' }"
            @click="activeTab = 'adventure'"
          >
            <span class="emoji">🎒</span>
            <span>AVENTURA</span>
            <span class="tab-count">{{ adventureCount }}/6</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO PVP 3v3"
          description="Selecciona tus 3 Pokémon para combates online 3v3 contra otros jugadores."
          position="top"
        >
          <button 
            id="team-management-tab-pvp-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'pvp' }"
            @click="activeTab = 'pvp'"
          >
            <span class="emoji">⚔️</span>
            <span>PVP 3v3</span>
            <span class="tab-count">{{ pvpCount }}/3</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO PVP 6v6"
          description="Selecciona tus 6 Pokémon para combates online 6v6 contra otros jugadores."
          position="top"
        >
          <button 
            id="team-management-tab-pvp6-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'pvp6' }"
            @click="activeTab = 'pvp6'"
          >
            <span class="emoji">⚔️</span>
            <span>PVP 6v6</span>
            <span class="tab-count">{{ pvp6Count }}/6</span>
          </button>
        </PVTooltip>

        <PVTooltip 
          title="EQUIPO DE GUERRA"
          description="Tus Pokémon asignados para defender y atacar en Guerras de Clanes."
          position="top"
        >
          <button 
            id="team-management-tab-war-btn"
            class="tm-tab" 
            :class="{ active: activeTab === 'war' }"
            @click="activeTab = 'war'"
          >
            <span class="emoji">🛡️</span>
            <span>GUERRA</span>
            <span class="tab-count">{{ warCount }}/{{ maxWarSlots }}</span>
          </button>
        </PVTooltip>
      </div>
    </template>

    <!-- ADVENTURE SECTION -->
    <Transition
      :css="false"
      @enter="onTabEnter"
    >
      <section
        v-if="activeTab === 'adventure'"
        class="tm-section-container"
      >
        <div class="slots-grid">
          <UnifiedTeamSlot
            v-for="(p, i) in adventureTeam"
            :key="'adv-' + i"
            :pokemon="p"
            :index="i"
            :is-dragging-any="isDragging"
            :is-touch-over="touchOverIndex === i"
            @open-detail="openDetail(p)"
            @open-item="openItem(p)"
            @unequip-item="unequipItem(p)"
            @send-to-box="sendToBox(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>

    <!-- PVP SECTION -->
    <Transition
      :css="false"
      @enter="onTabEnter"
    >
      <section
        v-if="activeTab === 'pvp'"
        class="tm-section-container"
      >
        <!-- Tournament Rules & Auto-Adjust Action Header -->
        <div class="tournament-rules-header">
          <div class="rules-info">
            <div class="rules-title">
              <span class="emoji">🏆</span>
              <span class="theme-name text-outline">{{ tournamentThemeName }}</span>
            </div>
            <div class="rules-badges">
              <span
                v-if="tournamentLevelCap"
                class="rule-badge text-outline"
              >
                Nv. Máx {{ tournamentLevelCap }}
              </span>
              <span
                v-if="tournamentIsLittleCup"
                class="rule-badge little-cup text-outline"
              >
                <span class="emoji">🍼</span> Little Cup
              </span>
              <span
                v-if="tournamentAllowedTypes"
                class="rule-badge types text-outline"
              >
                Tipos: {{ tournamentAllowedTypes }}
              </span>
            </div>
          </div>
          <button
            v-gsap-hover
            class="auto-adjust-btn"
            @click="runAutoFillTeam('pvp')"
          >
            <span class="emoji">⚡</span>
            <span>AUTO-AJUSTAR</span>
          </button>
        </div>

        <div class="slots-grid">
          <UnifiedTeamSlot
            v-for="(p, i) in pvpTeam"
            :key="'pvp-' + i"
            :pokemon="p"
            :index="i"
            :is-dragging-any="isDragging"
            :is-touch-over="touchOverIndex === i"
            is-pvp
            :is-rule-violated="p ? !pvpEvaluations.get(p.uid)?.eligible : false"
            :rule-violation-reason="p ? pvpEvaluations.get(p.uid)?.reason : ''"
            @open-detail="openDetail(p)"
            @open-item="openItem(p)"
            @unequip-item="unequipItem(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>

    <!-- PVP 6v6 SECTION -->
    <Transition
      :css="false"
      @enter="onTabEnter"
    >
      <section
        v-if="activeTab === 'pvp6'"
        class="tm-section-container"
      >
        <!-- Tournament Rules & Auto-Adjust Action Header -->
        <div class="tournament-rules-header">
          <div class="rules-info">
            <div class="rules-title">
              <span class="emoji">🏆</span>
              <span class="theme-name text-outline">{{ tournamentThemeName }}</span>
            </div>
            <div class="rules-badges">
              <span
                v-if="tournamentLevelCap"
                class="rule-badge text-outline"
              >
                Nv. Máx {{ tournamentLevelCap }}
              </span>
              <span
                v-if="tournamentIsLittleCup"
                class="rule-badge little-cup text-outline"
              >
                <span class="emoji">🍼</span> Little Cup
              </span>
              <span
                v-if="tournamentAllowedTypes"
                class="rule-badge types text-outline"
              >
                Tipos: {{ tournamentAllowedTypes }}
              </span>
            </div>
          </div>
          <button
            v-gsap-hover
            class="auto-adjust-btn"
            @click="runAutoFillTeam('pvp6')"
          >
            <span class="emoji">⚡</span>
            <span>AUTO-AJUSTAR</span>
          </button>
        </div>

        <div class="slots-grid">
          <UnifiedTeamSlot
            v-for="(p, i) in pvpTeam6"
            :key="'pvp6-' + i"
            :pokemon="p"
            :index="i"
            :is-dragging-any="isDragging"
            :is-touch-over="touchOverIndex === i"
            is-pvp
            :is-rule-violated="p ? !pvp6Evaluations.get(p.uid)?.eligible : false"
            :rule-violation-reason="p ? pvp6Evaluations.get(p.uid)?.reason : ''"
            @open-detail="openDetail(p)"
            @open-item="openItem(p)"
            @unequip-item="unequipItem(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>

    <!-- WAR SECTION -->
    <Transition
      :css="false"
      @enter="onTabEnter"
    >
      <section
        v-if="activeTab === 'war'"
        class="tm-section-container"
      >
        <div class="slots-grid">
          <UnifiedTeamSlot
            v-for="(p, i) in warTeam"
            :key="'war-' + i"
            :pokemon="p"
            :index="i"
            :is-dragging-any="isDragging"
            :is-touch-over="touchOverIndex === i"
            is-pvp
            @open-detail="openDetail(p)"
            @open-item="openItem(p)"
            @unequip-item="unequipItem(p)"
            @select="handleSlotSelect"
            @drag-start="handleDragStart"
            @drag-over="(idx) => touchOverIndex = idx"
            @drag-end="handleDragEnd"
            @drop-pokemon="handleDrop"
          />
        </div>
      </section>
    </Transition>
  </BaseModal>
</template>

<style scoped src="./TeamManagementModal.styles.scss" lang="scss"></style>

