<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useProfileStore } from '@/stores/profile'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import BaseModal from '@/components/common/BaseModal.vue'
import { gsap } from 'gsap'

interface Props {
  show?: boolean
}

withDefaults(defineProps<Props>(), {
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

const toggleGender = (event: MouseEvent) => {
  const currentGender = gameStore.state.gender || 'h'
  const newGender = currentGender === 'h' ? 'm' : 'h'
  
  gsap.fromTo(event.currentTarget, 
    { scale: 0.85 },
    { scale: 1, duration: 0.3, ease: 'back.out(2)' }
  )
  
  gameStore.updateState({ gender: newGender })
  gameStore.save(false)
  if (authStore.user) {
    profileStore.syncProfileFromAuth(authStore.user, gameStore.state)
  }
  uiStore.notify(`Género cambiado a ${newGender === 'm' ? 'Mujer' : 'Hombre'}`, '✨')
}

onMounted(() => {
  newUsername.value = profileStore.profileData.username || gameStore.state.trainer || ''
})

const daysUntilRename = computed(() => {
  const lastRenameStr = profileStore.profileData.last_renamed_at
  if (!lastRenameStr) return 0
  try {
    const lastRename = Temporal.Instant.from(lastRenameStr)
    const now = Temporal.Now.instant()
    const diff = now.since(lastRename, { largestUnit: 'hours' })
    const daysPassed = Math.floor(diff.hours / 24)
    return Math.max(0, 30 - daysPassed)
  } catch (_e) {
    return 0
  }
})

const canRename = computed(() => daysUntilRename.value === 0)

const submitRename = async () => {
  if (!canRename.value) {
    uiStore.notify(`Faltan ${daysUntilRename.value} días para poder cambiar de nombre.`, '⏳')
    return
  }
  
  const targetName = newUsername.value.trim()
  if (!targetName || targetName.length < 3 || targetName.length > 15) {
    uiStore.notify('El nombre debe tener entre 3 y 15 caracteres.', '⚠️')
    return
  }
  
  const currentName = profileStore.profileData.username || gameStore.state.trainer
  if (targetName === currentName) {
    uiStore.notify('El nombre es idéntico al actual.', '⚠️')
    return
  }

  isRenaming.value = true
  
  try {
    const isLocal = authStore.sessionMode === 'offline' || authStore.user?.id.startsWith('local_')
    
    if (!isLocal) {
      const res = await gameStore.db.rpc('change_username', { new_username: targetName })
      if (res.error) {
        const errorMsg = typeof res.error === 'string' ? res.error : ((res.error as { message: string } | null)?.message || 'Error al cambiar el nombre')
        uiStore.notify(errorMsg, '⚠️')
        isRenaming.value = false
        return
      }
    }

    // Bloque de éxito común para local y remoto
    uiStore.notify('¡Nombre cambiado con éxito!', '✨')
    gameStore.state.trainer = targetName
    gameStore.save(false)
    profileStore.updateProfile({ 
      username: targetName, 
      last_renamed_at: Temporal.Now.instant().toString() 
    })
    
    if (authStore.user?.id.startsWith('local_')) {
      const localUserStr = localStorage.getItem('pokevicio_local_user')
      if (localUserStr) {
        const lu = JSON.parse(localUserStr)
        if (!lu.user_metadata) lu.user_metadata = {}
        lu.user_metadata.username = targetName
        localStorage.setItem('pokevicio_local_user', JSON.stringify(lu))
      } else {
        localStorage.setItem('pokevicio_local_user', JSON.stringify({
          id: authStore.user.id,
          email: authStore.user?.email || 'entrenador@local',
          user_metadata: { username: targetName }
        }))
      }
    }
    emit('close')
  } catch (_e: unknown) {
    uiStore.notify('Error al cambiar el nombre.', '⚠️')
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
          <button
            class="gender-toggle-btn"
            :class="[gameStore.state.gender === 'm' ? 'female' : 'male']"
            title="Cambiar Género"
            @click.prevent.stop="toggleGender"
          >
            {{ gameStore.state.gender === 'm' ? '♀️' : '♂️' }}
          </button>
        </div>
        
        <div
          v-if="!canRename"
          class="cooldown-notice"
        >
          ⏳ Cooldown activo: Faltan <span class="days-highlight">{{ daysUntilRename }} días</span>.
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
          :disabled="!canRename || isRenaming || !newUsername.trim()"
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

  .gender-toggle-btn {
    background: Rgba(0, 0, 0, 0.4);
    border: 2px solid var(--blue);
    border-radius: 6px;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 44px;
    will-change: transform;
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--yellow);
    }

    &.male {
      color: Rgba(59, 139, 255, 1);
      text-shadow: 0 0 8px Rgba(59, 139, 255, 0.4);
    }
    &.female {
      color: Rgba(255, 110, 255, 1);
      text-shadow: 0 0 8px Rgba(255, 110, 255, 0.4);
    }
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
