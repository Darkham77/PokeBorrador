<script setup lang="ts">
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  selectedMinigame: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'action', protocol: string): void
}>()
</script>

<template>
  <div class="creator-footer">
    <div class="action-buttons">
      <PVTooltip
        title="Atrapar ahora"
        description="Añade el Pokémon directamente a tu equipo o PC."
      >
        <button
          id="debug-btn-catch"
          class="btn-vicio-primary"
          @click.stop="emit('action', 'catch')"
        >
          ATRAPAR
        </button>
      </PVTooltip>
        
      <PVTooltip
        title="Iniciar minijuego de captura"
        description="Inicia la secuencia y el minijuego de captura seleccionado."
      >
        <button
          id="debug-creator-minigame-action-btn"
          class="btn-vicio-success"
          @click.stop="emit('action', selectedMinigame + '_minigame')"
        >
          MINIJUEGO
        </button>
      </PVTooltip>
        
      <PVTooltip
        title="Añadir huevo listo (1 paso)"
        description="Genera un huevo en tu mochila que eclosionará al dar el siguiente paso."
      >
        <button
          id="debug-creator-walk-egg-btn"
          class="btn-vicio-primary secondary"
          @click.stop="emit('action', 'egg_silent')"
        >
          CAMINAR HUEVO
        </button>
      </PVTooltip>
        
      <PVTooltip
        title="Añadir huevo con animación"
        description="Genera un huevo que iniciará la secuencia de eclosión."
      >
        <button
          id="debug-creator-anim-egg-btn"
          class="btn-vicio-primary secondary"
          @click.stop="emit('action', 'egg_anim')"
        >
          HUEVO ANIM.
        </button>
      </PVTooltip>

      <PVTooltip
        title="Añadir huevo al almacén"
        description="Genera un huevo directamente en el almacén de la guardería (sin tener que caminar)."
      >
        <button
          id="debug-creator-warehouse-egg-btn"
          class="btn-vicio-primary secondary"
          @click.stop="emit('action', 'egg_warehouse')"
        >
          HUEVO ALMACÉN
        </button>
      </PVTooltip>
        
      <PVTooltip
        title="Iniciar encuentro"
        description="Genera un encuentro salvaje con este Pokémon."
      >
        <button
          id="debug-btn-encounter"
          class="btn-vicio-danger"
          @click.stop="emit('action', 'encounter')"
        >
          ENCONTRAR
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-creator.scss"></style>
