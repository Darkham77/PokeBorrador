<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useProfileStore } from '@/stores/player/profile'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import { validateTrainerName } from '@/logic/validation/schemas'
import { getDaysUntilIdentityChange, canChangeIdentity } from '@/logic/player/identityCooldown'
import type { GenderId } from '@/types/system/game'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const uiStore = useUIStore()
const profileStore = useProfileStore()
const gameStore = useGameStore()
const authStore = useAuthStore()

const newUsername = ref('')
const isRenaming = ref(false)
const selectedGender = ref<GenderId>('h')

const SCALE_GENDER_CLICK = 0.85

const setGender = (newGender: GenderId, event: MouseEvent) => {
  gsap.fromTo(event.currentTarget, 
    { scale: SCALE_GENDER_CLICK },
    { scale: 1, duration: 0.3, ease: 'back.out(2)' }
  )
  selectedGender.value = newGender
}

const syncState = () => {
  newUsername.value = profileStore.profileData.username || gameStore.state.trainer || ''
  selectedGender.value = gameStore.state.gender || 'h'
}

onMounted(() => {
  syncState()
})

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    syncState()
  }
})

watch(() => gameStore.state.gender, (newGender) => {
  if (newGender) {
    selectedGender.value = newGender
  }
})

const daysUntilRename = computed(() => {
  return getDaysUntilIdentityChange(gameStore.state.last_renamed_at || profileStore.profileData.last_renamed_at)
})

const canRename = computed(() => canChangeIdentity(gameStore.state.last_renamed_at || profileStore.profileData.last_renamed_at))

const nameChanged = computed(() => {
  const targetName = newUsername.value.trim()
  const currentName = profileStore.profileData.username || gameStore.state.trainer
  return targetName !== currentName
})

