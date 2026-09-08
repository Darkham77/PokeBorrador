<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePvPStore } from '@/stores/pvp';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import BaseModal from '@/components/common/BaseModal.vue';
import ArenaRankedPanel from '@/components/modals/ArenaRankedPanel.vue';
import ArenaCasualPanel from '@/components/modals/ArenaCasualPanel.vue';
import ArenaReplaysPanel from '@/components/modals/ArenaReplaysPanel.vue';
import ArenaPassivePanel from '@/components/modals/ArenaPassivePanel.vue';

type ArenaTab = 'ranked' | 'casual' | 'replays' | 'defense';

interface Props {
  show?: boolean;
  initialTab?: ArenaTab;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialTab: 'ranked'
});

const emit = defineEmits<{
  close: [];
}>();

const pvp = usePvPStore();
const auth = useAuthStore();
const ui = useUIStore();

const activeTab = ref<ArenaTab>(props.initialTab || 'ranked');

const isSmallScreen = computed(() => ui.isSmallScreen);

onMounted(async () => {
  await pvp.loadPvPData();
});
</script>

<template>
  <BaseModal
    :show="show"
    :type="isSmallScreen ? 'fullscreen' : 'center'"
    :max-width="isSmallScreen ? '100dvw' : '680px'"
    :height="isSmallScreen ? '100dvh' : '780px'"
    variant="retro"
    padding="raw"
    accent-color="var(--blue-light)"
    @close="emit('close')"
  >
    <template #header>
      <div class="arena-modal-header">
        <div class="arena-title-group">
          <span class="emoji">🏛️</span>
          <div class="title-text-wrap">
            <span class="main-title text-outline">COLISEO PVP</span>
            <span class="sub-title">Arena multijugador y emparejamiento</span>
          </div>
        </div>
        <div class="header-stats">
          <div
            v-if="auth.sessionMode === 'offline'"
            class="stat-node local-mode"
          >
            <span class="label">MODO</span>
            <span class="value text-outline">LOCAL</span>
          </div>
          <div class="stat-node elo">
            <span class="label">ELO</span>
            <span class="value text-outline">{{ pvp.elo || 1000 }}</span>
          </div>
        </div>
      </div>
    </template>

    <div class="arena-modal-content-inner">
      <!-- Navigation Tabs -->
      <nav class="arena-nav-tabs">
        <button
          v-gsap-hover="'button'"
          class="modal-tab-btn"
          :class="{ active: activeTab === 'ranked' }"
          @click="activeTab = 'ranked'"
        >
          <span class="tab-icon"><span class="emoji">🏆</span></span>
          <span class="tab-label">RANKED</span>
        </button>
        <button
          v-gsap-hover="'button'"
          class="modal-tab-btn"
          :class="{ active: activeTab === 'casual' }"
          @click="activeTab = 'casual'"
        >
          <span class="tab-icon"><span class="emoji">⚔️</span></span>
          <span class="tab-label">DUELOS & SALAS</span>
        </button>
        <button
          v-gsap-hover="'button'"
          class="modal-tab-btn"
          :class="{ active: activeTab === 'replays' }"
          @click="activeTab = 'replays'"
        >
          <span class="tab-icon"><span class="emoji">📺</span></span>
          <span class="tab-label">REPETICIONES</span>
        </button>
        <button
          v-gsap-hover="'button'"
          class="modal-tab-btn"
          :class="{ active: activeTab === 'defense' }"
          @click="activeTab = 'defense'"
        >
          <span class="tab-icon"><span class="emoji">🛡️</span></span>
          <span class="tab-label">DEFENSA</span>
        </button>
      </nav>

      <!-- Panel Views -->
      <main class="arena-main custom-scrollbar">
        <ArenaRankedPanel v-if="activeTab === 'ranked'" />
        <ArenaCasualPanel v-else-if="activeTab === 'casual'" />
        <ArenaReplaysPanel v-else-if="activeTab === 'replays'" />
        <ArenaPassivePanel v-else-if="activeTab === 'defense'" />
      </main>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss" src="@/styles/components/_arena.scss"></style>

