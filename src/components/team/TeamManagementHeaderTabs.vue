<script setup lang="ts">
import type { TeamManagementTab } from '@/types/battle/pvp'
import PVTooltip from '@/components/common/PVTooltip.vue'

withDefaults(defineProps<{
  activeTab: TeamManagementTab
  adventureCount?: number
  pvpCount?: number
  pvp6Count?: number
  warCount?: number
  maxWarSlots?: number
}>(), {
  adventureCount: 0,
  pvpCount: 0,
  pvp6Count: 0,
  warCount: 0,
  maxWarSlots: 6
})

const emit = defineEmits<{
  (e: 'select-tab', tab: TeamManagementTab): void
}>()
</script>

<template>
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
        @click="emit('select-tab', 'adventure')"
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
        @click="emit('select-tab', 'pvp')"
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
        @click="emit('select-tab', 'pvp6')"
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
        @click="emit('select-tab', 'war')"
      >
        <span class="emoji">🛡️</span>
        <span>GUERRA</span>
        <span class="tab-count">{{ warCount }}/{{ maxWarSlots }}</span>
      </button>
    </PVTooltip>
  </div>
</template>

<style scoped src="./TeamManagementHeaderTabs.styles.scss" lang="scss"></style>
