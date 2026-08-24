<script setup lang="ts">
import { ref, computed } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import DebugAudioAnimTab from '@/components/admin/debug/DebugAudioAnimTab.vue'
import TimeDebugControls from '@/components/admin/debug/shared/TimeDebugControls.vue'
import SpawnDebugControls from '@/components/admin/debug/shared/SpawnDebugControls.vue'
import DebugActionPanel from '@/components/battle/DebugActionPanel.vue'

const isOpen = ref(false)
const isEffectsOpen = ref(false)
const isTimeOpen = ref(false)
const isSpawnOpen = ref(false)

const isDebug = computed(() => typeof window !== 'undefined' && !!window.__VITE_DEBUG__)
</script>

<template>
  <div
    v-if="isDebug"
    class="battle-debug-tools"
    :class="{ 'is-open': isOpen || isEffectsOpen || isTimeOpen || isSpawnOpen }"
  >
    <!-- MODULAR ACTION DEBUG PANEL -->
    <Transition name="slide-up">
      <DebugActionPanel
        v-if="isOpen"
        @close="isOpen = false"
      />
    </Transition>

    <!-- EFFECTS PANEL -->
    <Transition name="slide-up">
      <div
        v-if="isEffectsOpen"
        class="effects-menu custom-scrollbar-vicio"
      >
        <div class="effects-header">
          <span class="icon">✨</span>
          <span class="title">BATTLE EFFECTS & AUDIO</span>
          <button
            id="battle-debug-effects-close-btn"
            class="close-mini"
            @click.stop="isEffectsOpen = false"
          >
            ✕
          </button>
        </div>
        <div class="effects-scroll-area">
          <DebugAudioAnimTab />
        </div>
      </div>
    </Transition>

    <!-- TIME PANEL -->
    <Transition name="slide-up">
      <div
        v-if="isTimeOpen"
        class="time-menu custom-scrollbar-vicio"
      >
        <div class="time-header">
          <span class="icon">⌛</span>
          <span class="title">TIME & WEATHER CONTROL</span>
          <button
            class="close-mini"
            @click.stop="isTimeOpen = false"
          >
            ✕
          </button>
        </div>
        <div class="time-scroll-area">
          <TimeDebugControls />
        </div>
      </div>
    </Transition>

    <!-- SPAWN PANEL -->
    <Transition name="slide-up">
      <div
        v-if="isSpawnOpen"
        class="spawn-menu custom-scrollbar-vicio"
      >
        <div class="spawn-header">
          <span class="icon">🎲</span>
          <span class="title">SPAWN & MINIGAMES CONDITIONS</span>
          <button
            id="battle-debug-spawn-close-btn"
            class="close-mini"
            @click.stop="isSpawnOpen = false"
          >
            ✕
          </button>
        </div>
        <div class="spawn-scroll-area">
          <SpawnDebugControls />
        </div>
      </div>
    </Transition>

    <!-- TRIGGERS ROW -->
    <div class="debug-triggers-row">
      <PVTooltip title="Debug Menu">
        <button
          id="battle-debug-menu-btn"
          class="debug-trigger"
          :class="{ active: isOpen }"
          @click.stop="isOpen = !isOpen; isEffectsOpen = false; isTimeOpen = false; isSpawnOpen = false"
        >
          <span class="icon">🕹️</span>
          <span class="label">DEBUG</span>
        </button>
      </PVTooltip>

      <PVTooltip title="Audio & Visual Effects">
        <button
          id="battle-debug-effects-btn"
          class="effects-trigger"
          :class="{ active: isEffectsOpen }"
          @click.stop="isEffectsOpen = !isEffectsOpen; isOpen = false; isTimeOpen = false; isSpawnOpen = false"
        >
          <span class="icon">✨</span>
          <span class="label">EFECTOS</span>
        </button>
      </PVTooltip>

      <PVTooltip title="Time, Season & Weather">
        <button
          class="time-trigger"
          :class="{ active: isTimeOpen }"
          @click.stop="isTimeOpen = !isTimeOpen; isOpen = false; isEffectsOpen = false; isSpawnOpen = false"
        >
          <span class="icon">⌛</span>
          <span class="label">TIEMPO</span>
        </button>
      </PVTooltip>

      <PVTooltip title="Spawn, Encounters & Minigames">
        <button
          id="battle-debug-spawn-btn"
          class="spawn-trigger"
          :class="{ active: isSpawnOpen }"
          @click.stop="isSpawnOpen = !isSpawnOpen; isOpen = false; isEffectsOpen = false; isTimeOpen = false"
        >
          <span class="icon">🎲</span>
          <span class="label">SPAWN</span>
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.battle-debug-tools {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  pointer-events: none;
  min-height: 0; 
  padding: 0;
  @include pixelated;
  
  &.is-open { pointer-events: all; }
}