const submitRename = async () => {
  const targetName = newUsername.value.trim()
  const genderChanged = selectedGender.value !== gameStore.state.gender

  const validation = validateTrainerName(targetName)
  if (!validation.success) {
    const errorMsg = validation.issues[0]?.message || 'El nombre debe tener entre 3 y 15 caracteres.'
    uiStore.notify(errorMsg, '⚠️')
    return
  }

  if (!nameChanged.value && !genderChanged) {
    uiStore.notify('No se detectaron cambios.', '⚠️')
    return
  }

  if (!canRename.value) {
    uiStore.notify(`Faltan ${daysUntilRename.value} días para poder cambiar de identidad.`, '⏳')
    return
  }

  isRenaming.value = true
  
  try {
    const isLocal = authStore.sessionMode === 'offline' || authStore.user?.id.startsWith('local_')
    const nowStr = Temporal.Now.instant().toString()

    if (nameChanged.value) {
      if (!isLocal) {
        const res = await gameStore.db.rpc('change_username', { new_username: targetName })
        if (res.error) {
          const errorMsg = typeof res.error === 'string' ? res.error : ((res.error as { message: string } | null)?.message || 'Error al cambiar el nombre')
          uiStore.notify(errorMsg, '⚠️')
          isRenaming.value = false
          return
        }
      }
      gameStore.state.trainer = targetName
    }

    if (genderChanged) {
      gameStore.state.gender = selectedGender.value
    }

    gameStore.state.last_renamed_at = nowStr
    profileStore.updateProfile({ 
      ...(nameChanged.value ? { username: targetName } : {}),
      gender: selectedGender.value,
      last_renamed_at: nowStr 
    })
    
    if (authStore.user?.id.startsWith('local_')) {
      const localUserStr = localStorage.getItem('pokevicio_local_user')
      if (localUserStr) {
        interface LocalUser {
          user_metadata?: {
            username?: string;
            gender?: string;
            last_renamed_at?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }
        const lu = JSON.parse(localUserStr) as LocalUser;
        if (!lu.user_metadata) lu.user_metadata = {};
        if (nameChanged.value) lu.user_metadata.username = targetName;
        lu.user_metadata.gender = selectedGender.value;
        lu.user_metadata.last_renamed_at = nowStr;
        localStorage.setItem('pokevicio_local_user', JSON.stringify(lu));
      } else {
        localStorage.setItem('pokevicio_local_user', JSON.stringify({
          id: authStore.user.id,
          email: authStore.user?.email || 'entrenador@local',
          user_metadata: { 
            username: targetName,
            gender: selectedGender.value,
            last_renamed_at: nowStr 
          }
        }))
      }
    }

    gameStore.save(false)
    if (authStore.user) {
      profileStore.syncProfileFromAuth(authStore.user, gameStore.state)
    }

    uiStore.notify('Cambios guardados con éxito.', '✨')
    emit('close')
  } catch (_e: unknown) {
    uiStore.notify('Error al guardar los cambios.', '⚠️')
  } finally {
    isRenaming.value = false
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    title="CAMBIAR NOMBRE"
    title-color="var(--yellow)"
    header-background="rgba(26, 28, 46, 1)"
    max-width="400px"
    variant="retro"
    @close="emit('close')"
  >
    <div class="rename-modal-container">
      <div class="info-box">
        <p class="desc-text">
          Ingresa tu nuevo nombre de entrenador. Recuerda que solo se permite un cambio cada 30 días.
        </p>
      </div>

      <div class="input-section">
        <div class="input-row">
          <input 
            v-model="newUsername"
            type="text" 
            class="vicio-input"
            :disabled="!canRename || isRenaming"
            placeholder="Ej: Red..."
            maxlength="15"
          >
        </div>

        <div class="gender-selection-row">
          <button
            class="gender-select-btn male"
            :class="{ active: selectedGender === 'h' }"
            @click.prevent.stop="setGender('h', $event)"
          >
            <span class="emoji">♂️</span> MASCULINO
          </button>
          <button
            class="gender-select-btn female"
            :class="{ active: selectedGender === 'm' }"
            @click.prevent.stop="setGender('m', $event)"
          >
            <span class="emoji">♀️</span> FEMENINO
          </button>
        </div>
        
        <div
          v-if="!canRename"
          class="cooldown-notice"
        >
          <span class="emoji">⏳</span> Cooldown activo: Faltan <span class="days-highlight">{{ daysUntilRename }} días</span>.
        </div>
      </div>

      <div class="action-buttons">
        <button 
          class="btn-vicio-secondary cancel-btn"
          :disabled="isRenaming"
          @click="emit('close')"
        >
          CANCELAR
        </button>
        <button 
          class="btn-vicio-primary apply-btn"
          :disabled="isRenaming || !newUsername.trim() || (nameChanged && !canRename)"
          @click="submitRename"
        >
          {{ isRenaming ? 'GUARDANDO...' : 'CONFIRMAR' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.rename-modal-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-box {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.desc-text {
  font-size: 11px;
  color: Rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  @include pixelated;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .input-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;

    .vicio-input {
      flex: 1;
      background: Rgba(0, 0, 0, 0.4);
      border: 2px solid var(--blue);
      border-radius: 6px;
      color: var(--white);
      padding: 10px 14px;
      font-family: var(--font-pixel);
      font-size: 14px;
      outline: none;
      text-align: center;
      

      &:focus {
        border-color: var(--yellow);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .gender-selection-row {
    @include gender-select-buttons(6px);
  }
}



.cooldown-notice {
  font-size: 10px;
  color: var(--red);
  text-align: center;
  background: Rgba(239, 68, 68, 0.1);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid Rgba(239, 68, 68, 0.2);
  @include pixelated;

  .days-highlight {
    font-weight: bold;
    color: var(--yellow);
  }
}

.action-buttons {
  display: flex;
  gap: 12px;

  button {
    flex: 1;
    padding: 12px;
    font-size: 10px;
    @include pixelated;
  }
}
</style>
