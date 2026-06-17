<script setup lang="ts">
import { ref } from 'vue';
import { useShowdownSandboxStore } from '../stores/useShowdownSandboxStore';
import { useRouter } from 'vue-router';
import ShowdownTeambuilder from '../components/ShowdownTeambuilder.vue';
import ShowdownCombatScene from '../components/ShowdownCombatScene.vue';
import ShowdownControls from '../components/ShowdownControls.vue';
import ShowdownConsole from '../components/ShowdownConsole.vue';

const store = useShowdownSandboxStore();
const router = useRouter();

const showConsole = ref(true);

const goBack = () => {
  router.push('/');
};

const toggleConsole = () => {
  showConsole.value = !showConsole.value;
};
</script>

<template>
  <div class="showdown-sandbox-container">
    <!-- Header/Navigation Bar -->
    <header class="sandbox-header">
      <div class="header-left">
        <button
          class="back-btn"
          @click="goBack"
        >
          <span class="pixel-arrow">←</span> Volver
        </button>
        <span class="sandbox-badge">BATTLE ENGINE SHOWDOWN v6vs6</span>
      </div>
      <div class="header-right">
        <button
          class="console-toggle-btn"
          @click="toggleConsole"
        >
          {{ showConsole ? 'Ocultar Consola' : 'Mostrar Consola' }}
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="sandbox-workspace">
      <!-- Setup Overlay (Extracted component) -->
      <ShowdownTeambuilder v-if="store.isSetupMode" />

      <!-- Battle Arena & Controls View -->
      <main
        v-else
        class="battle-arena-panel"
      >
        <!-- Combat Scene (Arena platforms, sprites and HUDs) -->
        <ShowdownCombatScene />

        <!-- Combat controls (Attacks, switch bench and modals) -->
        <ShowdownControls />
      </main>

      <!-- Terminal / Showdown Console -->
      <ShowdownConsole v-if="showConsole" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.showdown-sandbox-container {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 100%;
  background-color: #05070c;
  color: #f5f5f7;
  overflow: hidden;
  font-family: var(--font-ui, 'Nunito', sans-serif);
}

.sandbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(180deg, Rgba(255, 255, 255, 0.05) 0%, Rgba(255, 255, 255, 0) 100%), #0f1220;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.12);
  z-index: 100;
  box-shadow: 0 4px 20px Rgba(0, 0, 0, 0.4);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    padding: 6px 14px;
    border-radius: 8px;
    color: #f5f5f7;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: Rgba(255, 255, 255, 0.15);
      border-color: var(--blue, #0a84ff);
      box-shadow: 0 0 10px Rgba(10, 132, 255, 0.3);
    }

    .pixel-arrow {
      font-weight: bold;
    }
  }

  .sandbox-badge {
    font-family: var(--font-pixel);
    font-size: 9px;
    color: var(--yellow, #ffd60a);
    background: Rgba(255, 214, 10, 0.15);
    border: 1px solid Rgba(255, 214, 10, 0.3);
    padding: 4px 8px;
    border-radius: 4px;
    text-shadow: 0 0 5px Rgba(255, 214, 10, 0.2);
  }

  .console-toggle-btn {
    background: Rgba(10, 132, 255, 0.12);
    border: 1px solid Rgba(10, 132, 255, 0.3);
    padding: 6px 14px;
    border-radius: 8px;
    color: var(--blue, #0a84ff);
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;

    &:hover {
      background: Rgba(10, 132, 255, 0.22);
      box-shadow: 0 0 12px Rgba(10, 132, 255, 0.4);
    }
  }
}

.sandbox-workspace {
  display: flex;
  flex: 1;
  width: 100%;
  overflow: hidden;
}

.battle-arena-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
