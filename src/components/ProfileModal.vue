<script setup>
import { computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useTradeStore } from '@/stores/trade'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import { PLAYER_CLASSES } from '@/data/playerClasses'

const uiStore = useUIStore()
const gameStore = useGameStore()
const tradeStore = useTradeStore()

onMounted(() => {
  tradeStore.refreshPendingTrades()
})

const gs = computed(() => gameStore.state)
const profileData = computed(() => uiStore.profileData)
const isProfileOpen = computed({
  get: () => uiStore.isProfileOpen,
  set: (val) => { uiStore.isProfileOpen = val }
})
const isHistoryOpen = computed({
  get: () => uiStore.isHistoryOpen,
  set: (val) => { uiStore.isHistoryOpen = val }
})

const closeProfile = () => {
  isProfileOpen.value = false
}

const handleResetEncounter = () => {
  if (typeof window.resetEncounterPity === 'function') {
    window.resetEncounterPity()
  }
}

const handleLogout = () => {
  if (typeof window.doLogout === 'function') {
    window.doLogout()
  }
}

const handleEditProfile = () => {
  uiStore.isCosmeticsModalOpen = true
}

const handleFactionChoice = () => {
  uiStore.isFactionChoiceOpen = true
}

const usernameColor = computed(() => {
  if (gs.value.playerClass === 'rocket') return '#ef4444'
  return '#ffca28'
})

const panelStyle = computed(() => {
  const cls = PLAYER_CLASSES[gs.value.playerClass]
  if (!cls) return {}
  return {
    background: `linear-gradient(180deg, ${cls.colorDark}cc 0%, #0a0c14 100%)`
  }
})

const displayUsername = computed(() => {
  if (profileData.value.username && profileData.value.username !== '—') {
    return profileData.value.username
  }
  return gs.value.trainer || 'Entrenador'
})

// Expose to template
const getAssetUrlLocal = getAssetUrl
const ASSET_TYPES_LOCAL = ASSET_TYPES
</script>

