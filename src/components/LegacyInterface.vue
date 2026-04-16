<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import BackpackView from '@/components/BackpackView.vue'
import BoxView from '@/components/BoxView.vue'
import PokedexView from '@/components/PokedexView.vue'
import HealOverlay from '@/components/HealOverlay.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const gameStore = useGameStore()
const gs = computed(() => gameStore.state)
const isProfileOpen = ref(false)
const isSettingsOpen = ref(false)
const isHistoryOpen = ref(false)
const isLibraryOpen = ref(false)

// Bindings for Legacy Globals
const execTryCatch = () => window.tryCatch && window.tryCatch()
const execShowBattleSwitch = () => window.showBattleSwitch && window.showBattleSwitch()
const execShowBattleBag = () => window.showBattleBag && window.showBattleBag()
const execRunFromBattle = () => window.runFromBattle && window.runFromBattle()

// Reactive profile system
const profileData = ref({
  username: '—',
  email: '—',
  isAdmin: false,
  level: 1,
  badges: 0,
  money: 0,
  battleCoins: 0,
  stats: {
    wins: 0,
    trainersDefeated: 0
  },
  faction: null,
  nick_style: '',
  notificationHistory: [],
  lastSave: 'Sin datos'
})

// Navigation logic (Vue-native)
const toggleProfile = () => { isProfileOpen.value = !isProfileOpen.value; };
const toggleSettings = () => { isSettingsOpen.value = !isSettingsOpen.value; };
const toggleLibrary = () => {
  isLibraryOpen.value = !isLibraryOpen.value;
  if (isLibraryOpen.value && typeof window.switchLibraryTab === 'function') {
    // Small delay to ensure DOM is ready before legacy script probes it
    setTimeout(() => {
      const firstTab = document.querySelector('.library-nav-item');
      if (firstTab) window.switchLibraryTab('gimnasios', firstTab);
    }, 50);
  }
};

// Bridge for Legacy -> Vue syncing
if (typeof window !== 'undefined') {
  window.updateVueProfile = (data) => {
    profileData.value = { ...profileData.value, ...data };
  };
  window.gameStore = gameStore;
  window.authStore = authStore;
  window.triggerVueSync = () => {
    if (window.state && typeof gameStore.syncFromLegacy === 'function') {
      gameStore.syncFromLegacy(window.state);
    }
  };
  window.doLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      authStore.logout()
    }
  };
  window.closeProfile = () => { isProfileOpen.value = false; };
  window.toggleProfile = toggleProfile;
  window.toggleSettings = toggleSettings;
  window.toggleLibrary = toggleLibrary;
}

onMounted(() => {
  // Safe initialization
  if (typeof window !== 'undefined') {
    // These block the legacy from trying to render into missing DOM
    // and notify Vue that a state change might have occurred
    window.renderBox = () => { window.triggerVueSync(); }
    window.renderBag = () => { window.triggerVueSync(); }
    window.renderPokedex = () => { window.triggerVueSync(); }
    
    // Zoom Initialization (Restores previous session's zoom scale)
    window.updateZoom = (val) => {
      const zoom = val / 100;
      document.documentElement.style.setProperty('--app-zoom', zoom);
      const zoomValue = document.getElementById('zoom-value');
      if (zoomValue) zoomValue.innerText = `${val}%`;
      const slider = document.getElementById('zoom-slider');
      if (slider) slider.value = val;
      localStorage.setItem('app-zoom', val);
    };

    window.initZoom = () => {
      const saved = localStorage.getItem('app-zoom') || '100';
      window.updateZoom(saved);
    };

    window.initZoom();

    // Link selection state to Pinia store for robust reactivity
    window.uiSelectionState = gameStore.state.uiSelection;

    window.toggleTeamRocketMode = () => {
      if (window.state?.playerClass !== 'rocket') return;
      const ui = gameStore.state.uiSelection;
      ui.teamRocketMode = !ui.teamRocketMode;
      ui.teamRocketSelected = [];
      
      const grid = document.getElementById('team-grid');
      const btnRocket = document.getElementById('btn-rocket-mode');
      const btnConfirm = document.getElementById('btn-confirm-rocket');
      const btnCancel = document.getElementById('btn-cancel-rocket');
      const hint = document.getElementById('rocket-hint');
      
      if (grid) {
        grid.dataset.rocketMode = ui.teamRocketMode;
        if (ui.teamRocketMode) {
          grid.dataset.releaseMode = 'false';
          if (document.getElementById('release-hint')?.style.display === 'block') {
             window.toggleReleaseMode?.();
          }
        }
      }
      
      if (btnRocket) btnRocket.style.display = ui.teamRocketMode ? 'none' : 'inline-block';
      if (btnConfirm) btnConfirm.style.display = ui.teamRocketMode ? 'inline-block' : 'none';
      if (btnCancel) btnCancel.style.display = ui.teamRocketMode ? 'inline-block' : 'none';
      if (hint) hint.style.display = ui.teamRocketMode ? 'block' : 'none';
      
      if (typeof window.renderTeam === 'function') window.renderTeam();
      window.triggerVueSync();
    };

    window.toggleTeamRocketSelect = (index) => {
      const ui = gameStore.state.uiSelection;
      const idx = ui.teamRocketSelected.indexOf(index);
      if (idx > -1) {
        ui.teamRocketSelected.splice(idx, 1);
      } else {
        ui.teamRocketSelected.push(index);
      }
      if (typeof window.renderTeam === 'function') window.renderTeam();
      window.triggerVueSync();
    };

    window.confirmTeamRocketSell = () => {
      const ui = window.uiSelectionState;
      if (!ui.teamRocketSelected || ui.teamRocketSelected.length === 0) {
        if (typeof window.notify === 'function') window.notify('No seleccionaste ningún Pokémon.', '❓');
        return;
      }

      let totalPrice = 0;
      ui.teamRocketSelected.forEach(i => {
        const p = window.state.team[i];
        if (!p) return;
        const ivs = p.ivs || {};
        const totalIv = Object.values(ivs).reduce((s, v) => s + (v || 0), 0);
        // Standard formula: (Level * 50 + (IV% * 500)) * 0.8
        const price = Math.floor((p.level * 50 + (totalIv / 186) * 500) * 0.8);
        totalPrice += price;
      });

      if (confirm(`¿Vender ${ui.teamRocketSelected.length} Pokémon al Mercado Negro por ₽${totalPrice.toLocaleString()}?\n\n¡Esta acción es irreversible!`)) {
        const indices = [...ui.teamRocketSelected].sort((a, b) => b - a);
        indices.forEach(i => {
          const p = window.state.team.splice(i, 1)[0];
          if (p && typeof window.returnHeldItem === 'function') window.returnHeldItem(p);
        });

        window.state.money = (window.state.money || 0) + totalPrice;
        window.state.classData = window.state.classData || {};
        window.state.classData.blackMarketSales = (window.state.classData.blackMarketSales || 0) + indices.length;
        
        if (typeof window.addCriminality === 'function') {
          window.addCriminality(indices.length * 15);
        }
        if (typeof window.addClassXP === 'function') {
          window.addClassXP(25 * indices.length);
        }

        ui.teamRocketMode = false;
        ui.teamRocketSelected = [];

        const grid = document.getElementById('team-grid');
        if (grid) grid.dataset.rocketMode = 'false';
        
        const btnRocket = document.getElementById('btn-rocket-mode');
        const btnConfirm = document.getElementById('btn-confirm-rocket');
        const btnCancel = document.getElementById('btn-cancel-rocket');
        const hint = document.getElementById('rocket-hint');
        
        if (btnRocket) btnRocket.style.display = 'inline-block';
        if (btnConfirm) btnConfirm.style.display = 'none';
        if (btnCancel) btnCancel.style.display = 'none';
        if (hint) hint.style.display = 'none';

        if (typeof window.renderTeam === 'function') window.renderTeam();
        if (typeof window.updateHud === 'function') window.updateHud();
        if (typeof window.scheduleSave === 'function') window.scheduleSave();
        window.triggerVueSync();
        if (typeof window.notify === 'function') window.notify(`¡${indices.length} Pokémon vendidos por ₽${totalPrice.toLocaleString()}! 💰`, '🚀');
      }
    };

    // Force initial HUD update
    if (typeof window.updateHud === 'function') {
      window.updateHud();
    }
    
    // Watchdog sync: sometimes legacy state or Vue store mount in different order
    const syncFunc = () => {
      if (window.state && typeof gameStore.syncFromLegacy === 'function') {
        gameStore.syncFromLegacy(window.state);
      }
    };
    
    syncFunc();
    const watchdog = setInterval(syncFunc, 1000);
    setTimeout(() => clearInterval(watchdog), 5000);

    // Initial UI state setup (Delayed to allow DOM completion)
    setTimeout(() => {
      // BATTLE SCROLL LOCK: Observe legacy battle screen activation
      const battleScreen = document.getElementById('battle-screen');
      if (battleScreen) {
        const observer = new MutationObserver(() => {
          const isActive = battleScreen.classList.contains('active');
          document.body.classList.toggle('is-battle-active', isActive);
        });
        observer.observe(battleScreen, { attributes: true, attributeFilter: ['class'] });
        
        // Initial state check
        if (battleScreen.classList.contains('active')) {
          document.body.classList.add('is-battle-active');
        }
      }

      const uiState = gameStore.state.uiSelection;
      if (typeof window.renderMaps === 'function' && uiState.activeTab === 'map') {
        window.renderMaps();
      }
      if (typeof window.updateFactionBadge === 'function') {
        window.updateFactionBadge();
      }
    }, 1200);

    // Final fallback for the Map territories
    setTimeout(() => {
      if (typeof window.renderMaps === 'function' && uiState.activeTab === 'map') {
        const mapList = document.getElementById('map-list');
        if (mapList && mapList.innerHTML === '') {
          window.renderMaps();
        }
      }
    }, 2500);
    // Click-outside listener to close HUD menus
    const handleOutsideClick = (e) => {
      const isNavClick = e.target.closest('.hud-group, .nav-group, .group-btn');
      if (!isNavClick) {
        document.querySelectorAll('.hud-group.is-open, .nav-group.is-open').forEach(g => {
          g.classList.remove('is-open');
        });
      }
    };
    
    document.addEventListener('click', handleOutsideClick);
    
    onUnmounted(() => {
      document.removeEventListener('click', handleOutsideClick);
      clearInterval(watchdog);
    });
  }
});

// Use reactive object instead of individual refs to avoid collisions
const uiState = reactive({
  activeTab: 'map'
})

