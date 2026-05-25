<script setup lang="ts">
import ShowdownStatusTooltip from './ShowdownStatusTooltip.vue';
import type { SandboxPokemon } from './ShowdownHudCard.vue';

const props = defineProps<{
  team: SandboxPokemon[];
}>();

// Obtiene de forma segura un miembro del equipo por su índice
const getMember = (index: number): SandboxPokemon | undefined => {
  return props.team[index];
};
</script>

<template>
  <div class="party-tracker">
    <div
      v-for="idx in 6"
      :key="`ball-${idx}`"
      class="party-ball-slot"
    >
      <!-- Slot vacío (sin Pokémon cargado en ese índice) -->
      <div
        v-if="idx - 1 >= team.length || !getMember(idx - 1)"
        class="ball-pixel ball-empty"
        title="Ranura Vacía"
      />
      <!-- Pokémon debilitado -->
      <ShowdownStatusTooltip
        v-else-if="getMember(idx - 1)?.hp === 0 || getMember(idx - 1)?.status === 'fnt'"
        status-id="fnt"
        :pokemon-name="getMember(idx - 1)?.name || ''"
        :base-stored-stats="getMember(idx - 1)?.baseStoredStats"
        :stored-stats="getMember(idx - 1)?.storedStats"
        :boosts="getMember(idx - 1)?.boosts"
        :status-state="getMember(idx - 1)?.statusState"
      >
        <div class="ball-pixel ball-fainted">
          <span class="cross-faint">×</span>
        </div>
      </ShowdownStatusTooltip>
      <!-- Pokémon con estado alterado -->
      <ShowdownStatusTooltip
        v-else-if="getMember(idx - 1)?.status"
        :status-id="getMember(idx - 1)!.status!"
        :pokemon-name="getMember(idx - 1)?.name || ''"
        :base-stored-stats="getMember(idx - 1)?.baseStoredStats"
        :stored-stats="getMember(idx - 1)?.storedStats"
        :boosts="getMember(idx - 1)?.boosts"
        :status-state="getMember(idx - 1)?.statusState"
      >
        <div
          class="ball-pixel ball-status"
          :class="`ball-status-${getMember(idx - 1)?.status?.toLowerCase()}`"
        />
      </ShowdownStatusTooltip>
      <!-- Pokémon vivo y saludable -->
      <ShowdownStatusTooltip
        v-else
        status-id=""
        :pokemon-name="getMember(idx - 1)?.name || ''"
        :base-stored-stats="getMember(idx - 1)?.baseStoredStats"
        :stored-stats="getMember(idx - 1)?.storedStats"
        :boosts="getMember(idx - 1)?.boosts"
        :status-state="getMember(idx - 1)?.statusState"
      >
        <div class="ball-pixel ball-healthy" />
      </ShowdownStatusTooltip>
    </div>
  </div>
</template>

<style scoped lang="scss">
.party-tracker {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}

.party-ball-slot {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ball-pixel {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.8);
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);

  /* Pokéball clásica viva */
  &.ball-healthy {
    background: linear-gradient(180deg, #ff3b30 50%, #ffffff 50%);
    
    &::after {
      content: "";
      position: absolute;
      width: 4px;
      height: 4px;
      background: #fff;
      border: 1px solid #000;
      border-radius: 50%;
      top: 3px;
      left: 3px;
    }
  }

  /* Pokéball debilitada */
  &.ball-fainted {
    background: linear-gradient(180deg, #8e8e93 50%, #48484a 50%);
    opacity: 0.5;
    display: flex;
    align-items: center;
    justify-content: center;

    .cross-faint {
      font-size: 8px;
      color: #ff3b30;
      font-weight: bold;
      line-height: 1;
      position: relative;
      top: -1px;
    }
  }

  /* Ranura vacía (sin Pokémon asignado) */
  &.ball-empty {
    background: #1c1c1e;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    box-shadow: none;
  }

  /* Pokéballs con estado alterado */
  &.ball-status {
    &::after {
      content: "";
      position: absolute;
      width: 4px;
      height: 4px;
      background: #fff;
      border: 1px solid #000;
      border-radius: 50%;
      top: 3px;
      left: 3px;
    }

    &-psn, &-tox { background: linear-gradient(180deg, #bf5af2 50%, #ffffff 50%); }
    &-par { background: linear-gradient(180deg, #ffd60a 50%, #ffffff 50%); }
    &-brn { background: linear-gradient(180deg, #ff9f0a 50%, #ffffff 50%); }
    &-slp { background: linear-gradient(180deg, #8e8e93 50%, #ffffff 50%); }
    &-frz { background: linear-gradient(180deg, #64d2ff 50%, #ffffff 50%); }
  }
}
</style>
