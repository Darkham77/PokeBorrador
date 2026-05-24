<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLivePvPStore } from '@/stores/livePvP'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { PLAYER_CLASSES } from '@/data/playerClasses'
import type { PvPBattleState } from '@/logic/pvp/pvpEngine'

const livePvP = useLivePvPStore()
const auth = useAuthStore()
const gameStore = useGameStore()
const ui = useUIStore()

const battle = computed(() => livePvP.battleState as unknown as PvPBattleState & { 
  active: boolean, 
  opponentAvatar?: string, 
  opponentName: string, 
  opponentElo: number,
  deadline: number | null
})

// Local animations/visual state
const playerAvatarId = computed(() => {
  const pClass = (gameStore.state.playerClass || 'novato') as string
  return (PLAYER_CLASSES as Record<string, { avatarSpriteId: string }>)[pClass]?.avatarSpriteId || 'red-lgpe'
})

const opponentAvatarId = computed(() => {
  // En PvP real, esto vendría del estado de la batalla
  return battle.value.opponentAvatar || 'blue-gen3'
})

onMounted(() => {
  // Sync logic if needed
})

function handleMove(moveIdx: number) {
  if (battle.value.phase !== 'choosing') return
  livePvP._commitPick({ type: 'move', moveIndex: moveIdx })
}

function handleSwitch() {
  ui.notify('Función de cambio en PvP próximamente.', '🔄')
}

function handleForfeit() {
  ui.openConfirm({
    title: 'RENDIRSE',
    message: '¿Estás seguro de que quieres rendirte?',
    onConfirm: () => {
      livePvP._forfeit()
    }
  })
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
              :src="getAssetUrl(ASSET_TYPES.TRAINER, playerAvatarId)"
              class="trainer-img"
              @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
            >
          </div>
          <div class="trainer-meta">
            <span class="name">{{ auth.user?.user_metadata?.username }}</span>
            <div class="stats">
              <span>Nv. {{ gameStore.state.trainerLevel || 1 }}</span>
              <span class="elo">{{ gameStore.state.eloRating || 1000 }} ELO</span>
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
                    :style="{ width: ((battle.enemyHp[battle.enemyActiveIdx] ?? 0) / (battle.enemyTeam[battle.enemyActiveIdx]?.maxHp || 100) * 100) + '%' }"
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
                    :style="{ width: ((battle.myHp[battle.myActiveIdx] ?? 0) / (battle.myTeam[battle.myActiveIdx]?.maxHp || 100) * 100) + '%' }"
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
              v-for="(move, i) in (battle.myTeam[battle.myActiveIdx]?.moves || [])" 
              :key="i"
              class="move-btn"
              @click.stop="move && handleMove(Number(i))"
            >
              <template v-if="move">
                <span class="move-name">{{ move.name }}</span>
                <span class="move-pp">{{ move.pp }}/{{ move.maxPP }}</span>
              </template>
              <span
                v-else
                class="move-name empty"
              >- VACÍO -</span>
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
              @click.stop="handleSwitch"
            >
              CAMBIAR
            </button>
            <button
              class="action-btn forfeit"
              @click.stop="handleForfeit"
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
              :src="getAssetUrl(ASSET_TYPES.TRAINER, opponentAvatarId)"
              class="trainer-img"
              @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
@use "@/styles/core/_mixins" as *;
.live-pvp-overlay {
  position: fixed;
  inset: 0;
  background: Rgba(13, 17, 23, 1);
  z-index: var(--z-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: Translatez(0);
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
  background: Rgba(15, 23, 42, 0.95);
  border-radius: 24px;
  padding: 20px;
  width: 100%;
  min-height: 480px;
  border: 1px solid Rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}

.side-header {
  @include pixelated;
  font-size: 8px;
  color: Rgba(148, 163, 184, 1);
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
  will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 10px 20px Rgba(0,0,0,0.5));
}

.trainer-meta {
  padding-top: 20px;
}

.trainer-meta .name {
  @include pixelated;
  font-size: 11px;
  color: $white;
  display: block;
  margin-bottom: 10px;
}

.trainer-meta .stats {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: Rgba(148, 163, 184, 1);
}

.battle-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: Rgba(0,0,0,0.2);
  border-radius: 30px;
  padding: 20px;
  position: relative;
  min-height: 0;
}

.arena-viewport {
  flex: 1;
  background: Rgba(34, 34, 34, 1);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
}

.battle-log {
  height: 100px;
  background: Rgba(0,0,0,0.4);
  padding: 10px;
  font-size: 11px;
  color: Rgba(204, 204, 204, 1);
  border-radius: 12px;
  overflow-y: auto;
  min-height: 0;
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
  background: Rgba(255,255,255,0.05);
  border: 1px solid Rgba(255,255,255,0.1);
  color: $white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.move-name { font-weight: bold; font-size: 12px; }
.move-pp { font-size: 10px; color: Rgba(136, 136, 136, 1); }

.extra-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
}

.action-btn.switch { background: Rgba(199, 125, 255, 0.2); color: Rgba(199, 125, 255, 1); }
.action-btn.forfeit { background: Rgba(255, 59, 59, 0.15); color: Rgba(255, 59, 59, 1); }

.status-box {
  background: Rgba(0,0,0,0.7);
  padding: 10px;
  border-radius: 12px;
  width: 180px;
  border: 1px solid Rgba(255,255,255,0.1);
}

.hp-track {
  height: 6px;
  background: Rgba(51, 51, 51, 1);
  border-radius: 3px;
  margin: 6px 0;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: Rgba(48, 209, 88, 1);
  
}

.hp-text { font-size: 10px; text-align: right; color: Rgba(136, 136, 136, 1); }

.enemy-island { position: absolute; top: 10%; right: 10%; }
.player-island { position: absolute; bottom: 10%; left: 10%; }

@media (max-width: 1000px) {
  .trainer-side { display: none; }
}
</style>
