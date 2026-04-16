<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'

const uiStore = useUIStore()
const gameStore = useGameStore()

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
  if (typeof window.openProfileEditor === 'function') {
    window.openProfileEditor()
  }
}

const handleFactionChoice = () => {
  if (typeof window.openFactionChoice === 'function') {
    window.openFactionChoice()
  }
}
</script>

<template>
  <div
    id="profile-panel"
    class="zoom-target"
    :class="{ active: isProfileOpen, open: isProfileOpen }"
  >
    <div class="modal-scrollable-content">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <span style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--purple);">MI PERFIL</span>
        <button
          class="modal-close-btn"
          @click="closeProfile"
        >
          ✕
        </button>
      </div>

      <!-- User Identity -->
      <div style="text-align:center; margin-bottom:24px;">
        <div
          id="profile-avatar-container"
          class="profile-avatar"
          v-html="gs.avatar_style || '👤'"
        />
        <div
          id="profile-username"
          class="profile-username"
          :class="profileData.nick_style"
        >
          {{ profileData.username }}
        </div>
        <div
          id="profile-email"
          class="profile-email"
        >
          {{ profileData.email }}
        </div>
      </div>
  
      <!-- Faction -->
      <div class="profile-section-card">
        <div class="section-label">
          MI BANDO
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
          <div
            id="player-faction-badge"
            class="faction-badge"
            :class="profileData.faction"
            data-vue-managed="true"
          >
            <template v-if="profileData.faction === 'union'">
              <img
                src="/assets/factions/union.png"
                class="faction-img"
              > Team Unión
            </template>
            <template v-else-if="profileData.faction === 'poder'">
              <img
                src="/assets/factions/poder.png"
                class="faction-img"
              > Team Poder
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
            CAMBIAR
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div id="profile-stats">
        <div class="profile-stat-grid">
          <div class="profile-stat">
            <span class="profile-stat-val">{{ profileData.level }}</span><span class="profile-stat-lbl">Nivel</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-val">{{ profileData.badges }}</span><span class="profile-stat-lbl">Medallas</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-val">{{ profileData.stats.wins }}</span><span class="profile-stat-lbl">Vics. Salvaje</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-val">{{ profileData.stats.trainersDefeated }}</span><span class="profile-stat-lbl">Entr. Derrotados</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-val">₽{{ (profileData.money || 0).toLocaleString() }}</span><span class="profile-stat-lbl">Dinero</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat-val"><i class="fas fa-coins coin-icon" />{{ profileData.battleCoins }}</span><span class="profile-stat-lbl">Battle Coins</span>
          </div>
        </div>
      </div>

      <!-- Encounter Reset -->
      <div style="margin-top:15px; text-align:center;">
        <button
          class="reset-btn"
          @click="handleResetEncounter"
        >
          ⚠️ RESETEAR ENCUENTROS
        </button>
        <div class="hint-text">
          Si solo te aparecen entrenadores, usa este botón.
        </div>
      </div>

      <!-- Save Time -->
      <div style="margin-top:20px; text-align:center;">
        <div class="save-label">
          ÚLTIMO GUARDADO
        </div>
        <div
          id="profile-last-save"
          class="save-value"
        >
          {{ profileData.lastSave || 'Sin datos' }}
        </div>
      </div>

      <!-- Notifications -->
      <div style="margin-top:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div class="notifications-label">
            NOTIFICACIONES
          </div>
          <button
            class="history-btn"
            @click="isHistoryOpen = !isHistoryOpen"
          >
            HISTORIAL ({{ (profileData.notificationHistory || []).length }})
          </button>
        </div>
        <div
          v-show="isHistoryOpen"
          id="profile-notification-history"
          class="history-container"
        >
          <div
            v-for="(n, i) in (profileData.notificationHistory || []).slice().reverse()"
            :key="i"
            class="notification-entry"
          >
            <span style="font-size:12px;">{{ n.icon || '🔔' }}</span>
            <div style="flex:1;">
              <div class="notification-msg">
                {{ n.msg }}
              </div>
              <div class="notification-time">
                {{ new Date(n.ts).toLocaleTimeString() }}
              </div>
            </div>
          </div>
          <div
            v-if="!(profileData.notificationHistory || []).length"
            class="empty-notifications"
          >
            Sin notificaciones recientes.
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div
        id="profile-actions-container"
        class="profile-actions"
      >
        <button
          v-if="profileData.faction"
          id="change-faction-btn-bottom"
          class="action-btn-secondary"
          @click="handleFactionChoice"
        >
          ⚔️ CAMBIAR DE BANDO
        </button>
        <button
          class="action-btn-secondary"
          @click="handleEditProfile"
        >
          ✏️ EDITAR PERFIL
        </button>
        <button
          class="logout-btn-trigger"
          @click="handleLogout"
        >
          🚪 CERRAR SESIÓN
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-close-btn {
  background: none;
  border: none;
  color: var(--gray);
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s;
}
.modal-close-btn:hover {
  color: white;
}

.profile-section-card {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.section-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.faction-img {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  margin-right: 4px;
}

.change-link {
  font-size: 8px;
  color: var(--purple);
  text-decoration: none;
  font-family: 'Press Start 2P', monospace;
  margin-left: 8px;
}

.reset-btn {
  width: 100%;
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}

.hint-text {
  font-size: 8px;
  color: var(--gray);
  margin-top: 5px;
}

.save-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 8px;
}

.save-value {
  font-size: 10px;
  color: var(--gray);
}

.notifications-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--gray);
}

.history-btn {
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--yellow);
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
}

.history-container {
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.15);
}

.notification-entry {
  padding: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.notification-msg {
  font-size: 10px;
  color: white;
  line-height: 1.4;
}

.notification-time {
  font-size: 8px;
  color: var(--gray);
  margin-top: 4px;
}

.empty-notifications {
  font-size: 10px;
  color: var(--gray);
  text-align: center;
  padding: 12px;
}

.profile-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn-secondary {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.05);
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  transition: all 0.2s;
}

.logout-btn-trigger {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 14px;
  cursor: pointer;
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  transition: all 0.2s;
}
</style>
