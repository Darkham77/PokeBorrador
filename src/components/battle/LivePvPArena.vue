<script setup>
import { computed, onMounted, ref } from 'vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

const livePvP = useLivePvPStore()
const auth = useAuthStore()
const ui = useUIStore()

const battle = computed(() => livePvP.battleState)

// Local animations/visual state
const playerSprite = ref(null)
const enemySprite = ref(null)

onMounted(() => {
  // Sync logic if needed
})

function handleMove(moveIdx) {
  if (battle.value.phase !== 'choosing') return
  livePvP.commitPick({ type: 'move', moveIndex: moveIdx })
}

function handleSwitch() {
  ui.notify('Función de cambio en PvP próximamente.', '🔄')
}

function handleForfeit() {
  if (confirm('¿Estás seguro de que quieres rendirte?')) {
    livePvP.forfeit()
  }
}
</script>

<template>
  <div
    v-if="battle.active"
    class="live-pvp-overlay"
  >
    <div
      class="pvp-layout"
      :class="{ ranked: battle.isRanked }"
    >
      <!-- Trainer Sidebars (Desktop) -->
      <aside
        v-if="battle.isRanked"
        class="trainer-side left"
      >
        <div class="trainer-card">
          <div class="side-header">
            ENTRENADOR
          </div>
          <!-- Avatar dynamic -->
          <div class="trainer-sprite-wrap">
            <img
              src="https://play.pokemonshowdown.com/sprites/trainers/red-lgpe.webp"
              class="trainer-img"
            >
          </div>
          <div class="trainer-meta">
            <span class="name">{{ auth.user?.user_metadata?.username }}</span>
            <div class="stats">
              <span>Nv. {{ auth.user?.user_metadata?.level || 1 }}</span>
              <span class="elo">{{ auth.user?.user_metadata?.elo || 1000 }} ELO</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Battle Arena -->
      <main class="battle-main">
        <div class="battle-header">
          <div class="battle-mode-badge">
            {{ battle.isRanked ? 'RANKED' : 'AMISTOSO' }}
          </div>
          <div class="battle-status">
            {{ battle.phase.toUpperCase() }}
          </div>
        </div>

        <div class="arena-viewport">
          <!-- TODO: Integrate BattleBackground component or logic -->
          <div class="combatants-layer">
            <!-- Enemy -->
            <div class="enemy-island">
              <div class="status-box enemy">
                <div class="name-row">
                  <span>{{ battle.enemyTeam[battle.enemyActiveIdx]?.name || 'Rival' }}</span>
                </div>
                <div class="hp-track">
                  <div
                    class="hp-fill"
                    :style="{ width: (battle.enemyHp[battle.enemyActiveIdx] / (battle.enemyTeam[battle.enemyActiveIdx]?.maxHp || 100) * 100) + '%' }"
                  />
                </div>
              </div>
              <div class="sprite-wrap enemy">
                <!-- Sprite placeholder -->
              </div>
            </div>

            <!-- Player -->
            <div class="player-island">
              <div class="sprite-wrap player">
                <!-- Sprite placeholder -->
              </div>
              <div class="status-box player">
                <div class="name-row">
                  <span>{{ battle.myTeam[battle.myActiveIdx]?.name }}</span>
                </div>
                <div class="hp-track">
                  <div
                    class="hp-fill"
                    :style="{ width: (battle.myHp[battle.myActiveIdx] / (battle.myTeam[battle.myActiveIdx]?.maxHp || 100) * 100) + '%' }"
                  />
                </div>
                <div class="hp-text">
                  {{ battle.myHp[battle.myActiveIdx] }} / {{ battle.myTeam[battle.myActiveIdx]?.maxHp }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Battle Log -->
        <div class="battle-log scrollbar">
          <div
            v-for="(log, i) in battle.logs"
            :key="i"
            class="log-entry"
          >
            {{ log }}
          </div>
        </div>

        <!-- Controls -->
        <div class="battle-controls">
          <div
            v-if="battle.phase === 'choosing'"
            class="moves-grid"
          >
            <button 
              v-for="(move, i) in battle.myTeam[battle.myActiveIdx]?.moves" 
              :key="i"
              class="move-btn"
              @click="handleMove(i)"
            >
              <span class="move-name">{{ move.name }}</span>
              <span class="move-pp">{{ move.pp }}/{{ move.maxPP }}</span>
            </button>
          </div>
          <div
            v-else
            class="waiting-turn"
          >
            Esperando resolución de turno...
          </div>

          <div class="extra-actions">
            <button
              class="action-btn switch"
              @click="handleSwitch"
            >
              CAMBIAR
            </button>
            <button
              class="action-btn forfeit"
              @click="handleForfeit"
            >
              RENDIRSE
            </button>
          </div>
        </div>
      </main>

      <aside
        v-if="battle.isRanked"
        class="trainer-side right"
      >
        <div class="trainer-card">
          <div class="side-header">
            OPONENTE
          </div>
          <div class="trainer-sprite-wrap">
            <img
              src="https://play.pokemonshowdown.com/sprites/trainers/blue-gen3.webp"
              class="trainer-img"
            >
          </div>
          <div class="trainer-meta">
            <span class="name">{{ battle.opponentName }}</span>
            <div class="stats">
              <span class="elo">{{ battle.opponentElo }} ELO</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
.live-pvp-overlay {
  position: fixed;
  inset: 0;
  background: #0d1117;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pvp-layout {
  display: flex;
  width: 100%;
  height: 100%;
  max-width: 1400px;
  padding: 20px;
  gap: 20px;
}

.trainer-side {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.trainer-card {
  background: rgba(15, 23, 42, 0.95);
  border-radius: 24px;
  padding: 20px;
  width: 100%;
  min-height: 480px;
  border: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.side-header {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #94a3b8;
  margin-bottom: 15px;
}

.trainer-sprite-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trainer-img {
  max-height: 250px;
  transform: Scale(1.5);
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
}

.trainer-meta {
  padding-top: 20px;
}

.trainer-meta .name {
  font-family: 'Press Start 2P', monospace;
  font-size: 11px;
  color: #fff;
  display: block;
  margin-bottom: 10px;
}

.trainer-meta .stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}

.battle-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: rgba(0,0,0,0.2);
  border-radius: 30px;
  padding: 20px;
  position: relative;
}

.arena-viewport {
  flex: 1;
  background: #222;
  border-radius: 20px;
  position: relative;
  overflow: hidden;
}

.battle-log {
  height: 100px;
  background: rgba(0,0,0,0.4);
  padding: 10px;
  font-size: 11px;
  color: #ccc;
  border-radius: 12px;
  overflow-y: auto;
}

.battle-controls {
  padding: 10px;
}

.moves-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 15px;
}

.move-btn {
  padding: 15px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.move-name { font-weight: bold; font-size: 12px; }
.move-pp { font-size: 10px; color: #888; }

.extra-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}

.action-btn.switch { background: rgba(199,125,255,0.2); color: #c77dff; }
.action-btn.forfeit { background: rgba(255,59,59,0.15); color: #ff3b3b; }

.status-box {
  background: rgba(0,0,0,0.7);
  padding: 10px;
  border-radius: 12px;
  width: 180px;
  border: 1px solid rgba(255,255,255,0.1);
}

.hp-track {
  height: 6px;
  background: #333;
  border-radius: 3px;
  margin: 6px 0;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: #30D158;
  transition: width 0.3s;
}

.hp-text { font-size: 10px; text-align: right; color: #888; }

.enemy-island { position: absolute; top: 10%; right: 10%; }
.player-island { position: absolute; bottom: 10%; left: 10%; }

@media (max-width: 1000px) {
  .trainer-side { display: none; }
}
</style>