function handleTabChange(tab, event) {
  uiState.activeTab = tab
  if (typeof window.showTab === 'function') {
    const btn = event?.target?.closest('.hud-nav-btn') || document.querySelector(`[data-tab="${tab}"]`);
    window.showTab(tab, btn)
  }
  
  if (tab === 'map' && typeof window.renderMaps === 'function') {
    // Force immediate display update before rendering
    setTimeout(() => {
      const mapList = document.getElementById('map-list');
      if (mapList) {
        window.renderMaps();
        // Fallback for empty grid
        setTimeout(() => {
          if (mapList.innerHTML === '') window.renderMaps();
        }, 300);
      }
    }, 50);
  }
}

// Time cycle logic
const dayCycle = computed(() => {
  const cycle = (typeof window.getDayCycle === 'function') ? window.getDayCycle() : 'day';
  const info = {
    morning: { icon: '🌅', label: 'Amanecer', color: '#FFD93D' },
    day: { icon: '☀️', label: 'Día', color: '#FFEEAD' },
    dusk: { icon: '🌅', label: 'Atardecer', color: '#FF6B35' },
    night: { icon: '🌙', label: 'Noche', color: '#9b4dca' }
  }
  return info[cycle] || { icon: '☀️', label: 'Día', color: '#FFEEAD' }
})

// Experience bar logic
const trainerExpPct = computed(() => {
  if (!gs.value.expNeeded || gs.value.expNeeded === 0) return 0
  return Math.min(100, (gs.value.exp / gs.value.expNeeded) * 100)
})
</script>

