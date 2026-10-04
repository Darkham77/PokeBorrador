<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'
import EggSprite from '@/components/common/EggSprite.vue'
import { NPC_EGG_TINT } from '@/logic/constants/gameplay'

const battleStore = useBattleStore()
const gameStore = useGameStore()
const logContainer = ref<HTMLDivElement | null>(null)
const logInner = ref<HTMLDivElement | null>(null)

const logs = computed(() => battleStore.battleLogs)

const playerClassColor = computed(() => {
  const pClass = gameStore.state.playerClass || 'entrenador'
  return (PLAYER_CLASSES as Record<string, { color: string }>)[pClass]?.color || '#3b82f6' // open-record: Contenedor JSON dinámico de clave-valor genérico
})

const scrollToBottom = async (isInstant = false) => {
  await nextTick()
  if (!logContainer.value) return
  
  if (isInstant) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  } else {
    gsap.killTweensOf(logContainer.value)
    gsap.to(logContainer.value, {
      scrollTop: logContainer.value.scrollHeight,
      duration: 0.4,
      ease: 'power2.out'
    })
  }
}

const lastLogId = ref<string | number | null>(null)

watch(logs, (newVal) => {
  scrollToBottom()
  
  if (newVal && newVal.length > 0) {
    const lastLog = newVal[newVal.length - 1]
    if (lastLog && lastLog.id !== lastLogId.value) {
      const isNew = lastLogId.value !== null
      lastLogId.value = lastLog.id
      
      if (isNew) {
        nextTick(() => {
          const entries = logContainer.value?.querySelectorAll('.log-entry')
          if (entries && entries.length > 0) {
            const lastEntry = entries[entries.length - 1] as HTMLElement
            gsap.killTweensOf(lastEntry)
const GSAP_LOG_ENTRY_INITIAL_X_OFFSET_PX = -20

            gsap.fromTo(lastEntry, 
              { opacity: 0, x: GSAP_LOG_ENTRY_INITIAL_X_OFFSET_PX, filter: 'Blur(4px)' }, 
              { opacity: 1, x: 0, filter: 'Blur(0px)', duration: 0.5, ease: 'back.out(1.2)' }
            )
          }
        })
      }
    }
  } else {
    lastLogId.value = null
  }
}, { deep: true, immediate: true })

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement
  console.error(`[BattleLog] Fallo al cargar sprite del log de combate: ${target.src}`)
  target.style.display = 'none'
}

onMounted(() => {
  scrollToBottom(true)
  if (logInner.value) {
    const observer = new ResizeObserver(() => scrollToBottom())
    observer.observe(logInner.value)
  }
})
</script>

