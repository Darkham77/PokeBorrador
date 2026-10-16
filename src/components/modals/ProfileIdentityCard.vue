<script setup lang="ts">
import { computed } from 'vue';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import PVGenderBadge from '@/components/common/PVGenderBadge.vue';
import { isFactionId, type FactionId } from '@/types/system/game';

const FACTION_DISPLAY_NAMES: Record<FactionId, string> = {
  union: 'EQUIPO UNIÓN',
  poder: 'EQUIPO PODER'
};

const props = defineProps<{
  gs: {
    playerClass?: string | null;
    trainerLevel?: number;
    avatar_style?: string | null;
    gender?: string | null;
    nick_style?: string | null;
  };
  displayUsername: string;
  email: string;
  classStore: {
    playerClass?: string | null;
    currentClassDef?: {
      name: string;
      icon: string;
    } | null;
  };
  faction: FactionId | string | null;
}>();

const displayFaction = computed(() => {
  if (props.faction && isFactionId(props.faction)) {
    return FACTION_DISPLAY_NAMES[props.faction];
  }
  return 'SIN FACCIÓN';
});

const emit = defineEmits<{
  (e: 'edit-profile'): void;
  (e: 'avatar-enter', evt: MouseEvent): void;
  (e: 'avatar-leave', evt: MouseEvent): void;
  (e: 'open-rename'): void;
  (e: 'open-class-modal'): void;
  (e: 'faction-choice'): void;
}>();
</script>

<template>
  <div class="profile-identity-card">
    <div
      id="profile-identity-card-div-1"
      role="button"
      tabindex="0"
      class="avatar-wrap"
      @click.stop="emit('edit-profile')"
      @mouseenter="(e) => emit('avatar-enter', e)"
      @mouseleave="(e) => emit('avatar-leave', e)"
    >
      <TrainerAvatar
        :player-class="gs.playerClass"
        :level="gs.trainerLevel"
        :avatar-style="gs.avatar_style || undefined"
        :size="120"
        :gender="gs.gender || 'h'"
      />
    </div>
    <div class="identity-details-card">
      <!-- Nombre -->
      <div class="detail-row name-row">
        <span class="label">NOMBRE:</span>
        <div class="value-wrap name-value-wrap">
          <span
            v-gsap-nick="gs.nick_style || 'normal'"
            :class="gs.nick_style || 'normal'"
            class="value name-val"
          >
            {{ displayUsername }}
          </span>
          <PVGenderBadge :gender="gs.gender" is-trainer size="sm" />
        </div>
        <button
          id="profile-identity-card-btn-cambiar"
          class="row-action-btn"
          @click.prevent.stop="emit('open-rename')"
        >
          CAMBIAR
        </button>
      </div>

      <!-- Email -->
      <div class="detail-row">
        <span class="label">EMAIL:</span>
        <span class="value email-val">{{ email }}</span>
        <div class="row-spacer" />
      </div>

      <!-- Clase -->
      <div class="detail-row">
        <span class="label">CLASE:</span>
        <div class="value-wrap">
          <span class="value class-val">
            <i :class="classStore.currentClassDef?.icon || 'fas fa-user-ninja'" />
            {{ classStore.currentClassDef?.name || 'ENTRENADOR' }}
          </span>
        </div>
        <button
          id="profile-identity-card-btn-cambiar-2"
          class="row-action-btn"
          @click.prevent.stop="emit('open-class-modal')"
        >
          CAMBIAR
        </button>
      </div>

      <!-- Facción -->
      <div class="detail-row">
        <span class="label">FACCIÓN:</span>
        <div class="value-wrap">
          <span
            class="value faction-val"
            :class="displayFaction !== 'SIN FACCIÓN' ? faction : 'none'"
          >
            {{ displayFaction }}
          </span>
        </div>
        <button
          id="profile-identity-card-btn-displayfaction-sin-facci-n-cam"
          class="row-action-btn"
          @click.prevent.stop="emit('faction-choice')"
        >
          {{ displayFaction !== 'SIN FACCIÓN' ? 'CAMBIAR' : 'UNIRSE' }}
        </button>
      </div>

      <!-- Acciones de Gestión -->
      <div class="identity-actions-row">
        <button
          id="profile-identity-card-btn-cosm-ticos"
          class="cosmetics-btn"
          @click.stop="emit('edit-profile')"
        >
          <i class="fas fa-tshirt" /> COSMÉTICOS
        </button>
        <button
          id="profile-identity-card-btn-gesti-n-de-clase"
          class="class-mgmt-btn"
          @click.stop="emit('open-class-modal')"
        >
          <i class="fas fa-graduation-cap" /> GESTIÓN DE CLASE
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/_mixins' as *;
@use '@/styles/core/tools' as *;

.profile-identity-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 0;
  border: none;
  background: transparent;
}

.avatar-wrap {
  cursor: pointer;
  margin-bottom: 12px;
}

.identity-details-card {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  width: 100%;

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: $radius-lg;
    background: Rgb(255 255 255 / 3%);

    .label {
      @include pixelated;

      color: Rgb(255 255 255 / 40%);
      font-size: var(--font-8);
    }

    .value-wrap {
      display: flex;
      justify-content: center;
      flex: 1;

      &.name-value-wrap {
        display: inline-flex;
        align-items: center;
        gap: $spacing-sm-alt;
      }
    }

    .value {
      @include pixelated;

      color: var(--white);
      font-size: var(--font-10);

      &.class-val {
        display: flex;
        align-items: center;
        gap: $spacing-sm-alt;
        color: var(--yellow);
      }

      &.faction-val {
        &.none {
          color: var(--slate-400);
        }
      }
    }

    .row-action-btn {
      @include pixelated;

      padding: 4px 8px;
      border: 1px solid Rgb(255 255 255 / 10%);
      border-radius: $radius-sm;
      background: Rgb(255 255 255 / 5%);
      color: var(--yellow);
      font-size: var(--font-8);
      cursor: pointer;

      &:hover {
        background: Rgb(255 255 255 / 10%);
        border-color: var(--yellow);
      }
    }

    .row-spacer {
      width: 48px;
    }
  }

  .identity-actions-row {
    display: flex;
    gap: $spacing-sm;
    width: 100%;
    margin-top: 8px;

    .cosmetics-btn {
      @include btn-vicio('primary', 'sm', true);

      display: flex;
      justify-content: center;
      align-items: center;
      gap: $spacing-xs;
      font-size: var(--font-8);
      flex: 1;
    }

    .class-mgmt-btn {
      @include btn-vicio('secondary', 'sm', true);

      display: flex;
      justify-content: center;
      align-items: center;
      gap: $spacing-xs;
      font-size: var(--font-8);
      flex: 1;
    }
  }
}
</style>