<template>
  <!-- TITLE SCREEN -->
  <div
    id="title-screen"
    class="screen zoom-target"
    :class="{ active: !gs.starterChosen }"
  >
    <div class="title-logo">
      Poké Vicio
    </div>
    <div class="title-sub">
      Te reto a dejar de jugarlo
    </div>
    <p style="color:var(--gray);font-size:14px;margin-bottom:30px;">
      Elegí tu Pokémon inicial para comenzar tu aventura
    </p>
    <div class="starter-grid">
      <div
        class="starter-card grass"
        onclick="chooseStarter('bulbasaur')"
      >
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          <img
            id="starter-img-bulbasaur"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png"
            alt="Bulbasaur"
            class="starter-emoji"
            style="width:80px;height:80px;image-rendering:pixelated;"
          >
          <span
            id="starter-emo-bulbasaur"
            class="starter-emoji"
            style="font-size:60px;display:none;"
          >🌿</span>
        </div>
        <div class="starter-name">
          Bulbasaur
        </div>
        <span class="starter-type type-grass">🌿 Planta</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>45</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>49</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>49</span>
          </div>
        </div>
      </div>
      <div
        class="starter-card fire"
        onclick="chooseStarter('charmander')"
      >
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          <img
            id="starter-img-charmander"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png"
            alt="Charmander"
            class="starter-emoji"
            style="width:80px;height:80px;image-rendering:pixelated;"
          >
          <span
            id="starter-emo-charmander"
            class="starter-emoji"
            style="font-size:60px;display:none;"
          >🔥</span>
        </div>
        <div class="starter-name">
          Charmander
        </div>
        <span class="starter-type type-fire">🔥 Fuego</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>39</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>52</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>43</span>
          </div>
        </div>
      </div>
      <div
        class="starter-card water"
        onclick="chooseStarter('squirtle')"
      >
        <div style="display:flex; justify-content:center; margin-bottom:12px;">
          <img
            id="starter-img-squirtle"
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png"
            alt="Squirtle"
            class="starter-emoji"
            style="width:80px;height:80px;image-rendering:pixelated;"
          >
          <span
            id="starter-emo-squirtle"
            class="starter-emoji"
            style="font-size:60px;display:none;"
          >💧</span>
        </div>
        <div class="starter-name">
          Squirtle
        </div>
        <span class="starter-type type-water">💧 Agua</span>
        <div class="starter-stats">
          <div class="stat-mini">
            <span>HP</span><span>44</span>
          </div>
          <div class="stat-mini">
            <span>Ataque</span><span>48</span>
          </div>
          <div class="stat-mini">
            <span>Defensa</span><span>65</span>
          </div>
        </div>
      </div>
    </div>
    <div style="margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
      <button
        onclick="if(window.authStore) window.authStore.logout(); else if(window.doLogout) window.doLogout();" 
        class="logout-btn-trigger"
        style="background: rgba(239, 68, 68, 0.12); border: 1.5px solid rgba(239, 68, 68, 0.35); color: #ff7676; padding: 14px 28px; border-radius: 14px; font-family: 'Press Start 2P', monospace; font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; min-width: 220px; transition: all 0.2s; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);"
      >
        <i
          class="fas fa-sign-out-alt"
          style="font-size: 11px;"
        /> 
        <span>CERRAR SESIÓN</span>
      </button>
      <div style="font-size: 10px; color: var(--gray); font-style: italic; opacity: 0.8;">
        ¿Te equivocaste de cuenta? Cierra sesión para volver al login.
      </div>
    </div>
  </div>

  <div
    v-if="gs.starterChosen"
    class="hud-container"
  >
    <div class="hud">
      <div
        id="hud-trainer-panel"
        class="hud-trainer"
        onclick="if(typeof openClassInfoPanel==='function')openClassInfoPanel()"
        style="cursor:pointer;"
      >
        <span
          id="hud-class-avatar"
          class="trainer-avatar"
          v-html="gs.avatar_style || '👤'"
        />
        <div>
          <div
            id="hud-name"
            :class="['trainer-name', gs.nick_style]"
          >
            {{ gs.trainer || 'Entrenador' }}
          </div>
          <div class="trainer-info">
            Entrenador Nv.<span id="trainer-level">{{ gs.level }}</span>
          </div>
          <div style="margin-top:5px;background:rgba(255,255,255,0.1);border-radius:10px;height:5px;width:140px;overflow:hidden;">
            <div
              id="trainer-exp-bar"
              :style="{ width: trainerExpPct + '%' }"
              style="height:100%;background:linear-gradient(90deg,#C77DFF,#9b4dca);border-radius:10px;transition:width 0.5s;"
            />
          </div>
          <div
            id="hud-class-label"
            style="display:none;margin-top:4px;font-size:8px;font-family:'Press Start 2P',monospace;"
          />
        </div>
      </div>

      <!-- PC NAVIGATION (HUD CENTER) -->
      <div class="hud-nav">
        <!-- 1. MAPA -->
        <div class="pv-tooltip-container pv-to-bottom">
          <button
            class="hud-nav-btn map-btn"
            :class="{ active: uiState.activeTab === 'map' }"
            data-tab="map"
            @click="handleTabChange('map', $event)"
          >
            <span>🗺️</span><span>Mapa</span>
          </button>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">MAPA</span>
            <span class="pv-tooltip-desc">Explora las rutas de Kanto y encuentra Pokémon.</span>
          </div>
        </div>

        <!-- 2. POKÉMON (Grupo) -->
        <div class="hud-group">
          <div class="pv-tooltip-container pv-to-bottom">
            <button
              class="hud-nav-btn group-btn"
              onclick="toggleGroupMenu(event, this)"
            >
              <span>🔋</span><span>Pokémon</span>
            </button>
            <div class="pv-tooltip">
              <span class="pv-tooltip-title">POKÉMON</span>
              <span class="pv-tooltip-desc">Gestiona tu equipo, caja y Pokédex.</span>
            </div>
          </div>
          <div class="hud-submenu">
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'team' }"
              data-tab="team"
              @click="handleTabChange('team', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>🐛</span><span>Equipo</span>
            </button>
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'box' }"
              data-tab="box"
              @click="handleTabChange('box', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>📦</span><span>Caja PC</span>
            </button>
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'pokedex' }"
              data-tab="pokedex"
              @click="handleTabChange('pokedex', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>📖</span><span>Pokédex</span>
            </button>
          </div>
        </div>

        <!-- 3. ACCESOS DIRECTOS -->
        <div class="pv-tooltip-container pv-to-bottom">
          <button
            class="hud-nav-btn"
            :class="{ active: uiState.activeTab === 'bag' }"
            data-tab="bag"
            @click="handleTabChange('bag', $event)"
          >
            <span>🎒</span><span>Mochila</span>
          </button>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">MOCHILA</span>
            <span class="pv-tooltip-desc">Usa objetos curativos y Poké Balls.</span>
          </div>
        </div>
        <div class="pv-tooltip-container pv-to-bottom">
          <button
            class="hud-nav-btn"
            :class="{ active: uiState.activeTab === 'gyms' }"
            data-tab="gyms"
            @click="handleTabChange('gyms', $event)"
          >
            <span>🏆</span><span>Gims</span>
          </button>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">GIMNASIOS</span>
            <span class="pv-tooltip-desc">Desafía a los líderes de gimnasio de Kanto.</span>
          </div>
        </div>
        <div class="pv-tooltip-container pv-to-bottom">
          <button
            class="hud-nav-btn"
            :class="{ active: uiState.activeTab === 'daycare' }"
            data-tab="daycare"
            style="position:relative;"
            @click="handleTabChange('daycare', $event)"
          >
            <span>🥚</span><span>Crianza</span>
            <span
              id="daycare-nav-badge"
              style="display:none;position:absolute;top:4px;right:4px;background:var(--red);color:#fff;font-size:8px;font-weight:900;min-width:14px;height:14px;border-radius:50%;padding:0;line-height:14px;text-align:center;font-family:'Press Start 2P',monospace;z-index:2;"
            />
          </button>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">CRIANZA</span>
            <span class="pv-tooltip-desc">Cuida de tus huevos y hazlos eclosionar.</span>
          </div>
        </div>

        <!-- 4. MARKET (Grupo) -->
        <div class="hud-group">
          <div class="pv-tooltip-container pv-to-bottom">
            <button
              class="hud-nav-btn group-btn"
              onclick="toggleGroupMenu(event, this)"
            >
              <span>🏪</span><span>Market</span>
            </button>
            <div class="pv-tooltip">
              <span class="pv-tooltip-title">MARKET</span>
              <span class="pv-tooltip-desc">Compra objetos y negocia con otros jugadores.</span>
            </div>
          </div>
          <div class="hud-submenu">
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'online-market' }"
              data-tab="online-market"
              @click="handleTabChange('online-market', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>🛒</span><span>Global</span>
            </button>
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'market' }"
              data-tab="market"
              @click="handleTabChange('market', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>🏪</span><span>Tienda</span>
            </button>
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'trainer-shop' }"
              data-tab="trainer-shop"
              @click="handleTabChange('trainer-shop', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>🎖️</span><span>BC</span>
            </button>
          </div>
        </div>

        <!-- 5. SOCIAL (Grupo) -->
        <div class="hud-group">
          <div class="pv-tooltip-container pv-to-bottom">
            <button
              class="hud-nav-btn group-btn"
              onclick="toggleGroupMenu(event, this)"
              style="position:relative;"
            >
              <span>👥</span><span>Social</span>
              <span
                id="friends-nav-badge"
                style="display:none;position:absolute;top:4px;right:4px;background:var(--red);color:#fff;font-size:8px;font-weight:900;min-width:14px;height:14px;border-radius:50%;padding:0;line-height:14px;text-align:center;font-family:'Press Start 2P',monospace;z-index:2;"
              />
            </button>
            <div class="pv-tooltip">
              <span class="pv-tooltip-title">SOCIAL</span>
              <span class="pv-tooltip-desc">Interactúa con amigos y participa en guerras.</span>
            </div>
          </div>
          <div class="hud-submenu">
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'friends' }"
              data-tab="friends"
              @click="handleTabChange('friends', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>🤝</span><span>Amigos</span>
            </button>
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'war' }"
              data-tab="war"
              @click="handleTabChange('war', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>⚔️</span><span>Guerra</span>
            </button>
            <button
              class="hud-nav-btn"
              :class="{ active: uiState.activeTab === 'ranked' }"
              data-tab="ranked"
              @click="handleTabChange('ranked', $event); $event.target.closest('.hud-group').classList.remove('is-open')"
            >
              <span>🏆</span><span>PvP</span>
            </button>
          </div>
        </div>
      </div>

      <div class="hud-items">
        <!-- CICLO HORARIO REACTIVO -->
        <div
          id="time-cycle-display"
          class="hud-pill time-pill pv-tooltip-container pv-to-bottom"
        >
          <span id="time-icon">{{ dayCycle.icon }}</span>
          <span
            id="time-label"
            class="pill-value"
            :style="{ color: dayCycle.color }"
            style="font-size: 10px;"
          >{{ dayCycle.label }}</span>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">CICLO HORARIO</span>
            <span class="pv-tooltip-desc">El mundo cambia cada 4 horas. ¡Diferentes Pokémon aparecen según la hora!</span>
          </div>
        </div>

        <!-- DINERO -->
        <div class="hud-pill money-pill pv-tooltip-container pv-to-bottom">
          <span>₱</span>
          <span
            id="hud-money"
            class="pill-value"
          >{{ (gs.money || 0).toLocaleString() }}</span>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">POKÉ-PESOS (₱)</span>
            <span class="pv-tooltip-desc">Moneda principal.</span>
          </div>
        </div>

        <!-- BC -->
        <div class="hud-pill bc-pill pv-tooltip-container pv-to-bottom">
          <i class="fas fa-coins" />
          <span
            id="hud-bc"
            class="pill-value"
          >{{ (gs.battleCoins || 0).toLocaleString() }}</span>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">BC</span>
            <span class="pv-tooltip-desc">Moneda de élite.</span>
          </div>
        </div>

        <!-- MEDALLAS -->
        <div class="hud-pill badge-pill pv-tooltip-container pv-to-bottom">
          <i class="fas fa-medal" />
          <span
            id="badge-count"
            class="pill-value"
          >{{ gs.badges }}</span>
          <div class="pv-tooltip">
            <span class="pv-tooltip-title">MEDALLAS</span>
          </div>
        </div>

        <!-- BALLS -->
        <div class="hud-pill ball-pill pv-tooltip-container pv-to-bottom">
          <div
            class="ball-icon-wrap"
            style="height: 24px; display: flex; align-items: center;"
          >
            <img
              src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40' width='40' height='40'><circle cx='20' cy='20' r='19' fill='%23222' stroke='%23111' stroke-width='1.5'/><path d='M1 20 A19 19 0 0 1 39 20 Z' fill='%23e63030'/><path d='M1 20 A19 19 0 0 0 39 20 Z' fill='%23f5f5f5'/><rect x='1' y='18' width='38' height='4' fill='%23111'/><circle cx='20' cy='20' r='6' fill='%23111'/><circle cx='20' cy='20' r='4' fill='%23f5f5f5'/><circle cx='18' cy='18' r='1.2' fill='%23ffffff' opacity='0.7'/></svg>"
              width="24"
              height="24"
            >
          </div>
          <span
            id="ball-count"
            class="pill-value"
          >{{ gs.balls }}</span>
        </div>

        <!-- HUEVOS -->
        <div
          id="hud-egg-container"
          class="hud-pill egg-pill pv-tooltip-container pv-to-bottom"
          onclick="toggleProfile()"
        >
          <i class="fas fa-egg" />
          <span
            id="egg-count"
            class="pill-value"
          >{{ gs.eggs ? gs.eggs.length : 0 }}</span>
        </div>

        <!-- AJUSTES Y PERFIL -->
        <div class="hud-actions">
          <div class="pv-tooltip-container pv-to-bottom">
            <button
              class="hud-action-btn"
              @click="toggleSettings()"
            >
              ⚙️
            </button>
            <div class="pv-tooltip">
              <span class="pv-tooltip-title">AJUSTES</span>
              <span class="pv-tooltip-desc">Configura el audio, zoom y opciones de cuenta.</span>
            </div>
          </div>
          
          <div class="pv-tooltip-container pv-to-bottom">
            <button
              class="hud-action-btn profile-btn"
              @click="toggleProfile()"
            >
              👤
            </button>
            <div class="pv-tooltip">
              <span class="pv-tooltip-title">MI PERFIL</span>
              <span class="pv-tooltip-desc">Ver tus estadísticas, medallas y logros.</span>
            </div>
          </div>

          <div class="pv-tooltip-container pv-to-bottom">
            <button
              class="hud-action-btn library-btn"
              @click="toggleLibrary()"
            >
              📖 <span>Biblioteca</span>
            </button>
            <div class="pv-tooltip">
              <span class="pv-tooltip-title">BIBLIOTECA</span>
              <span class="pv-tooltip-desc">Diccionario de Pokémon, MTs y guías del juego.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div
    id="game-screen"
    class="screen"
    :class="{ active: gs.starterChosen }"
  >
    <!-- ZOOMABLE CONTENT AREA (Wraps Map, Battle, and Overlays) -->
    <div
      id="zoomable-content"
      class="zoom-target"
      style="flex:1; display:flex; flex-direction:column; overflow:hidden;"
    >
      <div
        id="tab-map"
        class="tab-content"
        :style="{ display: uiState.activeTab === 'map' ? 'block' : 'none' }"
      >
        <div
          id="map-list"
          class="map-grid"
        />
      </div>

      <div
        id="tab-team"
        class="tab-content"
        :style="{ display: uiState.activeTab === 'team' ? 'block' : 'none' }"
      >
        <div class="team-section">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
            <div
              class="section-title"
              style="margin-bottom:0;"
            >
              ⚡ Mi Equipo
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <!-- Equipo Rocket: Venta Masiva -->
              <button
                v-if="gs.playerClass === 'rocket'"
                id="btn-rocket-mode"
                onclick="toggleTeamRocketMode()"
                style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                           border-radius:10px;border:1px solid rgba(239,68,68,0.4);
                           background:rgba(239,68,68,0.1);color:#ef4444;cursor:pointer;transition:all .2s;"
              >
                🚀 VENTA MASIVA
              </button>
              <button
                id="btn-confirm-rocket"
                onclick="confirmTeamRocketSell()" 
                style="display:none;font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                           border-radius:10px;border:none;
                           background:linear-gradient(135deg,#ef4444,#b91c1c);color:#fff;cursor:pointer;box-shadow: 0 4px 15px rgba(239,68,68,0.3);"
              >
                ✓ VENDER
              </button>
              <button
                id="btn-cancel-rocket"
                onclick="toggleTeamRocketMode()" 
                style="display:none;font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                           border-radius:10px;border:1px solid rgba(255,255,255,0.1);
                           background:transparent;color:var(--gray);cursor:pointer;"
              >
                ✕ CANCELAR
              </button>

              <!-- Sistema Original: Soltar -->
              <button
                id="btn-release-mode"
                onclick="toggleReleaseMode()" 
                style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                           border-radius:10px;border:1px solid rgba(255,100,100,0.4);
                           background:rgba(255,59,59,0.1);color:var(--red);cursor:pointer;transition:all .2s;"
              >
                🌿 SOLTAR
              </button>
              <button
                id="btn-confirm-release"
                onclick="confirmRelease()" 
                style="display:none;font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                           border-radius:10px;border:none;
                           background:linear-gradient(135deg,var(--red),#c0392b);color:#fff;cursor:pointer;"
              >
                ✓ CONFIRMAR
              </button>
              <button
                id="btn-cancel-release"
                onclick="toggleReleaseMode()" 
                style="display:none;font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 12px;
                           border-radius:10px;border:1px solid rgba(255,255,255,0.1);
                           background:transparent;color:var(--gray);cursor:pointer;"
              >
                ✕ CANCELAR
              </button>
            </div>
          </div>
          <div
            id="rocket-hint"
            style="display:none;font-size:11px;color:#ef4444;margin-bottom:12px;
             background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
             border-radius:10px;padding:10px 14px;"
          >
            🚀 Modo Rocket Activo: Seleccioná los Pokémon que querés vender al Mercado Negro.
          </div>
          <div
            id="release-hint"
            style="display:none;font-size:11px;color:var(--red);margin-bottom:12px;
             background:rgba(255,59,59,0.08);border:1px solid rgba(255,59,59,0.2);
             border-radius:10px;padding:10px 14px;"
          >
            ⚠️ Seleccioná los Pokémon que querés soltar. No podés soltar el último del equipo.
          </div>
          <div
            id="team-grid"
            class="team-grid"
          />
        </div>
      </div>

      <div
        id="tab-box"
        class="tab-content"
        :style="{ display: uiState.activeTab === 'box' ? 'block' : 'none' }"
      >
        <BoxView />
      </div>

      <div
        id="tab-pokedex"
        class="tab-content"
        :style="{ display: uiState.activeTab === 'pokedex' ? 'block' : 'none' }"
      >
        <PokedexView />
      </div>

      <div
        id="tab-bag"
        class="tab-content"
        :style="{ display: uiState.activeTab === 'bag' ? 'block' : 'none' }"
      >
        <BackpackView />
      </div>

      <!-- GYMS TAB -->
      <div
        id="tab-gyms"
        class="tab-content"
        style="display:none;"
      >
        <div class="team-section">
          <div class="section-title">
            🏆 Gimnasios de Kanto
          </div>
          <div
            id="gym-list"
            class="gym-list"
          />
        </div>
      </div>

      <!-- DAYCARE TAB -->
      <div
        id="tab-daycare"
        class="tab-content"
        style="display:none;padding-bottom:100px;"
      >
        <div class="team-section">
          <div class="section-title">
            🥚 Guardería Pokémon
          </div>
          <div
            id="daycare-compat-bar"
            style="text-align:center;padding:10px 16px;border-radius:999px; font-size:12px;font-weight:700;margin-bottom:16px;background:rgba(255,255,255,0.05);"
          >
            🔎 Deposita 2 Pokémon para ver compatibilidad
          </div>
          <div
            id="daycare-slots-grid"
            class="daycare-slots-grid"
          >
            <div
              id="daycare-slot-a"
              class="daycare-slot-card"
            >
              <div class="daycare-slot-label">
                Ranura A
              </div>
              <div
                id="slot-a-sprite"
                class="daycare-slot-sprite"
              >
                ❓
              </div>
              <div
                id="slot-a-name"
                class="daycare-slot-name"
              >
                — Vacía —
              </div>
              <div
                id="slot-a-info"
                class="daycare-slot-info"
              />
              <div
                id="slot-a-item-container"
                style="display:none;margin-top:10px;padding:10px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid rgba(255,255,255,0.05);"
              >
                <div id="slot-a-item-selector-wrap">
                  <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-family:'Press Start 2P';">
                    EQUIPAR ÍTEM:
                  </div>
                  <select
                    id="slot-a-item"
                    onchange="updateDaycareSummary()"
                    style="width:100%;padding:8px;border-radius:8px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);outline:none;font-size:11px;margin-bottom:8px;"
                  >
                    <option value="">
                      -- Sin Ítem --
                    </option>
                  </select>
                  <button
                    onclick="confirmDaycareItem('a')"
                    style="width:100%;padding:8px;border-radius:8px;background:rgba(107,203,119,0.15);color:var(--green);border:1px solid rgba(107,203,119,0.3);font-family:'Press Start 2P';font-size:8px;cursor:pointer;"
                  >
                    ✓ CONFIRMAR
                  </button>
                </div>
                <div
                  id="slot-a-confirmed-item-wrap"
                  style="display:none;text-align:center;"
                >
                  <div style="font-size:9px;color:var(--yellow);margin-bottom:6px;font-family:'Press Start 2P';">
                    ÍTEM EQUIPADO:
                  </div>
                  <div
                    id="slot-a-confirmed-item-name"
                    style="font-size:12px;font-weight:800;color:#fff;margin-bottom:8px;"
                  />
                  <button
                    onclick="withdrawDaycareItem('a')"
                    style="width:100%;padding:8px;border-radius:8px;background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);font-family:'Press Start 2P';font-size:8px;cursor:pointer;"
                  >
                    ↩ RETIRAR
                  </button>
                </div>
              </div>
              <button
                id="slot-a-deposit-btn"
                onclick="openDepositModal(0)"
                style="font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 14px;border:none; border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff;margin-top:8px;"
              >
                📥 Depositar
              </button>
              <button
                id="slot-a-withdraw-btn"
                onclick="withdrawFromDaycare(0)"
                style="display:none; font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 14px;border:none; border-radius:10px;cursor:pointer;background:rgba(220,38,38,0.1);color:#f87171; margin-top:8px;border:1px solid rgba(220,38,38,0.2);"
              >
                🚪 Retirar Pokémon
              </button>
            </div>
            <div
              id="daycare-mid-card"
              class="daycare-mid-card"
            />
            <div
              id="daycare-slot-b"
              class="daycare-slot-card"
            >
              <div class="daycare-slot-label">
                Ranura B
              </div>
              <div
                id="slot-b-sprite"
                class="daycare-slot-sprite"
              >
                ❓
              </div>
              <div
                id="slot-b-name"
                class="daycare-slot-name"
              >
                — Vacía —
              </div>
              <div
                id="slot-b-info"
                class="daycare-slot-info"
              />
              <div
                id="slot-b-item-container"
                style="display:none;margin-top:10px;padding:10px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid rgba(255,255,255,0.05);"
              >
                <div id="slot-b-item-selector-wrap">
                  <div style="font-size:9px;color:var(--gray);margin-bottom:6px;font-family:'Press Start 2P';">
                    EQUIPAR ÍTEM:
                  </div>
                  <select
                    id="slot-b-item"
                    onchange="updateDaycareSummary()"
                    style="width:100%;padding:8px;border-radius:8px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.1);outline:none;font-size:11px;margin-bottom:8px;"
                  >
                    <option value="">
                      -- Sin Ítem --
                    </option>
                  </select>
                  <button
                    onclick="confirmDaycareItem('b')"
                    style="width:100%;padding:8px;border-radius:8px;background:rgba(107,203,119,0.15);color:var(--green);border:1px solid rgba(107,203,119,0.3);font-family:'Press Start 2P';font-size:8px;cursor:pointer;"
                  >
                    ✓ CONFIRMAR
                  </button>
                </div>
                <div
                  id="slot-b-confirmed-item-wrap"
                  style="display:none;text-align:center;"
                >
                  <div style="font-size:9px;color:var(--yellow);margin-bottom:6px;font-family:'Press Start 2P';">
                    ÍTEM EQUIPADO:
                  </div>
                  <div
                    id="slot-b-confirmed-item-name"
                    style="font-size:12px;font-weight:800;color:#fff;margin-bottom:8px;"
                  />
                  <button
                    onclick="withdrawDaycareItem('b')"
                    style="width:100%;padding:8px;border-radius:8px;background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2);font-family:'Press Start 2P';font-size:8px;cursor:pointer;"
                  >
                    ↩ RETIRAR
                  </button>
                </div>
              </div>
              <button
                id="slot-b-deposit-btn"
                onclick="openDepositModal(1)"
                style="font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 14px;border:none; border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff;margin-top:8px;"
              >
                📥 Depositar
              </button>
              <button
                id="slot-b-withdraw-btn"
                onclick="withdrawFromDaycare(1)"
                style="display:none; font-family:'Press Start 2P',monospace;font-size:8px;padding:10px 14px;border:none; border-radius:10px;cursor:pointer;background:rgba(220,38,38,0.1);color:#f87171; margin-top:8px;border:1px solid rgba(220,38,38,0.2);"
              >
                🚪 Retirar Pokémon
              </button>
            </div>
          </div>
          <div
            id="daycare-egg-timer"
            style="display:none;text-align:center;padding:14px; background:rgba(255,255,255,0.05);border-radius:14px;margin-bottom:16px;"
          >
            <div style="font-family:'Press Start 2P',monospace;font-size:9px;color:var(--gray);margin-bottom:6px;">
              PRÓXIMO HUEVO EN
            </div>
            <div
              id="daycare-timer-countdown"
              style="font-family:'Press Start 2P',monospace;font-size:18px;color:#22c55e;"
            >
              --:--
            </div>
            <div
              id="daycare-berry-container"
              style="margin-top:12px;display:flex;justify-content:center;align-items:center;gap:10px;"
            >
              <select
                id="daycare-berry-select"
                style="padding:6px;border-radius:8px;background:rgba(0,0,0,0.3);color:#fff;border:1px solid rgba(255,255,255,0.2);outline:none;font-size:11px;"
              >
                <option value="">
                  -- Sin Baya --
                </option>
              </select>
              <button
                onclick="useBreedingBerry()"
                style="padding:6px 12px;border-radius:8px;background:var(--yellow);color:var(--darker);font-size:9px;font-family:'Press Start 2P',monospace;font-weight:900;border:none;cursor:pointer;"
              >
                USAR BAYA
              </button>
            </div>
          </div>
          <div id="daycare-mission-panel" />
          <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div
              class="section-title"
              style="margin:0;font-size:13px;"
            >
              🥚 Almacén de Huevos
            </div>
            <span style="font-size:11px;color:var(--gray);"><span id="daycare-egg-count">0</span>/<span id="daycare-egg-capacity">2</span></span>
          </div>
          <div
            id="daycare-egg-grid"
            style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;"
          >
            <div style="color:var(--gray);font-size:11px;padding:16px 0;">
              Sin huevos en almacén.
            </div>
          </div>
        </div>
      </div>

      <!-- POKEMART TAB -->
      <div
        id="tab-market"
        class="tab-content"
        style="display:none"
      >
        <div class="team-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div
              class="section-title"
              style="margin:0;"
            >
              🛒 PokéMart
            </div>
            <div style="background:rgba(50,215,75,0.15);border:1px solid var(--green);border-radius:12px;padding:8px 16px;">
              <span style="font-size:13px;font-weight:900;color:var(--green);">₽<span id="market-money">0</span></span>
            </div>
          </div>
          <div
            id="market-trainer-level"
            style="margin-bottom:16px;font-size:12px;color:var(--gray);"
          />
          <div style="margin-bottom:14px;">
            <input
              id="market-search-input"
              type="text"
              placeholder="Buscar ítem..."
              oninput="renderMarket()"
              style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:#fff; font-size:13px; font-family:'Nunito',sans-serif; outline:none;"
            >
          </div>
          <div id="market-tabs" />
          <div
            id="market-grid"
            class="market-grid"
            style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;"
          />
        </div>
      </div>

      <!-- TRAINER SHOP TAB -->
      <div
        id="tab-trainer-shop"
        class="tab-content"
        style="display:none"
      >
        <div class="team-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div
              class="section-title"
              style="margin:0;"
            >
              🏅 Tienda del Entrenador
            </div>
            <div style="background:rgba(199,125,255,0.15);border:1px solid var(--purple);border-radius:12px;padding:8px 16px;">
              <span style="font-size:13px;font-weight:900;color:var(--purple);">🪙 <span id="trainer-shop-bc">0</span> BC</span>
            </div>
          </div>
          <div
            id="trainer-shop-level"
            style="margin-bottom:16px;font-size:12px;color:var(--gray);"
          />
          <div style="margin-bottom:14px;">
            <input
              id="trainer-shop-search-input"
              type="text"
              placeholder="Buscar ítem exclusivo..."
              oninput="renderTrainerShop()"
              style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:#fff; font-size:13px; font-family:'Nunito',sans-serif; outline:none;"
            >
          </div>
          <div id="trainer-shop-tabs" />
          <div
            id="trainer-shop-grid"
            style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;"
          />
        </div>
      </div>

      <!-- ONLINE MARKET TAB (GTS) -->
      <div
        id="tab-online-market"
        class="tab-content"
        style="display:none"
      >
        <div
          class="team-section"
          style="max-width:none; width:100%; box-sizing:border-box;"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div
              class="section-title"
              style="margin:0;"
            >
              🌍 Mercado Online
            </div>
            <div style="background:rgba(50,215,75,0.15);border:1px solid var(--green);border-radius:12px;padding:8px 16px;">
              <span style="font-size:13px;font-weight:900;color:var(--green);">₽<span id="online-market-money">0</span></span>
            </div>
          </div>

          <!-- Pestañas internas del mercado online -->
          <div style="display:flex;gap:6px;margin-bottom:20px;background:rgba(255,255,255,0.04);border-radius:14px;padding:5px;border:1px solid rgba(255,255,255,0.07);">
            <button
              id="om-btn-explore"
              onclick="switchOnlineMarketTab('explore')"
              class="market-tab-btn active"
              style="flex:1;"
            >
              🔭 Explorar
            </button>
            <button
              id="om-btn-mine"
              onclick="switchOnlineMarketTab('mine')"
              class="market-tab-btn"
              style="flex:1;"
            >
              📦 Mis Publicaciones
            </button>
            <button
              id="om-btn-publish"
              onclick="switchOnlineMarketTab('publish')"
              class="market-tab-btn"
              style="flex:1;"
            >
              ➕ Vender
            </button>
          </div>

          <div id="om-view-explore">
            <!-- Filtros avanzados dinámicos -->
            <div id="om-explore-filters" />
            <div
              id="om-explore-grid"
              style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;"
            />
          </div>

          <div
            id="om-view-mine"
            style="display:none;"
          >
            <p style="font-size:11px; color:var(--gray); margin-bottom: 12px;">
              Aquí puedes ver tus ítems y Pokémon listados. Recuerda que el mercado cobra un 5% de comisión cuando reclamas tus ganancias.
            </p>
            <div
              id="om-mine-grid"
              style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;"
            />
          </div>

          <div
            id="om-view-publish"
            style="display:none;"
          >
            <div style="margin-bottom: 12px; display:flex; gap:10px;">
              <button
                id="om-pub-sw-pokemon"
                class="action-btn active"
                onclick="switchPublishType('pokemon')"
                style="flex:1;"
              >
                🐗 Vender Pokémon
              </button>
              <button
                id="om-pub-sw-item"
                class="action-btn"
                onclick="switchPublishType('item')"
                style="flex:1;"
              >
                🎒 Vender Ítem
              </button>
            </div>
           
            <!-- Filtros avanzados dinámicos para Vender -->
            <div id="om-publish-filters" />
           
            <!-- Selectores dinámicos -->

            <div
              id="om-publish-selectors"
              style="background:rgba(0,0,0,0.2); padding:14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 14px;"
            />

            <div style="display:flex; gap:10px; align-items:center;">
              <input
                id="om-publish-price"
                type="number"
                placeholder="Precio en ₽"
                style="flex:1; padding:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:12px; color:var(--yellow); font-size:14px; font-weight:bold; font-family:'Nunito',sans-serif; outline:none;"
                min="1"
                max="999999999"
              >
              <button
                onclick="publishToMarket()"
                class="title-btn"
                style="padding: 12px 20px; font-size: 10px; margin-top:0;"
              >
                PUBLICAR
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- FRIENDS TAB -->
      <div
        id="tab-friends"
        class="tab-content"
        style="display:none"
      >
        <div class="team-section">
          <div class="section-title">
            👥 Amigos
          </div>
          <div style="display:flex;gap:8px;margin-bottom:20px;">
            <input
              id="friend-search-input"
              type="text"
              placeholder="Buscar entrenador por nombre..."
              style="flex:1;padding:12px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12); border-radius:12px;color:#eaeaea;font-size:14px;font-family:'Nunito',sans-serif;outline:none;"
              oninput="searchFriends()"
            >
          </div>
          <div
            id="friend-search-results"
            style="margin-bottom:20px;"
          />
          <div
            id="trades-pending-section"
            style="display:none;margin-bottom:20px;"
          >
            <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);margin-bottom:10px;">
              🔄 INTERCAMBIOS PENDIENTES
            </div>
            <div id="trades-pending-list" />
          </div>
          <div
            id="friends-pending-section"
            style="display:none;margin-bottom:20px;"
          >
            <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);margin-bottom:10px;">
              📬 SOLICITUDES PENDIENTES
            </div>
            <div id="friends-pending-list" />
          </div>
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--purple);margin-bottom:12px;">
            🟢 MIS AMIGOS
          </div>
          <div id="friends-list">
            <div class="empty-state">
              Todavía no tenés amigos agregados.<br>Buscá a tu entrenador favorito arriba.
            </div>
          </div>
        </div>
      </div>

      <!-- WAR TAB -->
      <div
        id="tab-war"
        class="tab-content"
        style="display:none;padding-bottom:100px;"
      >
        <div
          class="war-container"
          style="max-width:1800px; margin:0 auto; padding:20px;"
        >
          <div class="war-dashboard-wrapper">
            <aside class="war-sidebar">
              <div class="war-banner-mini">
                <img
                  src="/assets/war_banner.png"
                  alt="Guerra"
                  style="width: 100%; height: auto; display: block; border-radius: 16px;"
                >
              </div>
              <div
                class="section-title"
                style="margin-bottom: 20px; font-size: 16px;"
              >
                ⚔️ Panel de Control
              </div>
              <div id="war-phase-banner" />
              <div
                id="war-score"
                class="war-score-box"
              >
                <div class="score-team union">
                  <span class="team-dot"><img
                    src="/assets/factions/union.png"
                    style="width:24px;height:24px;"
                  ></span><div class="team-info">
                    <span class="team-label">UNIÓN</span><span
                      id="union-maps"
                      class="team-val"
                    >0</span>
                  </div>
                </div>
                <div class="score-vs">
                  VS
                </div>
                <div class="score-team poder">
                  <div
                    class="team-info"
                    style="text-align:right;"
                  >
                    <span class="team-label">PODER</span><span
                      id="poder-maps"
                      class="team-val"
                    >0</span>
                  </div><span class="team-dot"><img
                    src="/assets/factions/poder.png"
                    style="width:24px;height:24px;"
                  ></span>
                </div>
              </div>
              <div class="war-stats-sidebar">
                <div class="war-stat-item">
                  <span class="war-stat-icon"><i class="fa-solid fa-shield" /></span><div class="war-stat-details">
                    <span class="war-stat-label">Bando</span><span
                      id="war-my-faction"
                      class="war-stat-value"
                    >—</span>
                  </div>
                </div>
                <div class="war-stat-item">
                  <span class="war-stat-icon"><i class="fa-solid fa-trophy" /></span><div class="war-stat-details">
                    <span class="war-stat-label">Aporte</span><span
                      id="war-my-pts"
                      class="war-stat-value"
                    >0 PT</span>
                  </div>
                </div>
                <div class="war-stat-item">
                  <span class="war-stat-icon"><i class="fa-solid fa-bolt-lightning" /></span><div class="war-stat-details">
                    <span class="war-stat-label">Coins</span><span
                      id="war-coins-count"
                      class="war-stat-value"
                    >0</span>
                  </div><div
                    class="war-stat-action"
                    onclick="showWarShop()"
                  >
                    TIENDA
                  </div>
                </div>
              </div>
            </aside>
            <main class="war-main-content">
              <div class="war-monitor-header-premium">
                <div class="monitor-title">
                  🛰️ MONITOR DE TERRITORIOS
                </div>
              </div>
              <div
                id="war-kanto-map"
                class="war-grid-premium"
              />
              <div
                id="war-my-defenders-section"
                style="margin-top:30px; display:none;"
              >
                <div class="section-subtitle">
                  🛡️ MIS DEFENSORES
                </div><div
                  id="war-my-defenders-list"
                  class="defenders-grid"
                />
              </div>
            </main>
          </div>
        </div>
      </div>

      <!-- RANKED TAB -->
      <div
        id="tab-ranked"
        class="tab-content"
        style="display:none;padding-bottom:100px;"
      >
        <div class="team-section">
          <!-- Header -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="font-size:32px;">
              🏅
            </div>
            <div>
              <div
                class="section-title"
                style="margin:0;"
              >
                Rankeds
              </div>
              <div style="font-size:11px;color:var(--gray);margin-top:2px;">
                Sistema de clasificación PvP
              </div>
            </div>
          </div>

          <!-- NEW Rank Header Card -->
          <div class="ranked-header-card">
            <div class="rank-badge-container">
              <span
                id="ranked-badge-img"
                class="rank-badge-img"
              >🥉</span>
            </div>

            <div class="rank-info-main">
              <div class="rank-elo-wrapper">
                <div
                  id="ranked-elo-display"
                  class="rank-elo-value"
                >
                  1000
                </div>
                <div class="rank-elo-label">
                  Puntos ELO
                </div>
              </div>
            
              <div
                id="ranked-tier-label"
                style="font-family:'Press Start 2P',monospace; font-size:12px; color:var(--purple); margin-bottom:4px;"
              >
                Bronce
              </div>

              <div class="rank-progress-container">
                <div class="rank-progress-bar-wrap">
                  <div
                    id="ranked-progress-fill"
                    class="rank-progress-bar-fill"
                    style="width: 0%;"
                  />
                </div>
                <div class="rank-next-info">
                  <span id="ranked-next-tier-label">Próximo: Plata</span>
                  <span id="ranked-next-tier-elo">1200 ELO</span>
                </div>
              </div>

              <!-- SEARCH PARTIDA BUTTON (Moved here) -->
              <div style="margin-top:20px;">
                <button
                  id="btn-ranked-search"
                  onclick="startRankedMatchmaking()"
                  style="width:100%;font-family:'Press Start 2P',monospace;font-size:9px;padding:16px;border:none;border-radius:16px;cursor:pointer;
                       background:linear-gradient(135deg,rgba(199,125,255,0.25),rgba(59,139,255,0.15));color:#fff;
                       border:1px solid rgba(199,125,255,0.4);letter-spacing:0.5px;
                       box-shadow:0 4px 20px rgba(199,125,255,0.2);transition:all 0.2s;"
                >
                  🔍 BUSCAR PARTIDA
                </button>
                <div
                  id="ranked-search-status"
                  style="margin-top:10px;display:none;
                background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;text-align:center;"
                >
                  <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--yellow);margin-bottom:6px;">
                    ⏳ Buscando rival...
                  </div>
                  <div
                    id="ranked-search-timer"
                    style="font-size:22px;font-family:'Press Start 2P',monospace;color:var(--purple);margin-bottom:8px;"
                  >
                    60
                  </div>
                  <div style="font-size:11px;color:var(--gray);margin-bottom:10px;">
                    Si no se encuentra un rival en 1 minuto,<br>lucharás contra un equipo pasivo.
                  </div>
                  <button
                    onclick="cancelRankedMatchmaking()"
                    style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 14px;
                  border:1px solid rgba(255,59,59,0.3);border-radius:10px;cursor:pointer;
                  background:rgba(255,59,59,0.08);color:var(--red);"
                  >
                    ✕ Cancelar
                  </button>
                </div>
              </div>
            </div>

            <div class="rank-stats-side">
              <div class="stat-mini-card">
                <span class="stat-mini-label">Victorias</span>
                <span
                  id="ranked-wins"
                  class="stat-mini-value"
                  style="color:var(--green);"
                >0</span>
              </div>
              <div class="stat-mini-card">
                <span class="stat-mini-label">Derrotas</span>
                <span
                  id="ranked-losses"
                  class="stat-mini-value"
                  style="color:var(--red);"
                >0</span>
              </div>
              <div class="stat-mini-card">
                <span class="stat-mini-label">Empates</span>
                <span
                  id="ranked-draws"
                  class="stat-mini-value"
                  style="color:var(--gray);"
                >0</span>
              </div>
              <div class="stat-mini-card">
                <span class="stat-mini-label">Winrate</span>
                <span
                  id="ranked-winrate"
                  class="stat-mini-value"
                  style="color:var(--yellow);"
                >0%</span>
              </div>
            </div>
          </div>

          <!-- NEW Season Hero Section -->
          <div class="season-hero-container">
            <div class="season-banner-side">
              <img
                src="/assets/eventos/pvp.png"
                alt="PVP Ranked"
                class="season-hero-img"
              >
              <div
                id="ranked-season-timer"
                class="ranked-data-season-timer"
                style="margin-top:10px; font-family:'Press Start 2P',monospace; font-size:8px; color:var(--purple); background:rgba(0,0,0,0.4); padding:6px 12px; border-radius:10px; border:1px solid rgba(199,125,255,0.2);"
              >
                60d 12h
              </div>
            </div>
          
            <div class="season-info-side">
              <div class="season-title-mini">
                TEMPORADA ACTUAL
              </div>
              <h2
                class="ranked-data-season-name"
                style="margin:0; font-size:22px; color:#fff;"
              >
                Kanto League
              </h2>
            
              <div style="margin-top:10px;">
                <div style="font-size:10px; color:var(--gray); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">
                  Reglas Activas
                </div>
                <div
                  class="ranked-data-rules-summary"
                  style="font-size:13px; color:#fff; font-weight:800; margin-bottom:12px;"
                >
                  Máximo 6 Pokémon • Nivel 100
                </div>
              
                <div class="ranked-data-rules-types season-rules-chips">
                <!-- Chips dinámicos -->
                </div>
              </div>

              <div style="margin-top:10px;">
                <div style="font-size:10px; color:var(--red); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px;">
                  Pokémon Baneados
                </div>
                <div class="ranked-data-rules-bans season-rules-chips">
                <!-- Chips dinámicos -->
                </div>
              </div>

              <div class="ranked-data-season-dates season-dates-bar">
                Cargando fechas de temporada...
              </div>
              <div
                class="ranked-data-rules-passive-team-status"
                style="font-size:10px; margin-top:5px;"
              >
                Revisando equipo ranked...
              </div>
            </div>
          </div> <!-- Closing season-hero-container -->
        </div>


        <!-- REWARDS TRACK (ELO MILESTONES) -->
        <div
          id="ranked-rewards-track"
          style="margin-bottom:24px;"
        />

        <!-- Desktop Grid Wrapper -->
        <div class="ranked-desktop-grid">
          <!-- Left Column: Team & Rewards -->
          <div class="ranked-grid-col">
            <div style="margin-bottom:16px;">
              <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--green);margin-bottom:10px;">
                🛡️ MI EQUIPO
              </div>
              <div style="background:rgba(107,203,119,0.06);border:1px solid rgba(107,203,119,0.2);border-radius:14px;padding:14px;">
                <div style="font-size:12px;color:var(--gray);margin-bottom:12px;">
                  Este es el equipo que utilizarás para combatir en rankeds y también de forma pasiva.
                </div>
                <div
                  id="ranked-passive-team-preview"
                  style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;min-height:44px;"
                >
                  <span style="font-size:11px;color:rgba(255,255,255,0.3);align-self:center;">No configurado</span>
                </div>
                <div style="display:flex;gap:8px;">
                  <button
                    id="btn-passive-edit"
                    onclick="if(typeof openPassiveTeamEditor==='function')openPassiveTeamEditor()"
                    style="flex:1;font-family:'Press Start 2P',monospace;font-size:7px;padding:10px;border:none;border-radius:10px;cursor:pointer;
                           background:rgba(255,255,255,0.08);color:var(--gray);border:1px solid rgba(255,255,255,0.2);"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    id="btn-passive-activate"
                    onclick="if(typeof savePassiveTeam==='function')savePassiveTeam(true)"
                    style="flex:1;font-family:'Press Start 2P',monospace;font-size:7px;padding:10px;border:none;border-radius:10px;cursor:pointer;
                           background:linear-gradient(135deg,rgba(107,203,119,0.2),rgba(107,203,119,0.08));color:var(--green);border:1px solid rgba(107,203,119,0.3);"
                  >
                    ✅ Activar
                  </button>
                  <button
                    id="btn-passive-deactivate"
                    onclick="if(typeof savePassiveTeam==='function')savePassiveTeam(false)"
                    style="flex:1;font-family:'Press Start 2P',monospace;font-size:7px;padding:10px;border:none;border-radius:10px;cursor:pointer;
                           background:rgba(255,59,59,0.08);color:var(--red);border:1px solid rgba(255,59,59,0.2);"
                  >
                    🔴 Desactivar
                  </button>
                </div>
              </div>
                
              <div style="margin-bottom:16px;">
                <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fde68a;margin-bottom:10px;">
                  PREMIOS AL FINAL DE TEMPORADA
                </div>
                <div
                  id="ranked-season-final-rewards"
                  style="background:rgba(253,230,138,0.06);border:1px solid rgba(253,230,138,0.2);border-radius:14px;padding:14px;"
                >
                  <div style="font-size:11px;color:var(--gray);">
                    Cargando premios de temporada...
                  </div>
                </div>
              </div>
            </div><!-- End Col Left -->
          
            <!-- Right Column: Leaderboard -->
            <div class="ranked-grid-col">
              <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--blue);margin-bottom:10px;">
                🌍 RANKING GLOBAL
              </div>
              <div style="background:rgba(59,139,255,0.04);border:1px solid rgba(59,139,255,0.15);border-radius:14px;padding:12px;">
                <div
                  class="ranked-global-grid"
                  style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.04);font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:8px;"
                >
                  <div>#</div>
                  <div>NICK</div>
                  <div class="ranked-global-tier-cell">
                    RANGO
                  </div>
                  <div style="text-align:right;">
                    ELO
                  </div>
                </div>
                <div
                  id="ranked-global-list"
                  style="display:flex;flex-direction:column;gap:6px;max-height:480px;overflow-y:auto;padding-right:4px;"
                >
                  <div style="font-size:11px;color:var(--gray);padding:10px;">
                    Cargando ranking global...
                  </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;">
                  <div
                    id="ranked-global-status"
                    style="font-size:10px;color:var(--gray);"
                  >
                    Sin sincronizar todavia.
                  </div>
                  <button
                    id="ranked-global-refresh-btn"
                    onclick="refreshGlobalRankedLeaderboard(true)"
                    style="font-family:'Press Start 2P',monospace;font-size:7px;padding:8px 10px;border:none;border-radius:10px;background:rgba(59,139,255,0.18);color:#93c5fd;cursor:pointer;"
                  >
                    ACTUALIZAR
                  </button>
                </div>
                <div style="font-size:10px;color:var(--gray);margin-top:8px;line-height:1.4;">
                  Top 100 por ELO en orden descendente.
                </div>
              </div>
            </div><!-- End Col Right -->
          </div><!-- End Grid Wrapper -->
        </div>
      </div>

      <!-- #battle-screen is NOT .screen intentionally: showScreen() must NOT hide it -->
      <div
        id="battle-screen"
        class="zoom-target"
      >
        <div class="battle-container">
          <div
            id="battle-arena"
            class="battle-arena"
            style="position:relative;overflow:hidden;"
          >
            <canvas
              id="battle-bg-canvas"
              style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;border-radius:18px;"
            />
            <div class="battle-combatants">
              <!-- TOP-LEFT: Enemy HP info -->
              <div style="display:flex;align-items:flex-start;justify-content:flex-start;">
                <div class="battle-pokemon-info">
                  <div class="battle-name-container">
                    <div
                      id="enemy-guardian-tag"
                      style="display:none; margin-bottom:4px;"
                    />
                    <div
                      class="battle-name"
                      style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"
                    >
                      <span id="enemy-name">???</span><span
                        id="enemy-gender"
                        class="gender-badge"
                        style="margin-left:4px;"
                      />
                      <img
                        id="enemy-caught-icon"
                        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
                        width="14"
                        height="14"
                        alt="Capturado"
                        style="image-rendering:pixelated;display:none;opacity:0.9;"
                      >
                    </div>
                    <div
                      id="enemy-nature-display"
                      class="battle-nature"
                      style="display:none;"
                    />
                  </div>
                  <div
                    id="enemy-level"
                    class="battle-level"
                  >
                    Nv. 1
                  </div>
                  <div class="hp-bar-wrap">
                    <div
                      id="enemy-hp-bar"
                      class="hp-bar hp-high"
                      style="width:100%"
                    />
                  </div>
                  <div
                    id="enemy-team-status"
                    style="margin-top:2px;display:flex;gap:3px;font-size:10px;"
                  />
                  <div
                    id="enemy-hp-text"
                    class="battle-hp-text"
                  >
                    HP: ?/?
                  </div>
                  <div
                    id="enemy-iv-total"
                    style="display:none;font-size:9px;color:#a855f7;margin-top:2px;font-family:'Press Start 2P',monospace;letter-spacing:0.5px;"
                  />
                </div>
              </div>

              <!-- TOP-RIGHT: Enemy sprite -->
              <div style="display:flex;align-items:flex-start;justify-content:flex-end;">
                <div
                  id="enemy-sprite-wrap"
                  style="height:100%;width:100%;display:flex;align-items:flex-start;justify-content:flex-end;"
                >
                  <img
                    id="enemy-sprite-img"
                    src=""
                    alt=""
                    style="height:100%;width:auto;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 8px 30px rgba(0,0,0,0.9));display:none;"
                  >
                </div>
              </div>

              <!-- BOTTOM-LEFT: Player sprite -->
              <div style="display:flex;align-items:flex-end;justify-content:flex-start;">
                <div
                  id="player-sprite-wrap"
                  style="height:100%;width:100%;display:flex;align-items:flex-end;justify-content:flex-start;"
                >
                  <img
                    id="player-sprite-img"
                    src=""
                    alt=""
                    style="height:100%;width:auto;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 8px 30px rgba(0,0,0,0.9));display:none;"
                  >
                </div>
              </div>

              <!-- BOTTOM-RIGHT: Player HP info -->
              <div style="display:flex;align-items:flex-end;justify-content:flex-end;padding-bottom:10px;">
                <div
                  class="battle-pokemon-info"
                  style="text-align:right;"
                >
                  <div class="battle-name">
                    <span id="player-name">???</span> <span
                      id="player-gender"
                      class="gender-badge"
                    />
                  </div>
                  <div
                    id="player-battle-level"
                    class="battle-level"
                  >
                    Nv. 1
                  </div>
                  <div class="hp-bar-wrap">
                    <div
                      id="player-hp-bar"
                      class="hp-bar hp-high"
                      style="width:100%"
                    />
                  </div>
                  <div class="exp-bar-wrap">
                    <div
                      id="player-exp-bar"
                      class="exp-bar"
                      style="width:0%"
                    />
                  </div>
                  <div
                    id="player-hp-text"
                    class="battle-hp-text"
                  >
                    HP: ?/?
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            id="battle-log"
            class="battle-log"
          >
            <div class="log-entry log-info">
              ¡Un Pokémon salvaje apareció!
            </div>
          </div>

          <div id="move-panel">
            <div
              id="move-buttons"
              class="battle-actions"
            />
            <div
              id="battle-action-row"
              class="action-row"
            >
              <button
                id="btn-switch"
                class="action-btn"
                @click="execShowBattleSwitch"
                style="background:rgba(199,125,255,0.15);border:1px solid rgba(199,125,255,0.3);color:var(--purple);"
              >
                🔄 CAMBIAR
              </button>
              <div id="btn-catch-container">
                <button
                  id="btn-catch"
                  class="action-btn btn-catch"
                  @click="execTryCatch"
                >
                  <span>CAPTURAR</span>
                </button>
              </div>
              <button
                id="btn-bag"
                class="action-btn"
                @click="execShowBattleBag"
              >
                🎒 MOCHILA
              </button>
              <button
                id="btn-run"
                class="action-btn"
                @click="execRunFromBattle"
              >
                🏃 HUIR
              </button>
            </div>
          </div>
        </div>
      </div>
    
      <!-- ESQUELETO DE AUTH LEGACY (Oculto) -->
      <div style="display:none;">
        <div id="form-login" />
        <div id="form-signup" />
        <div id="form-local" />
        <div id="auth-tabs" />
        <div id="tab-server-online" />
        <div id="tab-server-local" />
        <div id="tab-login" />
        <div id="tab-signup" />
        <div id="auth-error" />
        <div id="auth-success" />
        <div id="auth-loading" />
        <button id="btn-login" />
        <button id="btn-signup" />
        <input id="login-email">
        <input id="login-password">
        <input id="signup-username">
        <input id="signup-email">
        <input id="signup-password">
        <input id="local-username">
      </div>
    
      <!-- PANEL DE PERFIL -->
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
              style="background:none;border:none;color:var(--gray);font-size:20px;cursor:pointer;transition:color 0.2s;"
              onmouseover="this.style.color='white'" 
              onmouseout="this.style.color='var(--gray)'"
              @click="isProfileOpen = false"
            >
              ✕
            </button>
          </div>

          <!-- User Identity -->
          <div style="text-align:center; margin-bottom:24px;">
            <div
              id="profile-avatar-container"
              class="profile-avatar"
            >
              👤
            </div>
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
          <div style="margin-bottom:24px;padding:16px;background:rgba(255,255,255,0.03);border-radius:14px;border:1px solid rgba(255,255,255,0.08);text-align:center;">
            <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:12px;letter-spacing:1px;">
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
                    style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"
                  > Team Unión
                </template>
                <template v-else-if="profileData.faction === 'poder'">
                  <img
                    src="/assets/factions/poder.png"
                    style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"
                  > Team Poder
                </template>
                <template v-else>
                  Sin Bando
                </template>
              </div>
              <a
                id="change-faction-btn"
                href="#"
                onclick="openFactionChoice(); return false;" 
                style="font-size:8px; color:var(--purple); text-decoration:none; font-family:'Press Start 2P',monospace; margin-left:8px;"
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
              onclick="if(typeof resetEncounterPity==='function')resetEncounterPity()" 
              style="width:100%; padding:10px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); border-radius:10px; font-family:'Press Start 2P',monospace; font-size:8px; cursor:pointer;"
            >
              ⚠️ RESETEAR ENCUENTROS
            </button>
            <div style="font-size:8px; color:var(--gray); margin-top:5px;">
              Si solo te aparecen entrenadores, usa este botón.
            </div>
          </div>

          <!-- Save Time -->
          <div style="margin-top:20px; text-align:center;">
            <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);margin-bottom:8px;">
              ÚLTIMO GUARDADO
            </div>
            <div
              id="profile-last-save"
              style="font-size:10px;color:var(--gray);"
            >
              {{ profileData.lastSave || 'Sin datos' }}
            </div>
          </div>

          <!-- Notifications -->
          <div style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:var(--gray);">
                NOTIFICACIONES
              </div>
              <button
                style="padding:6px 10px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.05);color:var(--yellow);font-family:'Press Start 2P',monospace;font-size:7px;cursor:pointer;"
                @click="isHistoryOpen = !isHistoryOpen"
              >
                HISTORIAL ({{ (profileData.notificationHistory || []).length }})
              </button>
            </div>
            <div
              v-show="isHistoryOpen"
              id="profile-notification-history"
              style="max-height:150px;overflow-y:auto;padding:8px;border:1px solid rgba(255,255,255,0.05);border-radius:12px;background:rgba(0,0,0,0.15);"
            >
              <div
                v-for="(n, i) in (profileData.notificationHistory || []).slice().reverse()"
                :key="i"
                style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;gap:8px;align-items:flex-start;"
              >
                <span style="font-size:12px;">{{ n.icon || '🔔' }}</span>
                <div style="flex:1;">
                  <div style="font-size:10px;color:white;line-height:1.4;">
                    {{ n.msg }}
                  </div>
                  <div style="font-size:8px;color:var(--gray);margin-top:4px;">
                    {{ new Date(n.ts).toLocaleTimeString() }}
                  </div>
                </div>
              </div>
              <div
                v-if="!(profileData.notificationHistory || []).length"
                style="font-size:10px;color:var(--gray);text-align:center;padding:12px;"
              >
                Sin notificaciones recientes.
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            id="profile-actions-container"
            style="margin-top:24px; display:flex; flex-direction:column; gap:12px;"
          >
            <button
              v-if="profileData.faction"
              id="change-faction-btn"
              onclick="openFactionChoice()"
              style="width:100%;padding:14px;border:1px solid rgba(255,255,255,0.1);border-radius:14px;cursor:pointer;
                background:rgba(255,255,255,0.05);color:var(--yellow);
                font-family:'Press Start 2P',monospace;font-size:9px;"
            >
              ⚔️ CAMBIAR DE BANDO
            </button>
            <button
              onclick="if(typeof openProfileEditor==='function')openProfileEditor()"
              style="width:100%;padding:14px;border:1px solid rgba(255,255,255,0.1);border-radius:14px;cursor:pointer;
                background:rgba(255,255,255,0.05);color:var(--gray);
                font-family:'Press Start 2P',monospace;font-size:9px;transition:all 0.2s;"
            >
              ✏️ EDITAR PERFIL
            </button>
            <button
              onclick="doLogout()"
              class="logout-btn-trigger"
              style="width:100%;padding:14px;border:1px solid rgba(239,68,68,0.2);border-radius:14px;cursor:pointer;
          background:rgba(239,68,68,0.08);color:#ef4444;
          font-family:'Press Start 2P',monospace;font-size:9px;transition:all 0.2s;"
            >
              🚪 CERRAR SESIÓN
            </button>
          </div> <!-- End profile actions -->
        </div> <!-- End scrollable content -->
      </div> <!-- End profile panel -->

      <!-- SETTINGS MODAL -->
      <Teleport to="body">
        <div
          id="settings-modal"
          class="modal-overlay"
          :class="{ active: isSettingsOpen, open: isSettingsOpen }"
        >
          <div
            class="modal-content-premium"
            style="width:100%;max-width:400px;"
          >
            <div class="modal-scrollable-content">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <h2 style="font-family:'Press Start 2P',monospace;font-size:11px;color:var(--yellow);margin:0;letter-spacing:1px;">
                  ⚙️ CONFIGURACIÓN
                </h2>
                <button
                  style="background:none;border:none;color:var(--gray);font-size:24px;cursor:pointer;"
                  @click="isSettingsOpen = false"
                >
                  ✕
                </button>
              </div>
          
              <div style="margin-bottom:24px;">
                <label style="display:block;font-size:14px;color:var(--text);margin-bottom:12px;font-weight:700;">Zoom de la Interfaz: <span id="zoom-value">100%</span></label>
                <input
                  id="zoom-slider"
                  type="range"
                  min="50"
                  max="150"
                  value="100"
                  step="5"
                  style="width:100%;accent-color:var(--yellow);cursor:pointer;"
                  oninput="if(typeof updateZoom==='function')updateZoom(this.value)"
                >
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--gray);font-family:'Press Start 2P',monospace;">
                  <span>50%</span><span>100%</span><span>150%</span>
                </div>
              </div>

              <button
                style="width:100%;padding:16px;background:linear-gradient(135deg, var(--yellow), #f59e0b);color:var(--darker);border:none;border-radius:14px;font-family:'Press Start 2P',monospace;font-size:10px;cursor:pointer;font-weight:900;"
                @click="isSettingsOpen = false"
              >
                CERRAR
              </button>
            </div> <!-- End scrollable content -->
          </div> <!-- End modal content -->
        </div> <!-- End settings modal -->
      </Teleport>

      <!-- LIBRARY MODAL -->
      <Teleport to="body">
        <div
          v-if="isLibraryOpen"
          id="library-modal"
          class="modal-overlay"
          :class="{ active: isLibraryOpen }"
        >
          <div class="library-container">
            <aside class="library-sidebar">
              <h2>BIBLIOTECA</h2>
              <div
                class="library-nav-item active"
                onclick="switchLibraryTab('gimnasios', this)"
              >
                🏆 Gimnasios
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('captura', this)"
              >
                🔴 Captura
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('clases', this)"
              >
                🎭 Clases
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('crianza', this)"
              >
                🥚 Crianza
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('misiones', this)"
              >
                📋 Misiones
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('encuentros', this)"
              >
                🗺️ Encuentros
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('shinys', this)"
              >
                ✨ Shinys
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('combate', this)"
              >
                ⚔️ Combate
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('guerra', this)"
              >
                🛡️ Guerra
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('pokedex', this)"
              >
                📂 Pokédex
              </div>
              <div
                class="library-nav-item"
                onclick="switchLibraryTab('eventos', this)"
              >
                📅 Eventos
              </div>
            </aside>
            <main class="library-content">
              <button
                class="library-close"
                @click="toggleLibrary()"
              >
                ✕
              </button>
              <div
                id="library-article-content"
                class="library-article"
              >
                <div style="text-align:center; padding:100px 0;">
                  <div style="font-size:40px; margin-bottom:20px;">
                    📖
                  </div>
                  <div style="font-family:'Press Start 2P',monospace; font-size:12px; color:var(--gray);">
                    Selecciona un tema para leer
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </Teleport>


      <!-- FACTION CHOICE MODAL -->
      <Teleport to="body">
        <div
          id="faction-choice-modal"
          class="modal-overlay"
        >
          <div
            class="modal-content-premium"
            style="padding:24px;max-width:400px;text-align:center;"
          >
            <button
              onclick="document.getElementById('faction-choice-modal').style.display='none'" 
              style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--gray);font-size:20px;cursor:pointer;"
            >
              ✕
            </button>
            <h2 style="font-family:'Press Start 2P',monospace;font-size:14px;color:var(--yellow);margin-bottom:16px;">
              ¡ELIGE TU BANDO!
            </h2>
            <div style="display:flex;gap:16px;flex-direction:column;">
              <button
                onclick="chooseFaction('union')"
                style="background:#0f172a;border:3px solid #3b82f6;border-radius:12px;padding:16px;cursor:pointer;display:flex;flex-direction:column;align-items:center;"
              >
                <img
                  src="/assets/factions/union.png"
                  style="width:64px;height:64px;object-fit:contain;margin-bottom:8px;"
                >
                <span style="font-family:'Press Start 2P',monospace;font-size:10px;color:#3b82f6;">Team Unión</span>
              </button>
              <button
                onclick="chooseFaction('poder')"
                style="background:#2a0f0f;border:3px solid #ef4444;border-radius:12px;padding:16px;cursor:pointer;display:flex;flex-direction:column;align-items:center;"
              >
                <img
                  src="/assets/factions/poder.png"
                  style="width:64px;height:64px;object-fit:contain;margin-bottom:8px;"
                >
                <span style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;">Team Poder</span>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- WAR SHOP MODAL -->
      <Teleport to="body">
        <div
          id="war-shop-modal"
          class="modal-overlay"
        >
          <div
            class="modal-content-premium"
            style="padding:24px;width:100%;max-width:400px;max-height:80vh;overflow-y:auto;"
          >
            <button
              onclick="closeWarShop()"
              style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--gray);font-size:20px;cursor:pointer;"
            >
              ✕
            </button>
            <h2 style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--yellow);margin-bottom:12px;">
              🛒 Tienda de Guerra
            </h2>
            <div id="war-shop-items" />
          </div>
        </div>
      </Teleport>

      <!-- PASSIVE TEAM EDITOR MODAL -->
      <Teleport to="body">
        <div
          id="passive-team-editor-modal"
          class="modal-overlay"
        >
          <div
            class="modal-content-premium"
            style="max-width:440px;width:100%;max-height:90vh;display:flex;flex-direction:column;"
          >
            <button
              onclick="closePassiveTeamEditor()"
              style="position:absolute;top:16px;right:16px;background:none;border:none;color:var(--red);font-size:22px;cursor:pointer;z-index:10;"
            >
              ✕
            </button>
            <div style="padding:24px;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.05);">
              <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--green);text-align:center;">
                ARMADOR PASIVO
              </div>
            </div>
            <div
              id="passive-editor-body"
              style="flex:1;overflow-y:auto;padding:24px;"
            >
              <!-- Contenido del editor -->
            </div>
            <div style="padding:24px;border-top:1px solid rgba(255,255,255,0.05);">
              <button
                onclick="confirmPassiveTeamEdit()"
                style="width:100%;padding:16px;background:var(--green);border:none;border-radius:12px;font-family:'Press Start 2P';font-size:9px;color:#000;cursor:pointer;"
              >
                💾 GUARDAR
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div> <!-- END #game-screen -->

    <!-- FIXED OVERLAYS (Outside Zoom - so position:fixed works correctly) -->
    <!-- POKEMON CENTER OVERLAY -->
    <div
      id="pokemon-center-overlay"
      class="zoom-target"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;align-items:center;justify-content:center;padding:0;"
    >
      <div
        id="center-image-container"
        style="width:100%; max-width:600px; position:relative; display:flex; justify-content:center; box-shadow:0 0 50px rgba(0,0,0,0.8); border-radius:24px; overflow:hidden;"
      >
        <img
          id="center-nurse-img"
          src="/assets/pokecenter_heal.png"
          style="width:100%; height:auto; image-rendering: pixelated; object-fit: contain;"
        >
        <div
          id="healing-effect"
          style="display:none; position:absolute; inset:0; z-index:2;"
        />
      </div>
      <div
        id="center-msg"
        style="display:none;"
      />
      <div
        id="center-btn-wrap"
        style="display:none;"
      />
    </div>

    <!-- BAG / DAYCARE SELECTOR OVERLAY -->
    <div
      id="bag-overlay"
      class="zoom-target"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;align-items:center;justify-content:center;flex-direction:column;padding:20px;"
    >
      <div
        id="bag-modal"
        style="background:#1e293b;border-radius:16px;padding:20px;width:100%;max-width:500px;border:2px solid rgba(255,255,255,0.1);"
      >
        <!-- Content injected via JS -->
      </div>
    </div>

    <!-- POKEDEX DETAIL MODAL -->
    <div
      id="pokedex-modal"
      class="zoom-target"
      style="display:none;position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);align-items:center;justify-content:center;padding:16px;animation:fadeIn 0.2s ease;"
    >
      <!-- Content injected via JS -->
    </div>

    <!-- TRADE MODAL -->
    <div
      id="trade-modal"
      class="zoom-target"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;align-items:center;justify-content:center;padding:20px;"
    >
      <div
        class="trade-modal-box"
        style="background:#111;border:2px solid var(--gray);border-radius:16px;padding:24px;width:100%;max-width:500px;position:relative;"
      >
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:var(--yellow);">
            🔄 INTERCAMBIO
          </div>
          <button
            onclick="document.getElementById('trade-modal').style.display='none'"
            style="background:none;border:none;color:var(--gray);font-size:22px;cursor:pointer;line-height:1;"
          >
            ✕
          </button>
        </div>
        <div
          id="trade-recipient"
          style="font-size:12px;color:var(--gray);margin-bottom:14px;"
        />
        <div id="trade-steps-content" />
      </div>
    </div>

    <!-- HEAL COST CONFIRMATION MODAL -->
    <div
      id="heal-confirm-modal"
      style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10001;align-items:center;justify-content:center;padding:20px;"
    >
      <div style="background:#0f1729;border:2px solid rgba(239,68,68,0.5);border-radius:20px;padding:28px;width:100%;max-width:380px;box-shadow:0 0 40px rgba(239,68,68,0.3);animation:fadeIn 0.2s ease;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="font-size:32px;">
            🚑
          </div>
          <div>
            <div style="font-family:'Press Start 2P',monospace;font-size:10px;color:#ef4444;letter-spacing:1px;">
              CENTRO POKÉMON
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
              Curación con recargo
            </div>
          </div>
        </div>
        <!-- Cost info -->
        <div
          id="heal-confirm-body"
          style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:20px;font-size:12px;color:#e2e8f0;line-height:1.7;"
        />
        <!-- Buttons -->
        <div style="display:flex;gap:10px;">
          <button
            onclick="cancelHealConfirm()"
            style="flex:1;padding:14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;letter-spacing:0.5px;"
          >
            ✕ CANCELAR
          </button>
          <button
            onclick="confirmHeal()"
            style="flex:1;padding:14px;background:linear-gradient(135deg,#ef4444,#b91c1c);border:none;border-radius:12px;color:#fff;font-family:'Press Start 2P',monospace;font-size:8px;cursor:pointer;box-shadow:0 4px 16px rgba(239,68,68,0.4);letter-spacing:0.5px;"
          >
            ✓ CURAR
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- MOBILE BOTTOM NAVIGATION (< 1360px) -->
  <div class="mobile-nav">
    <button
      class="mobile-nav-btn"
      :class="{ active: uiState.activeTab === 'map' }"
      @click="handleTabChange('map', $event)"
    >
      <span class="nav-icon">🗺️</span>
      <span class="nav-label">Mapa</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: ['team', 'box', 'pokedex'].includes(uiState.activeTab) }"
      @click="handleTabChange('team', $event)"
    >
      <span class="nav-icon">⚡</span>
      <span class="nav-label">PkMn</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: uiState.activeTab === 'bag' }"
      @click="handleTabChange('bag', $event)"
    >
      <span class="nav-icon">🎒</span>
      <span class="nav-label">Mochila</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: uiState.activeTab === 'gyms' }"
      @click="handleTabChange('gyms', $event)"
    >
      <span class="nav-icon">🏆</span>
      <span class="nav-label">Gims</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: uiState.activeTab === 'daycare' }"
      @click="handleTabChange('daycare', $event)"
    >
      <span class="nav-icon">🥚</span>
      <span class="nav-label">Cría</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: ['online-market', 'market', 'trainer-shop'].includes(uiState.activeTab) }"
      @click="handleTabChange('market', $event)"
    >
      <span class="nav-icon">🛒</span>
      <span class="nav-label">Market</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: ['friends', 'war'].includes(uiState.activeTab) }"
      @click="handleTabChange('friends', $event)"
    >
      <span class="nav-icon">👥</span>
      <span class="nav-label">Social</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: uiState.activeTab === 'ranked' }"
      @click="handleTabChange('ranked', $event)"
    >
      <span class="nav-icon">🏅</span>
      <span class="nav-label">Rank</span>
    </button>
  </div>
</template>

<style scoped>
.logout-btn-trigger:hover {
  background: rgba(239, 68, 68, 0.2) !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(239, 68, 68, 0.25) !important;
  border-color: rgba(239, 68, 68, 0.5) !important;
}
.logout-btn-trigger:active {
  transform: translateY(1px);
}
</style>
