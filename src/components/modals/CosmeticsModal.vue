<script setup lang="ts">
import { computed } from 'vue';

import BaseModal from '@/components/common/BaseModal.vue';
import AvatarFrameSelector from '@/components/modals/AvatarFrameSelector.vue';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useCosmeticsStore } from '@/stores/player/cosmetics';
import { useProfileStore } from '@/stores/player/profile';
import { useUIStore } from '@/stores/ui';

import CosmeticsNickStyleCard from './CosmeticsNickStyleCard.vue';

interface Props {
  id?: string;
  show?: boolean;
}

withDefaults(defineProps<Props>(), {
  id: 'cosmetics-modal',
  show: true
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUIStore();
const cosmeticsStore = useCosmeticsStore();
const profileStore = useProfileStore();
const gameStore = useGameStore();
const authStore = useAuthStore();

const previewUsername = computed(() => {
  const pName = profileStore.profileData.username;
  if (pName && pName !== '—' && pName.trim().length > 0) return pName;
  return (
    gameStore.state.trainer || (authStore.user?.user_metadata?.username as string) || 'Entrenador'
  );
});

const closeCosmetics = (): void => {
  emit('close');
};

import {
  isCosmeticStyleLocked,
  resolveCosmeticLockNotification,
  useCosmeticPlayerContext,
  type LockableCosmeticStyle
} from './cosmeticsFilterHelper';

const { isLocal, isAdmin, playerContext } = useCosmeticPlayerContext(authStore, gameStore);

const isNickLocked = (style: LockableCosmeticStyle): boolean => {
  return isCosmeticStyleLocked(style, playerContext.value);
};

const selectNick = (style: LockableCosmeticStyle): void => {
  const lockNotice = resolveCosmeticLockNotification(style, 'estilo', playerContext.value);
  if (lockNotice) {
    uiStore.notify(lockNotice, '🔒');
    return;
  }
  cosmeticsStore.equipNickStyle(style.id);
};
</script>

<template>
  <BaseModal
    :id="id"
    :show="show"
    title="VESTIDOR COSMÉTICO"
    max-width="650px"
    :z-index="12000"
    variant="retro"
    @close="closeCosmetics"
  >
    <div class="cosmetics-modal-internal">
      <!-- Nick Styles -->
      <section class="style-section">
        <div class="section-header">
          <h3>Estilos de Nick</h3>
          <span class="badge">CHAT &amp; PERFIL</span>
        </div>
        <p class="section-desc">Personalizá cómo los demás ven tu nombre.</p>

        <div class="styles-grid">
          <CosmeticsNickStyleCard
            v-for="style in cosmeticsStore.allNickStyles"
            :key="style.id"
            :style-data="style"
            :preview-username="previewUsername"
            :is-active="cosmeticsStore.equippedNickStyle === style.id"
            :is-locked="isNickLocked(style)"
            @select="selectNick(style)"
          />
        </div>
      </section>

      <!-- Avatar Styles -->
      <AvatarFrameSelector />
    </div>

    <template #footer>
      <div class="modal-footer-internal">
        <p>Los cambios se guardan instantáneamente en tu perfil de entrenador.</p>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use '@/styles/components/_cosmetics-shared';

.cosmetics-modal-internal {
  display: flex;
  flex-direction: column;
  gap: $spacing-4xl;
  padding: 10px;
}

.style-card {
  .preview-area {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    min-height: 44px;
  }

  .preview-nick {
    font-size: var(--font-16);
    font-weight: $font-weight-extrabold;
    text-align: center;
    white-space: nowrap;
  }
}

.modal-footer-internal {
  text-align: center;
  p {
    color: Rgb(71 85 105 / 100%);
    font-size: var(--font-11);
  }
}
</style>