<template>
  <div
    ref="logContainer"
    class="battle-log custom-scrollbar-vicio"
    :style="{ '--player-class-color': playerClassColor }"
  >
    <div
      ref="logInner"
      class="log-scroll-inner"
    >
      <div 
        v-for="(log, idx) in logs" 
        :key="log.id ? `${log.id}-${idx}` : idx" 
        class="log-entry"
        :class="[log.type, `side-${log.side}`]"
      >
        <!-- Siempre renderizamos el wrapper para mantener la alineación de la columna de texto -->
        <div
          class="log-icon-wrapper"
          :class="[log.iconType || 'empty']"
        >
          <span
            v-if="log.iconType === 'emoji'"
            class="log-emoji"
          >{{ log.icon }}</span>
          <EggSprite
            v-else-if="log.iconType === 'egg' || log.iconType === 'npc_egg'"
            size="26"
            :tint="log.iconType === 'npc_egg' ? NPC_EGG_TINT : undefined"
          />
          <img
            v-else-if="log.icon"
            :src="log.icon"
            alt="Icono de registro"
            class="log-icon"
            loading="lazy"
            @error="handleImgError"
          >
        </div>
        <span class="log-text">
          <!-- fallow-ignore-next-line security-sink -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="log.msg" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-log {
  @include smooth-scroll;
  @include gpu-layer;

  display: block;
  width: 100%;
  min-height: 0;
  padding: 4px 10px;
  flex: 1;
  overflow-y: auto !important;

  /* Estilos de Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    border-radius: 3px;
    background: Rgb(0 0 0 / 20%);
  }
  &::-webkit-scrollbar-thumb {
    border: 1px solid Rgb(0 0 0 / 20%);
    border-radius: 3px;
    background: Rgb(255 255 255 / 15%);
    
    &:hover {
      background: Rgb(255 255 255 / 25%);
    }
  }

  .log-scroll-inner {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
  }

  @media (width <= 560px) {
    padding: 10px !important;
    .log-scroll-inner {
      gap: 4px !important;
    }
  }
}

.log-entry {
  @include pixelated;

  display: flex;
  align-items: center;
  gap: 8px; 
  min-height: 28px !important;
  border-radius: 4px 0 0 4px;
  color: Rgb(255 255 255 / 90%);
  font-family: var(--font-pixel), monospace;
  font-size: 10px;
  line-height: 1.4;
  padding-left: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid Rgb(255 255 255 / 5%);
  will-change: transform, opacity;

  &:hover {
    background-color: Rgb(255 255 255 / 3%) !important;
  }

  .log-icon-wrapper {
    position: relative;
    z-index: var(--z-low);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 42px; // Ancho base estándar para TODOS los casos
    height: 32px;
    flex-shrink: 0;

    // Estilos específicos para AVATAR (Entrenador)
    &.trainer {
      .log-icon { 
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 42px !important;
        max-width: none !important;
        height: 42px !important;
        max-height: none !important;
        border: none !important;
        border-radius: 0;
        background: transparent !important;
        transform: Translate(-50%, -50%);
        object-fit: contain;
        will-change: transform, filter, opacity;
        filter: Drop-Shadow(0 4px 8px Rgb(0 0 0 / 40%));
      }
    }

    // Estilos para el Avatar del Jugador
    &.player_avatar {
      .log-icon { 
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 28px !important;
        max-width: none !important;
        height: 28px !important;
        max-height: none !important;
        border: 1px solid Rgb(255 255 255 / 10%);
        border-radius: 4px;
        background-color: var(--player-class-color, Rgb(0 0 0 / 20%)) !important;
        transform: Translate(-50%, -50%);
        object-fit: cover;
        will-change: transform, filter, opacity;
        filter: none;
      }
    }
    
    // Estilos específicos para ITEMS (Objetos) - Reducidos a la mitad
    &.item {
      .log-icon {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        width: 28px !important;
        height: 28px !important;
        transform: none;
      }
    }

    &.egg,
    &.npc_egg {
      display: flex;
      justify-content: center;
      align-items: center;
      filter: Drop-Shadow(0 2px 5px Rgb(0 0 0 / 45%));
    }
    
    &.empty {
      opacity: 0;
    }
  }

  .log-icon {
    @include pixelated;

    position: absolute;
    top: 50%;
    left: 50%;
    width: 56px !important;
    max-width: none !important; 
    height: 56px !important;
    max-height: none !important;
    transform: Translate(-50%, -50%);
    object-fit: contain;
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 4px 8px Rgb(0 0 0 / 40%));
  }

  .log-emoji {
    @include pixelated;
    
    // Centrado absoluto con prioridad máxima - Forzamos minúscula para asegurar compatibilidad
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif !important;
    font-size: 16px; // Reducido para evitar desbordes
    line-height: 1;
    transform: Translate(-50%, -50%);
    will-change: transform, filter, opacity;
    filter: Drop-Shadow(0 2px 4px Rgb(0 0 0 / 40%));
  }

  .log-text {
    position: relative;
    z-index: var(--z-base);
    flex: 1;
  }

  @media (width <= 560px) {
    gap: 8px !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 2px 0 !important;
    font-size: 8px !important;
    line-height: 1.3 !important;
    border-bottom: 1px solid Rgb(255 255 255 / 3%) !important;

    .log-icon-wrapper {
      width: 28px !important;
      height: 28px !important;
    }
    
    .log-icon:not(.trainer .log-icon, .item .log-icon) {
      width: 38px !important;
      height: 38px !important;
    }
    
    .trainer .log-icon, .item .log-icon {
      width: 18px !important;
      height: 18px !important;
    }
  }
}

.log-entry:last-child {
  border-bottom: none;
}

/* Entry animations handled by GSAP */

/* Side-based backgrounds (Only 2 bands) */
.log-entry.side-player {
  background: Linear-Gradient(90deg, Rgb(0 255 127 / 15%) 0%, transparent 80%);
  border-left: 2px solid Rgb(0 255 127 / 40%);
}

.log-entry.side-enemy {
  background: Linear-Gradient(90deg, Rgb(255 65 54 / 15%) 0%, transparent 80%);
  border-left: 2px solid Rgb(255 65 54 / 40%);
}

/* Compatibility with new types (Text only overrides) */
:deep(.log-info) { color: var(--yellow); font-weight: 500; }

:deep(.log-player) { color: Rgb(0 255 127 / 100%); }

:deep(.log-enemy) { color: Rgb(255 65 54 / 100%); }

:deep(.log-catch) { color: Rgb(177 13 201 / 100%); }

/* Semantic types */
:deep(.log-damage) { color: Rgb(255 65 54 / 100%); }

:deep(.log-heal) { color: Rgb(0 255 127 / 100%); }

:deep(.log-status) { color: Rgb(177 13 201 / 100%); }

/* Recompensas Unificadas de Fin de Combate */
:deep(.reward-entry-unified) {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  line-height: 1.35;
}

:deep(.reward-line-primary) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  color: Rgb(255 255 255 / 95%);

  strong {
    color: #fff;
    font-weight: 700;
  }
}

:deep(.reward-line-secondary) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px;
  font-size: 0.92em;
  opacity: 0.9;
}

:deep(.reward-lvl) {
  color: var(--yellow, #ffd700);
  font-weight: 600;
}

:deep(.reward-exp) {
  color: #38ef7d;
  font-weight: 500;
}

:deep(.reward-evs) {
  color: #63b3ed;
}

:deep(.reward-friendship) {
  color: #fb7185;
  font-weight: 500;
}
</style>
