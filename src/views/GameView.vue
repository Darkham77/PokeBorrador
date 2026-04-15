<script setup>
import HUD from '@/components/HUD.vue'
import LegacyInterface from '@/components/LegacyInterface.vue'
</script>

<template>
  <div class="game-view">
    <div class="stars"></div>
    <div class="game-container">
      <HUD />
      
      <main class="content-area">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <nav class="bottom-nav">
        <router-link to="/" class="nav-item" active-class="active">
          <span>🗺️</span>
          <span>Mapa</span>
        </router-link>
        <router-link to="/team" class="nav-item" active-class="active">
          <span>🐾</span>
          <span>Equipo</span>
        </router-link>
        <router-link to="/pokedex" class="nav-item" active-class="active">
          <span>📖</span>
          <span>Pokedex</span>
        </router-link>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  min-height: 100vh;
  background: var(--darker);
  color: white;
  padding: 20px;
}

.game-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 40px);
}

.content-area {
  flex: 1;
  padding-top: 100px; /* Space for the floating HUD */
  padding-bottom: 90px; /* Space for the floating bottom nav */
}

@media (max-width: 768px) {
  .content-area {
    padding-top: 85px;
  }
}

.bottom-nav {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(18, 18, 20, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 8px 16px;
  display: flex;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--gray);
  font-size: 11px;
  font-weight: bold;
  transition: all 0.2s;
}

.nav-item span:first-child {
  font-size: 18px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item.active {
  background: rgba(255, 217, 61, 0.1);
  color: var(--yellow);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 768px) {
  .game-view {
    padding: 10px;
  }
  .bottom-nav {
    width: 90%;
    bottom: 10px;
    justify-content: space-around;
  }
}
</style>