.debug-triggers-row {
  display: flex;
  gap: 8px;
  pointer-events: all;
  justify-content: flex-start;
  width: 100%;
}

.debug-trigger, .effects-trigger, .time-trigger, .spawn-trigger {
  @include btn-vicio('info', 'xs', true);
  background: Rgba(20, 20, 30, 0.95);
  font-size: 7px;
  height: 24px;
  padding: 0 14px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 1px 1px 0 $black;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.6);
  @include pixelated;
}

.debug-trigger {
  border: 2px solid var(--yellow);
  color: var(--yellow);
  &:hover, &.active { background: var(--yellow); color: $black; text-shadow: none; }
}

.effects-trigger {
  border: 2px solid var(--purple);
  color: var(--purple);
  &:hover, &.active { background: var(--purple); color: white; }
}

.effects-menu {
  background: Rgba(15, 15, 25, 0.99);
  border: 2px solid var(--purple);
  border-radius: 8px;
  width: 340px;
  max-width: 90dvw;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  pointer-events: all;
  box-shadow: 0 15px 50px Rgba(0,0,0,0.9);
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  @include gpu-layer;
  margin-bottom: 12px;

  .effects-header {
    background: Rgba(124, 58, 237, 0.15);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

    .title { @include pixelated; font-size: 8px; color: var(--purple); flex: 1; }
    .close-mini { background: none; border: none; color: white; cursor: pointer; opacity: 0.5; &:hover { opacity: 1; } }
  }

  .effects-scroll-area {
    padding: 16px;
    min-height: 0;
    overflow-y: auto;
    flex: 1;
    @include smooth-scroll;
  }
}

.time-menu {
  background: Rgba(15, 15, 25, 0.99);
  border: 2px solid var(--blue);
  border-radius: 8px;
  width: 340px;
  max-width: 90dvw;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  pointer-events: all;
  box-shadow: 0 15px 50px Rgba(0,0,0,0.9);
  @include gpu-layer;
  margin-bottom: 12px;

  .time-header {
    background: Rgba(59, 130, 246, 0.15);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

    .title { @include pixelated; font-size: 8px; color: var(--blue); flex: 1; }
    .close-mini { background: none; border: none; color: white; cursor: pointer; opacity: 0.5; &:hover { opacity: 1; } }
  }

  .time-scroll-area {
    padding: 16px;
    min-height: 0;
    overflow-y: auto;
    flex: 1;
    @include smooth-scroll;
  }
}

.time-trigger {
  border: 2px solid var(--blue);
  color: var(--blue);
  &:hover, &.active { background: var(--blue); color: white; text-shadow: none; }
}

.spawn-menu {
  background: Rgba(15, 15, 25, 0.99);
  border: 2px solid var(--green);
  border-radius: 8px;
  width: 340px;
  max-width: 90dvw;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  pointer-events: all;
  box-shadow: 0 15px 50px Rgba(0,0,0,0.9);
  @include gpu-layer;
  margin-bottom: 12px;

  .spawn-header {
    background: Rgba(34, 197, 94, 0.15);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

    .title { @include pixelated; font-size: 8px; color: var(--green); flex: 1; }
    .close-mini { background: none; border: none; color: white; cursor: pointer; opacity: 0.5; &:hover { opacity: 1; } }
  }

  .spawn-scroll-area {
    padding: 16px;
    min-height: 0;
    overflow-y: auto;
    flex: 1;
    @include smooth-scroll;
  }
}

.spawn-trigger {
  border: 2px solid var(--green);
  color: var(--green);
  &:hover, &.active { background: var(--green); color: $black; text-shadow: none; }
}
</style>
