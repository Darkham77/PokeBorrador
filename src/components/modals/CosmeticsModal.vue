<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useCosmeticsStore } from '@/stores/cosmetics'
import BaseModal from '@/components/common/BaseModal.vue'

const uiStore = useUIStore()
const cosmeticsStore = useCosmeticsStore()

const isOpen = computed(() => uiStore.isCosmeticsModalOpen)

const closeCosmetics = () => {
  uiStore.isCosmeticsModalOpen = false
}

const selectNick = (id) => {
  cosmeticsStore.equipNickStyle(id)
}

const selectAvatar = (id) => {
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
            @click="selectNick(style.id)"
          >
            <div class="preview-area">
              <span
                class="preview-nick"
                :class="style.class"
              >{{ uiStore.profileData.username || 'Entrenador' }}</span>
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
            @click="selectAvatar(style.id)"
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
    h3 { font-size: 18px; color: $white; font-weight: 700; }
    .badge {
      font-size: 9px;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 8px;
      border-radius: 4px;
      color: #94a3b8;
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
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
    background: rgba(255, 255, 255, 0.06);
    transform: TranslateY(-4px);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: rgba(59, 130, 246, 0.08);
    border-color: #3b82f6;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
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
      color: #94a3b8;
      font-weight: 600;
    }
    .status-tag {
      font-size: 9px;
      color: #3b82f6;
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
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 3px solid transparent;

  .placeholder { font-size: 28px; opacity: 0.3; }
}

.modal-footer-internal {
  text-align: center;
  p { font-size: 11px; color: #475569; }
}

/* --- NICK STYLE CLASSES --- */
.nt-gold { color: #FFD700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.6); }
.nt-silver { color: #E2E8F0; text-shadow: 0 0 8px rgba(226, 232, 240, 0.4); }
.nt-bronze { color: #CD7F32; text-shadow: 0 0 5px rgba(205, 127, 50, 0.4); }
.nt-fire { color: #FF4500; animation: anim-fire 2s infinite alternate; }
.nt-water { color: #38bdf8; animation: anim-water 3s infinite linear; }
.nt-spark { color: #facc15; animation: anim-spark 0.5s infinite; }
.nt-dark { color: #6d28d9; text-shadow: 0 0 10px #4c1d95; }
.nt-royal { color: #ec4899; text-shadow: 0 0 10px #db2777; font-style: italic; }
.nt-ghost { color: #94a3b8; opacity: 0.7; filter: Blur(0.5px); }

/* --- AVATAR FRAME CLASSES --- */
.av-water { border-color: #0ea5e9; box-shadow: 0 0 15px #0ea5e9; }
.av-fire { border-color: #f97316; box-shadow: 0 0 15px #f97316; animation: anim-pulse 2s infinite; }
.av-ice { border-color: #7dd3fc; box-shadow: 0 0 15px #7dd3fc; border-style: double; }
.av-dragon { border-color: #8b5cf6; box-shadow: 0 0 20px #8b5cf6; }
.av-legend { border-color: #fbbf24; box-shadow: 0 0 25px #fbbf24; }
.av-master { border-color: #ef4444; box-shadow: 0 0 20px #ef4444; border-width: 4px; }
.av-ghost { border-color: $muted; opacity: 0.8; box-shadow: 0 0 10px $muted; }

/* --- ANIMATIONS --- */
@keyframes anim-fire {
  from { text-shadow: 0 0 5px #ef4444; }
  to { text-shadow: 0 0 15px #f97316, 0 0 25px #facc15; }
}

@keyframes anim-water {
  0% { transform: TranslateY(0); }
  50% { transform: TranslateY(-2px); }
  100% { transform: TranslateY(0); }
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