<template>
  <transition name="slide-right">
    <section
      v-if="isProfileOpen"
      class="profile-panel-premium"
      :style="panelStyle"
    >
      <header class="panel-header">
        <div class="header-content">
          <span class="panel-title-icon">👤</span>
          <span class="panel-title-text">MI PERFIL</span>
        </div>
        <button
          class="panel-close-btn"
          @click="closeProfile"
        >
          &times;
        </button>
      </header>

      <div class="profile-content-scrollable custom-scrollbar">
        <!-- User Identity -->
        <div class="user-identity-section">
          <TrainerAvatar 
            :player-class="gs.playerClass"
            :level="profileData.level"
            :size="110"
            class="profile-avatar-premium"
          />
          
          <div
            id="profile-username"
            class="profile-username"
            :class="profileData.nick_style"
            :style="{ color: usernameColor }"
          >
            {{ displayUsername }}
          </div>
          <div
            id="profile-email"
            class="profile-email"
          >
            {{ profileData.email }}
          </div>
        </div>

        <!-- Faction -->
        <div class="profile-section-card faction-card">
          <div class="section-label">
            BANDO
          </div>
          <div class="faction-row">
            <div
              id="player-faction-badge"
              class="faction-badge"
              :class="profileData.faction"
            >
              <template v-if="profileData.faction === 'union'">
                <img
                  :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'union')"
                  class="faction-img"
                > Team Unión
              </template>
              <template v-else-if="profileData.faction === 'poder'">
                <img
                  :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'poder')"
                  class="faction-img"
                > Team Poder
              </template>
              <template v-else-if="profileData.faction === 'rocket'">
                <img
                  :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, 'rocket')"
                  class="faction-img"
                > Team Rocket
              </template>
              <template v-else>
                Sin Bando
              </template>
            </div>
            <a
              id="change-faction-btn"
              href="#"
              class="change-link"
              @click.prevent="handleFactionChoice"
            >
              🔗 {{ profileData.faction ? 'CAMBIAR' : 'ELEGIR' }}
            </a>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="profile-stat-grid-legacy">
          <div class="legacy-stat-item">
            <span class="legacy-stat-val">{{ profileData.level }}</span>
            <span class="legacy-stat-lbl">Nivel</span>
          </div>
          <div class="legacy-stat-item">
            <span class="legacy-stat-val">{{ profileData.badges }}</span>
            <span class="legacy-stat-lbl">Medallas</span>
          </div>
          <div class="legacy-stat-item">
            <span class="legacy-stat-val">{{ profileData.stats.wins }}</span>
            <span class="legacy-stat-lbl">Vics. Salvaje</span>
          </div>
          <div class="legacy-stat-item">
            <span class="legacy-stat-val">{{ profileData.stats.trainersDefeated }}</span>
            <span class="legacy-stat-lbl">Entr. Derrotados</span>
          </div>
          <div class="legacy-stat-item highlight">
            <span class="legacy-stat-val">
              <span class="currency-icon-money">₱</span>
              {{ (profileData.money || 0).toLocaleString().replace(/,/g, '.') }}
            </span>
            <span class="legacy-stat-lbl">Dinero</span>
          </div>
          <div class="legacy-stat-item highlight">
            <span class="legacy-stat-val">
              <i class="fas fa-coins currency-icon-bc" />
              {{ (profileData.battleCoins || 0).toLocaleString().replace(/,/g, '.') }}
            </span>
            <span class="legacy-stat-lbl">Battle Coins</span>
          </div>
        </div>

        <!-- Save Info -->
        <div class="legacy-info-row">
          <div class="info-label">
            GUARDADO
          </div>
          <div class="info-value">
            Guardado: {{ profileData.lastSave || '00:00:00' }}
          </div>
        </div>

        <!-- Notifications -->
        <div class="legacy-info-row">
          <div class="notifications-header-legacy">
            <div class="info-label">
              NOTIFICACIONES
            </div>
            <button
              class="history-btn-legacy"
              @click="isHistoryOpen = !isHistoryOpen"
            >
              Ver ultimas 10 ({{ (profileData.notificationHistory || []).length }})
            </button>
          </div>
          
          <div
            v-show="isHistoryOpen"
            class="history-container-legacy"
          >
            <div
              v-for="(n, i) in (profileData.notificationHistory || []).slice().reverse()"
              :key="i"
              class="notification-entry-legacy"
            >
              <span class="notif-icon">{{ n.icon || '🔔' }}</span>
              <div class="notif-body">
                <div class="notif-text">
                  {{ n.msg }}
                </div>
                <div class="notif-time">
                  {{ new Date(n.ts).toLocaleTimeString() }}
                </div>
              </div>
            </div>
            <div
              v-if="!(profileData.notificationHistory || []).length"
              class="empty-notif-legacy"
            >
              Sin notificaciones recientes.
            </div>
          </div>
        </div>

        <!-- Trade Notifications -->
        <div
          v-if="tradeStore.pendingIncoming.length > 0 || tradeStore.pendingAccepted.length > 0"
          class="trade-notifs-section-legacy"
        >
          <div class="info-label">
            INTERCAMBIOS PENDIENTES
          </div>
          
          <div
            v-for="t in tradeStore.pendingAccepted"
            :key="t.id"
            class="trade-notif-card-legacy accepted"
          >
            <div class="notif-header">
              ✅ ¡OFERTA ACEPTADA!
            </div>
            <button
              class="notif-action-btn"
              @click="tradeStore.claimTrade(t.id)"
            >
              ENTENDIDO
            </button>
          </div>

          <div
            v-for="t in tradeStore.pendingIncoming"
            :key="t.id"
            class="trade-notif-card-legacy pending"
          >
            <div class="notif-header">
              🔄 NUEVA OFERTA
            </div>
            <div class="notif-actions">
              <button
                class="notif-btn accept"
                @click="tradeStore.acceptTrade(t.id)"
              >
                ACEPTAR
              </button>
              <button
                class="notif-btn reject"
                @click="tradeStore.rejectTrade(t.id)"
              >
                RECHAZAR
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="profile-actions-legacy">
          <button
            class="logout-btn-legacy"
            @click="handleLogout"
          >
            🚪 CERRAR SESIÓN
          </button>
          <button
            class="edit-btn-legacy"
            @click="handleEditProfile"
          >
            ✏️ Editar
          </button>
          <div class="reset-wrap-legacy">
            <button
              class="reset-btn-legacy"
              @click="handleResetEncounter"
            >
              ⚠️ RESETEAR ENCUENTROS
            </button>
            <div class="hint-text-legacy">
              Si solo te aparecen entrenadores, usa este botón.
            </div>
          </div>
        </div>
      </div>
    </section>
  </transition>
