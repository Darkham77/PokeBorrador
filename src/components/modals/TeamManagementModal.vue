<script setup lang="ts">
import { computed } from 'vue'
import gsap from 'gsap'
import { useUIStore } from '@/stores/ui'
import BaseModal from '@/components/common/BaseModal.vue'
import UnifiedTeamSlot from '@/components/team/UnifiedTeamSlot.vue'
import TournamentRulesHeader from '@/components/team/TournamentRulesHeader.vue'
import TeamManagementHeaderTabs from '@/components/team/TeamManagementHeaderTabs.vue'
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

const modalType = computed(() => (isSmallScreen.value ? 'fullscreen' : 'center'))
const modalMaxWidth = computed(() => (isSmallScreen.value ? '100dvw' : '940px'))
</script>

<template>
  <BaseModal
    show
    header-background="transparent"
    :type="modalType"
    :max-width="modalMaxWidth"
    padding="standard"
    @close="uiStore.toggleTeamManagement"
  >
    <template #header>
      <TeamManagementHeaderTabs
        :active-tab="activeTab"
        :adventure-count="adventureCount"
        :pvp-count="pvpCount"
        :pvp6-count="pvp6Count"
        :war-count="warCount"
        :max-war-slots="maxWarSlots"
        @select-tab="(tab) => activeTab = tab"
      />
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
        <TournamentRulesHeader
          :theme-name="tournamentThemeName"
          :level-cap="tournamentLevelCap"
          :is-little-cup="tournamentIsLittleCup"
          :allowed-types="tournamentAllowedTypes"
          mode="pvp"
          @auto-adjust="runAutoFillTeam"
        />

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
        <TournamentRulesHeader
          :theme-name="tournamentThemeName"
          :level-cap="tournamentLevelCap"
          :is-little-cup="tournamentIsLittleCup"
          :allowed-types="tournamentAllowedTypes"
          mode="pvp6"
          @auto-adjust="runAutoFillTeam"
        />

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

