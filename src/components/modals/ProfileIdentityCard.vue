<script setup lang="ts">
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'

defineProps<{
  gs: {
    playerClass?: string | null
    trainerLevel?: number
    avatar_style?: string | null
    gender?: string | null
    nick_style?: string | null
  }
  displayUsername: string
  email: string
  classStore: {
    playerClass?: string | null
    currentClassDef?: {
      name: string
      icon: string
    } | null
  }
  faction: string | null
}>()

const emit = defineEmits<{
  (e: 'edit-profile'): void
  (e: 'avatar-enter', evt: MouseEvent): void
  (e: 'avatar-leave', evt: MouseEvent): void
  (e: 'open-rename'): void
  (e: 'open-class-modal'): void
  (e: 'faction-choice'): void
}>()
</script>

<template>
  <div class="profile-identity-card">
    <div 
      class="avatar-wrap"
      @click.stop="emit('edit-profile')"
      @mouseenter="e => emit('avatar-enter', e)"
      @mouseleave="e => emit('avatar-leave', e)"
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
        <div class="value-wrap">
          <span
            v-gsap-nick="gs.nick_style || 'normal'"
            :class="gs.nick_style || 'normal'"
            class="value name-val"
          >
            {{ displayUsername }}
            <span
              class="gender-symbol"
              :class="gs.gender === 'm' ? 'female' : 'male'"
            >
              {{ gs.gender === 'm' ? '♀' : '♂' }}
            </span>
          </span>
        </div>
        <button
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
            :class="faction || 'none'"
          >
            {{ faction ? faction.toUpperCase() : 'SIN FACCIÓN' }}
          </span>
        </div>
        <button
          class="row-action-btn"
          @click.prevent.stop="emit('faction-choice')"
        >
          {{ faction ? 'CAMBIAR' : 'UNIRSE' }}
        </button>
      </div>

      <!-- Acciones de Gestión -->
      <div class="identity-actions-row">
        <button
          class="cosmetics-btn"
          @click.stop="emit('edit-profile')"
        >
          <i class="fas fa-tshirt" /> COSMÉTICOS
        </button>
        <button
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
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.profile-identity-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 0;
  background: transparent;
  border: none;
}

.avatar-wrap {
  cursor: pointer;
  margin-bottom: 12px;
}

.identity-details-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .label {
      font-size: 8px;
      color: rgba(255, 255, 255, 0.4);
      @include pixelated;
    }

    .value-wrap {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .value {
      font-size: 10px;
      color: var(--white);
      @include pixelated;

      &.class-val {
        color: var(--yellow);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      &.faction-val {
        &.none { color: #888; }
      }
    }

    .row-action-btn {
      font-size: 8px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: var(--yellow);
      cursor: pointer;
      @include pixelated;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--yellow);
      }
    }

    .row-spacer {
      width: 48px;
    }
  }

  .identity-actions-row {
    display: flex;
    gap: 8px;
    width: 100%;
    margin-top: 8px;

    .cosmetics-btn {
      flex: 1;
      @include btn-vicio('primary', 'sm', true);
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .class-mgmt-btn {
      flex: 1;
      @include btn-vicio('secondary', 'sm', true);
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
  }
}
</style>
