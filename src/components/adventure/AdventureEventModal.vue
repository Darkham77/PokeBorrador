<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'

interface ActiveAdventureEvent {
  title?: string
  desc?: string
  moRequired?: string
  type?: string
}

defineProps<{
  activeEvent: ActiveAdventureEvent | null
  activeHMs: Set<string>
}>()

const emit = defineEmits<{
  (e: 'resolve'): void
  (e: 'resume'): void
}>()
</script>

<template>
  <BaseModal
    :show="Boolean(activeEvent)"
    :title="activeEvent?.title || ''"
    title-color="var(--yellow)"
    max-width="500px"
    variant="retro"
    @close="emit('resolve')"
  >
    <div
      v-if="activeEvent"
      style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font-pixel); font-size: 8px; text-align: center;"
    >
      <p
        class="adv-event-desc"
        style="line-height: 1.7; color: #c5c6c7; margin: 0;"
      >
        {{ activeEvent.desc }}
      </p>

      <div
        v-if="activeEvent.moRequired"
        class="adv-mo-status"
      >
        Requisito: <span :class="['adv-mo-badge', { ok: activeHMs.has(activeEvent.moRequired) }]">
          MO {{ activeEvent.moRequired.toUpperCase() }} <!-- text-ok -->
          ({{ activeHMs.has(activeEvent.moRequired) ? 'DISPONIBLE' : 'FALTANTE' }})
        </span>
      </div>

      <button
        v-if="activeEvent.type === 'combat_won'"
        id="adv-event-resume-btn"
        class="btn-vicio-primary"
        style="width: 100%; padding: 10px; font-size: 8px;"
        @click="emit('resume')"
      >
        🚶 Continuar Viaje
      </button>
      <template v-else>
        <button
          v-if="!activeEvent.moRequired || activeHMs.has(activeEvent.moRequired)"
          id="adv-event-resolve-btn"
          class="btn-vicio-primary"
          style="width: 100%; padding: 10px; font-size: 8px;"
          @click="emit('resolve')"
        >
          {{ activeEvent.type === 'obstacle_rock_smash' ? '⛏️ Excavar Fósil' : activeEvent.type === 'fishing' ? '🎣 Lanzar Caña' : activeEvent.type === 'obstacle_cut' ? '✂️ Cortar Arbusto' : activeEvent.type === 'obstacle_strength' ? '💪 Empujar Roca' : '⚔️ Combatir' }}
        </button>
        <button
          v-else
          id="adv-event-bypass-btn"
          class="btn-vicio-secondary"
          style="width: 100%; padding: 10px; font-size: 8px;"
          @click="emit('resolve')"
        >
          🚶 Rodear Obstáculo
        </button>
      </template>
    </div>
  </BaseModal>
</template>
