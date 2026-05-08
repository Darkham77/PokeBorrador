<script setup lang="ts">
import { onMounted } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useAuthStore } from '@/stores/auth'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const social = useSocialStore() as any
const auth = useAuthStore() as any

onMounted(() => {
  social.fetchLeaderboard()
})

function getTierBadge(elo: number) {
  if (elo >= 3400) return { id: 'master', name: 'Maestro', class: 'master' }
  if (elo >= 2700) return { id: 'diamond', name: 'Diamante', class: 'diamond' }
  if (elo >= 2100) return { id: 'platinum', name: 'Platino', class: 'platinum' }
  if (elo >= 1600) return { id: 'gold', name: 'Oro', class: 'gold' }
  if (elo >= 1200) return { id: 'silver', name: 'Plata', class: 'silver' }
  return { id: 'bronze', name: 'Bronce', class: 'bronze' }
}

const getRankIcon = (tierId: string) => {
  return getAssetUrl(ASSET_TYPES.RANK, tierId)
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
          v-for="(p, index) in (social.leaderboard as any[])"
          :key="p.id" 
          class="rank-row"
          :class="{ 'is-me': p.id === auth.user?.id }"
        >
          <div
            class="rank-num"
            :class="'pos-' + (Number(index) + 1)"
          >
            {{ Number(index) + 1 }}
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
              <span class="level m-badge-level">Nv. {{ p.level }}</span>
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
              :class="getTierBadge(Number(p.elo)).class"
            >
              <img 
                :src="getRankIcon(getTierBadge(Number(p.elo)).id)"
                class="mini-badge" 
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
              >
              {{ getTierBadge(Number(p.elo)).name }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
.ranking-container {
  background: var(--card, Rgba(28, 28, 30, 1));
  border-radius: 24px;
  overflow: hidden;
  height: 600px;
  display: flex;
  flex-direction: column;
  border: 1px solid Rgba(255,255,255,0.08);
}

.ranking-header {
  padding: 30px;
  background: Linear-Gradient(to bottom, Rgba(255,255,255,0.02), transparent);
  border-bottom: 1px solid Rgba(255,255,255,0.05);
}

.subtitle {
  @include pixelated;
  font-size: 8px;
  color: var(--blue, Rgba(59, 130, 246, 1));
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
  min-height: 0;
}

.leaderboard-list {
  padding: 10px 20px;
  height: 100%;
  overflow-y: auto;
  min-height: 0;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 8px;
  background: Rgba(255,255,255,0.02);
  border-radius: 16px;
  transition: transform 0.2s, background 0.2s;
}

.rank-row:hover {
  background: Rgba(255,255,255,0.04);
  transform: Translatex(5px);
}

.rank-row.is-me {
  background: Rgba(10, 132, 255, 0.1);
  border: 1px solid Rgba(10, 132, 255, 0.3);
}

.rank-num {
  width: 32px;
  @include pixelated;
  font-size: 10px;
  color: Rgba(85, 85, 85, 1);
  text-align: center;
}

.pos-1 { color: Rgba(255, 193, 7, 1); font-size: 14px; }
.pos-2 { color: Rgba(174, 174, 178, 1); font-size: 12px; }
.pos-3 { color: Rgba(162, 132, 94, 1); font-size: 11px; }

.player-avatar {
  margin: 0 16px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: Rgba(51, 51, 51, 1);
  border: 2px solid Rgba(255, 255, 255, 0.1);
}

.avatar-circle.rocket { border-color: Rgba(239, 68, 68, 1); background: Linear-Gradient(45deg, Rgba(34, 34, 34, 1), Rgba(239, 68, 68, 0.44)); }
.avatar-circle.police { border-color: Rgba(59, 130, 246, 1); background: Linear-Gradient(45deg, Rgba(34, 34, 34, 1), Rgba(59, 130, 246, 0.44)); }

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
  background: Rgba(48, 209, 88, 1);
  border-radius: 50%;
  box-shadow: 0 0 8px Rgba(48, 209, 88, 1);
}

.me-badge {
  font-size: 7px;
  background: var(--blue, Rgba(59, 130, 246, 1));
  color: white;
  padding: 2px 4px;
  border-radius: 4px;
  @include pixelated;
}

.meta-row {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: Rgba(102, 102, 102, 1);
  font-weight: 500;
}

.faction.union { color: Rgba(59, 130, 246, 1); }
.faction.poder { color: Rgba(239, 68, 68, 1); }

.rank-score {
  text-align: right;
}

.elo {
  display: block;
  @include pixelated;
  font-size: 12px;
  color: var(--white);
  margin-bottom: 6px;
}

.tier-pill {
  font-size: 8px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  background: Rgba(255,255,255,0.05);
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

.tier-pill.bronze { color: Rgba(200, 160, 96, 1); border: 1px solid Rgba(200, 160, 96, 0.27); }
.tier-pill.silver { color: Rgba(158, 158, 158, 1); border: 1px solid Rgba(158, 158, 158, 0.27); }
.tier-pill.gold { color: Rgba(255, 184, 0, 1); border: 1px solid Rgba(255, 184, 0, 0.27); }
.tier-pill.platinum { color: Rgba(229, 193, 0, 1); border: 1px solid Rgba(229, 193, 0, 0.27); }
.tier-pill.diamond { color: Rgba(137, 207, 240, 1); border: 1px solid Rgba(137, 207, 240, 0.27); }
.tier-pill.master { color: Rgba(255, 215, 0, 1); border: 1px solid Rgba(255, 215, 0, 0.27); box-shadow: 0 0 10px Rgba(255, 215, 0, 0.27); }

.offline-placeholder {
  text-align: center;
  padding: 100px 40px;
  color: Rgba(85, 85, 85, 1);
}

.lock-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.3;
}
</style>
