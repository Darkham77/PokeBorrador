<script setup>
import { onMounted, computed } from 'vue'
import { usePvPStore } from '@/stores/pvp'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { RANKED_REWARD_MILESTONES } from '@/data/rankedData'

const pvp = usePvPStore()
const auth = useAuthStore()
const ui = useUIStore()

onMounted(() => {
  pvp.loadPvPData()
})

const milestones = RANKED_REWARD_MILESTONES

const getRankIcon = (tierId) => {
  if (!tierId) return ''
  return new URL(`../../assets/ui/ranks/${tierId}.webp`, import.meta.url).href
}

const seasonActive = computed(() => {
  const now = new Date()
  return now >= pvp.seasonRange.start && now <= pvp.seasonRange.end
})

function isUnlocked(eloReq) {
  return pvp.maxElo >= eloReq
}

function isClaimed(id) {
  return pvp.rewardsClaimed.includes(id)
}

function startSearch() {
  if (!seasonActive.value) {
    ui.notify('La temporada no está activa.', '🚫')
    return
  }
  ui.notify('Buscando oponente...', '🔍')
}
</script>

<template>
  <div class="arena-container">
    <div
      v-if="auth.sessionMode === 'offline'"
      class="offline-mask"
    >
      <div class="lock-card">
        <span class="icon">📡</span>
        <h3>ARENA DESCONECTADA</h3>
        <p>Conecta a la red global para participar en encuentros clasificatorios y defender tu posición en el ranking.</p>
      </div>
    </div>

    <main class="arena-main">
      <section class="rank-card">
        <div class="tier-display">
          <div class="tier-icon-wrapper">
            <img 
              :src="getRankIcon(pvp.eloTier.id)"
              :alt="pvp.eloTier.name"
              class="tier-image"
            >
          </div>
          <div class="tier-info">
            <span class="tier-label">RANGO ACTUAL</span>
            <h2 :style="{ color: pvp.eloTier.color }">
              {{ pvp.eloTier.name }}
            </h2>
            <div class="elo-badge">
              {{ pvp.elo }} ELO
            </div>
          </div>
        </div>

        <div class="arena-stats">
          <div class="stat-item">
            <span class="val">{{ pvp.stats.wins }}</span>
            <span class="lab">VICTORIAS</span>
          </div>
          <div class="stat-item">
            <span class="val">{{ pvp.stats.losses }}</span>
            <span class="lab">DERROTAS</span>
          </div>
          <div class="stat-item">
            <span class="val">{{ (pvp.stats.wins / (pvp.stats.wins + pvp.stats.losses || 1) * 100).toFixed(1) }}%</span>
            <span class="lab">WIN RATE</span>
          </div>
        </div>
      </section>

      <section class="passive-defense">
        <div class="def-header">
          <div class="title-group">
            <h3>DEFENSA PASIVA</h3>
            <p>Tu equipo actual defenderá tu posición mientras no estés en línea.</p>
          </div>
          <button
            :class="{ active: pvp.passiveTeamActive }" 
            class="toggle-btn"
            @click="pvp.togglePassiveTeam"
          >
            {{ pvp.passiveTeamActive ? 'ACTIVADO' : 'DESACTIVADO' }}
          </button>
        </div>
        
        <div
          v-if="pvp.passiveTeamActive"
          class="def-status active"
        >
          ¡Tu equipo de defensa está protegiendo tu ELO en la Arena!
        </div>
        <div
          v-else
          class="def-status inactive"
        >
          Advertencia: Sin defensa pasiva, tu ELO bajará más rápido si te derrotan.
        </div>
      </section>

      <section class="milestone-track">
        <div class="header-with-timer">
          <h3>RECOMPENSAS DE TEMPORADA</h3>
          <span class="season-timer">
            {{ pvp.seasonRange.daysLeft > 0 ? `Termina en ${pvp.seasonRange.daysLeft}d` : 'Temporada Finalizada' }}
          </span>
        </div>
        
        <div class="track-list scrollbar">
          <div
            v-for="m in milestones"
            :key="m.id" 
            class="milestone-card" 
            :class="{ locked: !isUnlocked(m.elo), claimed: isClaimed(m.id) }"
          >
            <div class="m-icon">
              {{ m.icon }}
            </div>
            <div class="m-info">
              <span class="m-elo">{{ m.elo }} ELO</span>
              <span class="m-prize">
                {{ Object.entries(m.rewards).map(([n, q]) => `${n} x${q}`).join(', ') }}
              </span>
            </div>
            <button
              v-if="isUnlocked(m.elo) && !isClaimed(m.id)" 
              class="claim-btn"
              @click="pvp.claimReward(m.id)"
            >
              RECLAMAR
            </button>
            <div
              v-else-if="isClaimed(m.id)"
              class="claimed-badge"
            >
              ✓
            </div>
            <div
              v-else
              class="lock-badge"
            >
              🔒
            </div>
          </div>
        </div>
      </section>

      <section class="matchmaking-actions">
        <div class="rules-hint">
          <h4>REGLAS ACTUALES</h4>
          <div class="rules-summary">
            <span>Nivel Máx: {{ pvp.currentSeasonRules?.levelCap || 'Sin límite' }}</span>
            <span>Pokémon: {{ pvp.currentSeasonRules?.maxPokemon || 6 }}</span>
          </div>
          <div
            v-if="allowedTypes.length"
            class="types-list"
          >
            <span
              v-for="t in allowedTypes"
              :key="t"
              class="type-badge"
              :class="t"
            >
              {{ RANKED_TYPE_META[t]?.icon }} {{ RANKED_TYPE_META[t]?.label }}
            </span>
          </div>
          <div
            v-else
            class="all-types-allowed"
          >
            Todos los tipos permitidos
          </div>
        </div>
        
        <button 
          class="search-btn" 
          :disabled="!seasonActive"
          @click="startSearch"
        >
          <span class="icon">🔍</span>
          {{ seasonActive ? 'BUSCAR PARTIDA' : 'TEMPORADA CERRADA' }}
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.arena-container {
  height: 600px;
  position: relative;
  background: var(--card, #1c1c1e);
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
}

.offline-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lock-card {
  text-align: center;
  max-width: 300px;
}

.lock-card .icon { font-size: 48px; display: block; margin-bottom: 20px; }
.lock-card h3 { font-family: 'Press Start 2P', monospace; font-size: 12px; color: #fff; margin-bottom: 15px; }
.lock-card p { font-size: 12px; color: #888; line-height: 1.5; }

.arena-main {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  overflow-y: auto;
}

.rank-card {
  background: rgba(255,255,255,0.03);
  padding: 24px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}

.tier-display {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.tier-icon-wrapper {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.2));
  animation: float 4s ease-in-out infinite;
}

.tier-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.tier-info h2 {
  margin: 4px 0;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -1px;
}

.tier-label {
  font-size: 9px;
  font-family: 'Press Start 2P', monospace;
  color: #666;
}

.elo-badge {
  display: inline-block;
  background: rgba(255,255,255,0.1);
  padding: 4px 10px;
  border-radius: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
}

.arena-stats {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 20px;
}

.stat-item { text-align: center; }
.stat-item .val { display: block; font-size: 18px; font-weight: bold; }
.stat-item .lab { font-size: 10px; color: #666; font-weight: bold; }

.passive-defense {
  background: #000;
  padding: 20px;
  border-radius: 20px;
  border: 1px solid #333;
}

.def-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.def-header h3 { margin: 0; font-size: 14px; font-weight: 800; }
.def-header p { margin: 4px 0 0; font-size: 11px; color: #666; }

.toggle-btn {
  padding: 8px 16px;
  border-radius: 12px;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  background: #333;
  color: #666;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #30D158;
  color: #000;
  box-shadow: 0 0 15px rgba(48, 209, 88, 0.4);
}

.def-status { font-size: 10px; padding: 10px; border-radius: 10px; text-align: center; font-weight: bold; }
.def-status.active { background: rgba(48, 209, 88, 0.1); color: #30D158; }
.def-status.inactive { background: rgba(255, 69, 58, 0.1); color: #FF453A; }

.milestone-track .header-with-timer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.season-timer {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: var(--yellow, #FFD60A);
  background: rgba(255, 214, 10, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
}

.milestone-track h3 { font-size: 14px; margin: 0; }

.track-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.milestone-card {
  display: flex;
  align-items: center;
  padding: 14px;
  background: rgba(255,255,255,0.02);
  border-radius: 16px;
  gap: 15px;
  position: relative;
}

.milestone-card.locked { opacity: 0.5; }
.milestone-card.claimed { background: rgba(48, 209, 88, 0.05); }

.m-icon { font-size: 24px; }
.m-info { flex: 1; }
.m-elo { display: block; font-family: 'Press Start 2P', monospace; font-size: 8px; color: #888; margin-bottom: 4px; }
.m-prize { font-weight: 600; font-size: 13px; }

.claim-btn {
  background: var(--blue, #0A84FF);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: bold;
  cursor: pointer;
}

.claimed-badge { color: #30D158; font-weight: bold; }
.lock-badge { font-size: 14px; }

.matchmaking-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: rgba(255,255,255,0.02);
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.05);
}

.rules-hint h4 {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #666;
  margin-bottom: 12px;
}

.rules-summary {
  display: flex;
  gap: 20px;
  font-size: 12px;
  margin-bottom: 10px;
}

.types-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-badge {
  font-size: 9px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
}

.all-types-allowed {
  font-size: 11px;
  color: #888;
  font-style: italic;
}

.search-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #0A84FF, #0056b3);
  color: white;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(10, 132, 255, 0.3);
}

.search-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(10, 132, 255, 0.4);
}

.search-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
