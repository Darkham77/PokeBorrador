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
          <span class="emoji">✨</span>
          <span class="title">BATTLE EFFECTS &amp; AUDIO</span>
          <button
            id="battle-debug-effects-close-btn"
            class="close-mini"
            @click.stop="isEffectsOpen = false"
          >
            <span class="emoji">✕</span>
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
          <span class="emoji">⌛</span>
          <span class="title">TIME &amp; WEATHER CONTROL</span>
          <button
            class="close-mini"
            @click.stop="isTimeOpen = false"
          >
            <span class="emoji">✕</span>
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
          <span class="emoji">🎲</span>
          <span class="title">SPAWN &amp; MINIGAMES CONDITIONS</span>
          <button
            id="battle-debug-spawn-close-btn"
            class="close-mini"
            @click.stop="isSpawnOpen = false"
          >
            <span class="emoji">✕</span>
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
          <span class="emoji">🕹️</span>
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
          <span class="emoji">✨</span>
          <span class="label">EFECTOS</span>
        </button>
      </PVTooltip>

      <PVTooltip title="Time, Season & Weather">
        <button
          class="time-trigger"
          :class="{ active: isTimeOpen }"
          @click.stop="isTimeOpen = !isTimeOpen; isOpen = false; isEffectsOpen = false; isSpawnOpen = false"
        >
          <span class="emoji">⌛</span>
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
          <span class="emoji">🎲</span>
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
  @include pixelated;

  position: relative;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-start;
  width: 100%;
  min-height: 0; 
  padding: 0;
  pointer-events: none;
  
  &.is-open { pointer-events: all; }
}

.debug-triggers-row {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  pointer-events: all;
}

%debug-trigger-base {
  @include btn-vicio('info', 'xs', true);
  @include pixelated;

  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 14px;
  border-radius: 6px;
  background: rgb(20 20 30 / 95%);
  font-size: 7px;
  text-shadow: 1px 1px 0 $black;
  box-shadow: 0 4px 15px rgb(0 0 0 / 60%);
}

.debug-trigger {
  @extend %debug-trigger-base;

  border: 2px solid var(--yellow);
  color: var(--yellow);
  &:hover, &.active { background: var(--yellow); color: $black; text-shadow: none; }
}

.effects-trigger {
  @extend %debug-trigger-base;

  border: 2px solid var(--purple);
  color: var(--purple);
  &:hover, &.active { background: var(--purple); color: white; }
}

.effects-menu {
  @include gpu-layer;

  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: 90dvw;
  max-height: 500px;
  border: 2px solid var(--purple);
  border-radius: 8px;
  background: rgb(15 15 25 / 99%);
  overflow: hidden auto;
  pointer-events: all;
  box-shadow: 0 15px 50px rgb(0 0 0 / 90%);
  -webkit-will-change: transform, opacity;
  will-change: transform, opacity;
  margin-bottom: 12px;

  .effects-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: rgb(124 58 237 / 15%);
    border-bottom: 1px solid rgb(255 255 255 / 10%);

    .title { @include pixelated; color: var(--purple); font-size: 8px; flex: 1; }
    .close-mini { border: none; background: none; color: white; opacity: 0.5; cursor: pointer; &:hover { opacity: 1; } }
  }

  .effects-scroll-area {
    @include smooth-scroll;

    min-height: 0;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }
}

.time-menu {
  @include gpu-layer;

  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: 90dvw;
  max-height: 500px;
  border: 2px solid var(--blue);
  border-radius: 8px;
  background: rgb(15 15 25 / 99%);
  overflow: hidden auto;
  pointer-events: all;
  box-shadow: 0 15px 50px rgb(0 0 0 / 90%);
  margin-bottom: 12px;

  .time-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: rgb(59 130 246 / 15%);
    border-bottom: 1px solid rgb(255 255 255 / 10%);

    .title { @include pixelated; color: var(--blue); font-size: 8px; flex: 1; }
    .close-mini { border: none; background: none; color: white; opacity: 0.5; cursor: pointer; &:hover { opacity: 1; } }
  }

  .time-scroll-area {
    @include smooth-scroll;

    min-height: 0;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }
}

.time-trigger {
  @extend %debug-trigger-base;

  border: 2px solid var(--blue);
  color: var(--blue);
  &:hover, &.active { background: var(--blue); color: white; text-shadow: none; }
}

.spawn-menu {
  @include gpu-layer;

  display: flex;
  flex-direction: column;
  width: 340px;
  max-width: 90dvw;
  max-height: 500px;
  border: 2px solid var(--green);
  border-radius: 8px;
  background: rgb(15 15 25 / 99%);
  overflow: hidden auto;
  pointer-events: all;
  box-shadow: 0 15px 50px rgb(0 0 0 / 90%);
  margin-bottom: 12px;

  .spawn-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: rgb(34 197 94 / 15%);
    border-bottom: 1px solid rgb(255 255 255 / 10%);

    .title { @include pixelated; color: var(--green); font-size: 8px; flex: 1; }
    .close-mini { border: none; background: none; color: white; opacity: 0.5; cursor: pointer; &:hover { opacity: 1; } }
  }

  .spawn-scroll-area {
    @include smooth-scroll;

    min-height: 0;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
  }
}

.spawn-trigger {
  @extend %debug-trigger-base;

  border: 2px solid var(--green);
  color: var(--green);
  &:hover, &.active { background: var(--green); color: $black; text-shadow: none; }
}
</style>
