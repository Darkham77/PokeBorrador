<script setup>
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

const props = defineProps({
  currentClass: Object,
  trainerLevel: Number,
  trainerRank: String
})

const emit = defineEmits(['openMissions', 'changeClass', 'close'])

const getTrainerSprite = (id) => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id);
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- Left: Identity -->
    <aside class="dashboard-sidebar">
      <div class="avatar-box">
        <div class="avatar-glow" />
        <img 
          :src="getTrainerSprite(currentClass?.showdownSpriteId || currentClass?.id)" 
          class="trainer-big-img"
        >
        <div class="avatar-mini-circle">
          <TrainerAvatar
            :player-class="currentClass?.id"
            :level="trainerLevel"
            :size="60"
            class="avatar-pixel no-border"
          />
        </div>
      </div>

      <h1 class="class-main-title">
        {{ currentClass?.name.toUpperCase() }}
      </h1>
      <p class="class-slogan">
        "{{ currentClass?.description }}"
      </p>

      <div class="rank-cards">
        <div class="rank-card level">
          <div class="card-icon">
            🎖️
          </div>
          <div class="card-text">
            <span class="label">NIVEL ENTRENADOR</span>
            <span class="value">Nv. {{ trainerLevel }}</span>
          </div>
        </div>
        <div class="rank-card rank">
          <div class="card-icon">
            ✨
          </div>
          <div class="card-text">
            <span class="label">RANGO ACTUAL</span>
            <span class="value highlight">{{ trainerRank }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right: Details -->
    <main class="dashboard-main custom-scrollbar">
      <section class="details-section">
        <div class="section-header">
          <div class="header-line" />
          <h2>HABILIDADES DE CLASE</h2>
        </div>
        
        <div class="abilities-list">
          <div 
            v-for="(bonus, idx) in currentClass?.bonuses" 
            :key="idx"
            class="ability-item"
            :class="{ locked: idx + 1 > (currentClass?.bonusLevels?.[idx] || 1) && trainerLevel < (currentClass?.bonusLevels?.[idx] || 0) }"
          >
            <div class="ability-checkbox">
              {{ (currentClass?.bonusLevels?.[idx] || 1) <= trainerLevel ? '✅' : '🔒' }}
            </div>
            <div class="ability-content">
              <p :class="{ 'text-locked': (currentClass?.bonusLevels?.[idx] || 1) > trainerLevel }">
                {{ bonus }}
              </p>
              <span
                v-if="(currentClass?.bonusLevels?.[idx] || 1) > trainerLevel"
                class="req-hint"
              >
                Requiere Nivel de Entrenador {{ currentClass?.bonusLevels?.[idx] }}
              </span>
            </div>
            <div
              v-if="(currentClass?.bonusLevels?.[idx] || 1) > trainerLevel"
              class="lv-badge"
            >
              Nv. {{ currentClass?.bonusLevels?.[idx] }}
            </div>
            <div class="ability-help">
              ?
            </div>
          </div>
        </div>
      </section>

      <section class="details-section">
        <div class="section-header">
          <div class="header-line red" />
          <h2>LIMITACIONES</h2>
        </div>
        
        <div class="abilities-list limitations">
          <div 
            v-for="(penalty, idx) in currentClass?.penalties" 
            :key="idx"
            class="ability-item limitation"
          >
            <div class="ability-checkbox">
              ❌
            </div>
            <div class="ability-content">
              <p>{{ penalty }}</p>
            </div>
            <div class="ability-help">
              ?
            </div>
          </div>
        </div>
      </section>

      <!-- Bottom Actions -->
      <div class="dashboard-actions">
        <button 
          class="missions-btn-wide"
          @click="emit('openMissions')"
        >
          <span class="icon">📋</span> MISIONES PASIVAS
        </button>

        <div class="action-footer">
          <button
            class="btn-secondary"
            @click="emit('changeClass')"
          >
            <span class="icon">🔄</span>
            <div class="btn-label-stack">
              <span class="btn-label">CAMBIAR CLASE</span>
              <span class="price">10,000 BC</span>
            </div>
          </button>
          <button
            class="btn-primary"
            @click="emit('close')"
          >
            <span class="icon check-icon">✓</span> ENTENDIDO
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.dashboard-layout {
  display: flex;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  // Base dark background
  background: #0a0c14;
  
  // Custom class gradients
  .rocket & { background: linear-gradient(135deg, #1a0505 0%, #050202 100%); }
  .cazabichos & { background: linear-gradient(135deg, #051405 0%, #020602 100%); }
  .entrenador & { background: linear-gradient(135deg, #050a14 0%, #020406 100%); }
  .criador & { background: linear-gradient(135deg, #0a0514 0%, #030206 100%); }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 70% 30%, var(--cls-color) 0%, transparent 50%);
    opacity: 0.08;
    pointer-events: none;
  }
}

.dashboard-sidebar {
  width: 380px;
  padding: 48px 32px;
  background: rgba(0, 0, 0, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;

    .avatar-box {
      position: relative;
      width: 300px;
      height: 300px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 32px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      
      .avatar-glow {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at center, var(--cls-color) 0%, transparent 80%);
        opacity: 0.1;
      }
      
      .trainer-big-img {
        height: 220px;
        image-rendering: pixelated;
        filter: drop-shadow(0 20px 40px rgba(0,0,0,0.8));
        z-index: 1;
        transition: transform 0.3s ease;
      }

      .avatar-mini-circle {
        position: absolute;
        top: 24px;
        left: 24px;
        width: 60px;
        height: 60px;
        background: #1e293b;
        border: 3px solid var(--cls-color);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        z-index: 10;
        box-shadow: 0 8px 25px rgba(0,0,0,0.6), 0 0 15px var(--cls-color)44;

        .avatar-pixel {
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
          
          &.no-border {
            border: none !important;
            box-shadow: none !important;
          }
        }
      }
    }

  .class-main-title {
    font-family: 'Press Start 2P', cursive;
    font-size: 20px;
    color: var(--cls-color);
    margin-bottom: 16px;
    text-shadow: 0 0 20px var(--cls-color)66;
    @include pixelated;
  }

  .class-slogan {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
    line-height: 1.6;
    margin-bottom: 48px;
    padding: 0 10px;
    font-family: 'Outfit', sans-serif;
  }
}

.rank-cards {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .rank-card {
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    text-align: left;
    transition: all 0.2s;

    &:hover { background: rgba(15, 23, 42, 0.6); transform: translateX(5px); }

    .card-icon { 
      width: 48px; height: 48px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; 
    }
    .card-text {
      display: flex;
      flex-direction: column;
      .label { font-size: 8px; font-family: 'Press Start 2P', cursive; color: rgba(255,255,255,0.4); margin-bottom: 8px; }
      .value { font-family: 'Press Start 2P', cursive; font-size: 14px; color: #fff; }
      .highlight { color: var(--yellow); }
    }
  }
}

.dashboard-main {
  flex: 1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  overflow-y: auto;
}

.details-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    
    .header-line {
      width: 4px;
      height: 24px;
      background: #22c55e;
      border-radius: 2px;
      box-shadow: 0 0 10px #22c55e;
      &.red { background: #ef4444; box-shadow: 0 0 10px #ef4444; }
    }
    
    h2 {
      font-family: 'Press Start 2P', cursive;
      font-size: 11px;
      color: #fff;
      letter-spacing: 1px;
      @include pixelated;
    }
  }
}

.abilities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .ability-item {
    background: rgba(15, 23, 42, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s;
    border-left: 3px solid #22c55e;

    &:hover { background: rgba(255, 255, 255, 0.06); }

    .ability-checkbox { 
      width: 28px; height: 28px;
      background: rgba(0,0,0,0.4);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; 
    }
    .ability-content { flex: 1; p { font-size: 13px; color: #cbd5e1; margin: 0; } }
    .ability-help {
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: #ef4444; cursor: help;
      font-weight: 900;
    }

    &.limitation { 
      border-left: 3px solid #ef4444; 
      border-color: rgba(239, 68, 68, 0.3);
    }

    &.locked { 
      opacity: 0.7;
      .ability-checkbox { filter: #{"Grayscale(1)"}; opacity: 0.5; }
      .ability-content p { color: #64748b; }
    }

    .req-hint {
      display: block;
      font-size: 9px;
      color: rgba(255,255,255,0.3);
      margin-top: 4px;
    }

    .lv-badge {
      font-family: 'Press Start 2P', cursive;
      font-size: 8px;
      background: rgba(255, 255, 255, 0.1);
      padding: 4px 8px;
      border-radius: 4px;
      color: #94a3b8;
    }

    .text-locked { color: #64748b !important; }
  }
}

.dashboard-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;

  .missions-btn-wide {
    width: 100%;
    padding: 24px;
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    border: none;
    border-radius: 50px;
    color: #fff;
    font-family: 'Press Start 2P', cursive;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
    @include pixelated;
    &:hover { transform: translateY(-4px); box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); filter: brightness(1.1); }
  }

  .action-footer {
    display: flex;
    gap: 16px;
    
    button {
      flex: 1;
      padding: 18px;
      border-radius: 14px;
      font-family: 'Press Start 2P', cursive;
      font-size: 9px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      @include pixelated;
    }

    .btn-secondary {
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.1);
      color: #fff;
      justify-content: flex-start;
      padding: 12px 20px;
      
      .btn-label-stack {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        text-align: left;
      }
      
      .btn-label { font-size: 8px; color: #94a3b8; }
      .price { color: var(--yellow); font-size: 9px; }
      .icon { font-size: 16px; opacity: 0.6; }

      &:hover { background: #2d3748; color: #fff; .btn-label { color: #fff; } }
    }

    .btn-primary {
      background: #ef4444;
      color: #fff;
      border: 2px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
      font-size: 10px;
      
      .check-icon {
        color: #94a3b8;
        font-size: 14px;
        margin-right: 8px;
        font-weight: bold;
      }

      &:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 0 30px rgba(239, 68, 68, 0.6); }
    }
  }
}

@keyframes pulse {
  0% { transform: Scale(1); opacity: 0.1; }
  50% { transform: Scale(1.1); opacity: 0.2; }
  100% { transform: Scale(1); opacity: 0.1; }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
</style>
