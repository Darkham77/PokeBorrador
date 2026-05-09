<script setup lang="ts">
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCosmeticsStore } from '@/stores/cosmetics'
import { useProfileStore } from '@/stores/profile'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const cosmeticsStore = useCosmeticsStore()
const profileStore = useProfileStore()

const isOpen = computed(() => uiStore.isCosmeticsModalOpen)

const closeCosmetics = () => {
  uiStore.isCosmeticsModalOpen = false
}

const selectNick = (id: string) => {
  cosmeticsStore.equipNickStyle(id)
}

const selectAvatar = (id: string) => {
  cosmeticsStore.equipAvatarStyle(id)
}
</script>

<template>
  <BaseModal
    :show="isOpen"
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
          <span class="badge">CHAT & PERFIL</span>
        </div>
        <p class="section-desc">
          Personalizá cómo los demás ven tu nombre.
        </p>
        
        <div class="styles-grid">
          <div
            v-for="style in cosmeticsStore.allNickStyles"
            :key="style.id"
            class="style-card"
            :class="{ active: cosmeticsStore.equippedNickStyle === style.id }"
            @click.stop="selectNick(style.id)"
          >
            <div class="preview-area">
              <span
                class="preview-nick"
                :class="style.class"
              >{{ profileStore.profileData.username || 'Entrenador' }}</span>
            </div>
            <div class="style-meta">
              <span class="style-name">{{ style.name }}</span>
              <span
                v-if="cosmeticsStore.equippedNickStyle === style.id"
                class="status-tag"
              >EQUIPADO</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Avatar Styles -->
      <section class="style-section">
        <div class="section-header">
          <h3>Bordes de Avatar</h3>
          <span class="badge">FOTO DE PERFIL</span>
        </div>
        <p class="section-desc">
          Marcos especiales para destacar tu presencia.
        </p>
        
        <div class="styles-grid">
          <div
            v-for="style in cosmeticsStore.allAvatarStyles"
            :key="style.id"
            class="style-card avatar-item"
            :class="{ active: cosmeticsStore.equippedAvatarStyle === style.id }"
            @click.stop="selectAvatar(style.id)"
          >
            <div class="avatar-preview-box">
              <div
                class="avatar-frame"
                :class="style.class"
              >
                <div class="placeholder">
                  👤
                </div>
              </div>
            </div>
            <div class="style-meta">
              <span class="style-name">{{ style.name }}</span>
              <span
                v-if="cosmeticsStore.equippedAvatarStyle === style.id"
                class="status-tag"
              >EQUIPADO</span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="modal-footer-internal">
        <p>Los cambios se guardan instantáneamente en tu perfil de Supabase.</p>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.cosmetics-modal-internal {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.style-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    h3 { font-size: 18px; color: var(--white); font-weight: 700; }
    .badge {
      font-size: 9px;
      background: Rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
      color: Rgba(148, 163, 184, 1);
      font-weight: 800;
    }
  }
  .section-desc {
    font-size: 13px;
    color: $muted;
    margin-bottom: 24px;
  }
}

.styles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.style-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    transform: Translatey(-4px);
    border-color: Rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: Rgba(59, 130, 246, 0.08);
    border-color: Rgba(59, 130, 246, 1);
    box-shadow: 0 0 20px Rgba(59, 130, 246, 0.15);
  }

  .preview-area {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .preview-nick {
    font-size: 14px;
    font-weight: 800;
    white-space: nowrap;
  }

  .style-meta {
    text-align: center;
    .style-name {
      display: block;
      font-size: 11px;
      color: Rgba(148, 163, 184, 1);
      font-weight: 600;
    }
    .status-tag {
      font-size: 9px;
      color: Rgba(59, 130, 246, 1);
      font-weight: 800;
      margin-top: 4px;
      display: block;
    }
  }
}

.avatar-preview-box {
  padding: 10px;
}

.avatar-frame {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: Rgba(30, 41, 59, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 3px solid transparent;

  .placeholder { font-size: 28px; opacity: 0.3; }
}

.modal-footer-internal {
  text-align: center;
  p { font-size: 11px; color: Rgba(71, 85, 105, 1); }
}

/* --- NICK STYLE CLASSES --- */
.nt-gold { color: $coin-gold; text-shadow: 0 0 8px Rgba(255, 215, 0, 0.6); }
.nt-silver { color: Rgba(226, 232, 240, 1); text-shadow: 0 0 8px Rgba(226, 232, 240, 0.4); }
.nt-bronze { color: Rgba(205, 127, 50, 1); text-shadow: 0 0 5px Rgba(205, 127, 50, 0.4); }
.nt-fire { color: Rgba(255, 69, 0, 1); animation: anim-fire 2s infinite alternate; }
.nt-water { color: Rgba(56, 189, 248, 1); animation: anim-water 3s infinite linear; }
.nt-spark { color: Rgba(250, 204, 21, 1); animation: anim-spark 0.5s infinite; }
.nt-dark { color: Rgba(109, 40, 217, 1); text-shadow: 0 0 10px Rgba(76, 29, 149, 1); }
.nt-royal { color: Rgba(236, 72, 153, 1); text-shadow: 0 0 10px Rgba(219, 39, 119, 1); font-style: italic; }
.nt-ghost { color: Rgba(148, 163, 184, 1); opacity: 0.7; will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Blur(0.5px); }

/* --- AVATAR FRAME CLASSES --- */
.av-water { border-color: Rgba(14, 165, 233, 1); box-shadow: 0 0 15px Rgba(14, 165, 233, 1); }
.av-fire { border-color: Rgba(249, 115, 22, 1); box-shadow: 0 0 15px Rgba(249, 115, 22, 1); animation: anim-pulse 2s infinite; }
.av-ice { border-color: Rgba(125, 211, 252, 1); box-shadow: 0 0 15px Rgba(125, 211, 252, 1); border-style: double; }
.av-dragon { border-color: Rgba(139, 92, 246, 1); box-shadow: 0 0 20px Rgba(139, 92, 246, 1); }
.av-legend { border-color: Rgba(251, 191, 36, 1); box-shadow: 0 0 25px Rgba(251, 191, 36, 1); }
.av-master { border-color: Rgba(239, 68, 68, 1); box-shadow: 0 0 20px Rgba(239, 68, 68, 1); border-width: 4px; }
.av-ghost { border-color: $muted; opacity: 0.8; box-shadow: 0 0 10px $muted; }

/* --- ANIMATIONS --- */
@keyframes anim-fire {
  from { text-shadow: 0 0 5px Rgba(239, 68, 68, 1); }
  to { text-shadow: 0 0 15px Rgba(249, 115, 22, 1), 0 0 25px Rgba(250, 204, 21, 1); }
}

@keyframes anim-water {
  0% { transform: Translatey(0); }
  50% { transform: Translatey(-2px); }
  100% { transform: Translatey(0); }
}

@keyframes anim-spark {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes anim-pulse {
  0% { transform: Scale(1); }
  50% { transform: Scale(1.05); }
  100% { transform: Scale(1); }
}
</style>
