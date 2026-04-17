<script setup>
import { onMounted } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useAuthStore } from '@/stores/auth'

const social = useSocialStore()
const auth = useAuthStore()

onMounted(() => {
  social.fetchLeaderboard()
})

function getTierBadge(elo) {
  if (elo >= 3400) return { id: 'master', name: 'Maestro', class: 'master' }
  if (elo >= 2700) return { id: 'diamond', name: 'Diamante', class: 'diamond' }
  if (elo >= 2100) return { id: 'platinum', name: 'Platino', class: 'platinum' }
  if (elo >= 1600) return { id: 'gold', name: 'Oro', class: 'gold' }
  if (elo >= 1200) return { id: 'silver', name: 'Plata', class: 'silver' }
  return { id: 'bronze', name: 'Bronce', class: 'bronze' }
}

const getRankIcon = (tierId) => {
  if (!tierId) return ''
  return new URL(`../../assets/ui/ranks/${tierId}.webp`, import.meta.url).href
}
</script>

<template>
  <div class="ranking-container">
    <header class="ranking-header">
      <div class="title-box">
        <span class="subtitle">TOP 100</span>
        <h2>ENTRENADORES DE KANTO</h2>
      </div>
    </header>

    <div
      v-if="auth.sessionMode === 'offline'"
      class="offline-placeholder"
    >
      <div class="lock-icon">
        🔒
      </div>
      <p>El Ranking Mundial solo está disponible en la red Global (Online).</p>
    </div>

    <div
      v-else
      class="ranking-content"
    >
      <div
        v-if="social.leaderboardLoading"
        class="loading"
      >
        Sincronizando posiciones...
      </div>
      
      <div
        v-else
        class="leaderboard-list scrollbar"
      >
        <div
          v-for="(p, index) in social.leaderboard"
          :key="p.id" 
          class="rank-row"
          :class="{ 'is-me': p.id === auth.user?.id }"
        >
          <div
            class="rank-num"
            :class="'pos-' + (index + 1)"
          >
            {{ index + 1 }}
          </div>

          <div class="player-avatar">
            <!-- Placeholder for dynamic avatar -->
            <div
              class="avatar-circle"
              :class="p.playerClass"
            />
          </div>

          <div class="player-info">
            <div class="name-row">
              <span
                class="name"
                :style="p.nick_style"
              >{{ p.username }}</span>
              <span
                v-if="p.isOnline"
                class="online-dot"
              />
              <span
                v-if="p.id === auth.user?.id"
                class="me-badge"
              >TÚ</span>
            </div>
            <div class="meta-row">
              <span class="level">Nv. {{ p.level }}</span>
              <span
                class="faction"
                :class="p.faction"
              >{{ p.faction?.toUpperCase() || 'CIVIL' }}</span>
            </div>
          </div>

          <div class="rank-score">
            <span class="elo">{{ p.elo }}</span>
            <div
              class="tier-pill"
              :class="getTierBadge(p.elo).class"
            >
              <img 
                :src="getRankIcon(getTierBadge(p.elo).id)" 
                class="mini-badge"
              >
              {{ getTierBadge(p.elo).name }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-container {
  background: var(--card, #1c1c1e);
  border-radius: 24px;
  overflow: hidden;
  height: 600px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,0.08);
}

.ranking-header {
  padding: 30px;
  background: linear-gradient(to bottom, rgba(255,255,255,0.02), transparent);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.subtitle {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--blue, #0A84FF);
  display: block;
  margin-bottom: 8px;
}

h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.ranking-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.leaderboard-list {
  padding: 10px 20px;
  height: 100%;
  overflow-y: auto;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 8px;
  background: rgba(255,255,255,0.02);
  border-radius: 16px;
  transition: transform 0.2s, background 0.2s;
}

.rank-row:hover {
  background: rgba(255,255,255,0.04);
  transform: translateX(5px);
}

.rank-row.is-me {
  background: rgba(10, 132, 255, 0.1);
  border: 1px solid rgba(10, 132, 255, 0.3);
}

.rank-num {
  width: 32px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #555;
  text-align: center;
}

.pos-1 { color: #FFD60A; font-size: 14px; }
.pos-2 { color: #AEAEB2; font-size: 12px; }
.pos-3 { color: #A2845E; font-size: 11px; }

.player-avatar {
  margin: 0 16px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #333;
  border: 2px solid rgba(255,255,255,0.1);
}

.avatar-circle.rocket { border-color: #ff453a; background: linear-gradient(45deg, #222, #ff453a44); }
.avatar-circle.police { border-color: #0a84ff; background: linear-gradient(45deg, #222, #0a84ff44); }

.player-info {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.name {
  font-weight: 700;
  font-size: 15px;
}

.online-dot {
  width: 6px;
  height: 6px;
  background: #30D158;
  border-radius: 50%;
  box-shadow: 0 0 8px #30D158;
}

.me-badge {
  font-size: 7px;
  background: var(--blue, #0A84FF);
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Press Start 2P', monospace;
}

.meta-row {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: #666;
  font-weight: 500;
}

.faction.union { color: #0A84FF; }
.faction.poder { color: #FF453A; }

.rank-score {
  text-align: right;
}

.elo {
  display: block;
  font-family: 'Press Start 2P', monospace;
  font-size: 12px;
  color: #fff;
  margin-bottom: 6px;
}

.tier-pill {
  font-size: 8px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 5px;
  float: right;
}

.mini-badge {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.tier-pill.bronze { color: #c8a060; border: 1px solid #c8a06044; }
.tier-pill.silver { color: #9E9E9E; border: 1px solid #9E9E9E44; }
.tier-pill.gold { color: #FFB800; border: 1px solid #FFB80044; }
.tier-pill.platinum { color: #E5C100; border: 1px solid #E5C10044; }
.tier-pill.diamond { color: #89CFF0; border: 1px solid #89CFF044; }
.tier-pill.master { color: #FFD700; border: 1px solid #FFD70044; box-shadow: 0 0 10px #FFD70044; }

.offline-placeholder {
  text-align: center;
  padding: 100px 40px;
  color: #555;
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.3;
}
</style>