</template>

<style scoped lang="scss">
.profile-panel-premium {
  position: fixed;
  top: 0;
  right: 0;
  width: min(420px, 100vw);
  height: 100vh;
  background: rgba(10, 12, 20, 0.95);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 12000;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
}

.panel-header {
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .header-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .panel-title-icon { font-size: 20px; }
  .panel-title-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 11px;
    color: var(--yellow);
    letter-spacing: 1px;
  }
}

.panel-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: #fff;
    transform: rotate(90deg);
  }
}

.profile-content-scrollable {
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* Critical for flex scroll */
  padding: 32px;
  @include smooth-scroll;
}

.user-identity-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.profile-avatar-premium {
  margin-bottom: 20px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.profile-username {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  color: #ffca28;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  text-align: center;
}

.profile-email {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 10px;
  text-align: center;
}

.profile-section-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
}

.section-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  margin-bottom: 12px;
  text-align: center;
}

.faction-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.faction-badge {
  font-size: 11px;
  color: #f1f5f9;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &.rocket { color: #f87171; }
  &.union { color: #60a5fa; }
  &.poder { color: #facc15; }
}

.faction-img {
  width: 18px;
  height: 18px;
  object-fit: contain;
  image-rendering: pixelated;
}

.change-link {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #ffca28;
  text-decoration: underline;
  cursor: pointer;
  opacity: 0.8;
  &:hover { opacity: 1; }
}

.profile-stat-grid-legacy {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.legacy-stat-item {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.highlight .legacy-stat-val {
    color: var(--yellow);
  }
}

.legacy-stat-val {
  font-family: 'Press Start 2P', monospace;
  font-size: 14px;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.legacy-stat-lbl {
  font-size: 9px;
  color: #fff;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  text-transform: uppercase;
  font-weight: 700;
}


.legacy-info-row {
  margin-bottom: 24px;
}

.info-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  color: #fff;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  margin-bottom: 12px;
}

.info-value {
  font-size: 12px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.02);
  padding: 10px 14px;
  border-radius: 10px;
}

.notifications-header-legacy {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.history-btn-legacy {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 12px;
  color: #facc15;
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.08); }
}

.history-container-legacy {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
}

.notification-entry-legacy {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  &:last-child { border-bottom: none; }
  
  .notif-icon { font-size: 16px; }
  .notif-body { flex: 1; }
  .notif-text { font-size: 12px; color: #cbd5e1; line-height: 1.4; }
  .notif-time { font-size: 9px; color: #475569; margin-top: 4px; }
}

.profile-actions-legacy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 32px;
}

.logout-btn-legacy {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 14px;
  padding: 16px;
  color: #f87171;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(239, 68, 68, 0.15); transform: translateY(-2px); }
}

.edit-btn-legacy {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 14px;
  color: #f1f5f9;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  &:hover { background: rgba(255, 255, 255, 0.06); }
}

.reset-btn-legacy {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.1);
  border-radius: 14px;
  padding: 14px;
  color: #ef4444;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  &:hover { border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }
}

.hint-text-legacy {
  font-size: 9px;
  color: #475569;
  text-align: center;
  margin-top: 8px;
}

// Animations
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
</style>

