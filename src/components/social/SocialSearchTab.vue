<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import TrainerCard from './TrainerCard.vue'
import { gsap } from 'gsap'

const socialStore = useSocialStore()
const uiStore = useUIStore()
const searchQuery = ref('')
const filterClass = ref('')
const filterFaction = ref('')
const listRef = ref<HTMLElement | null>(null)

function openTrainerProfile(userId: string) {
  uiStore.open('TrainerProfile', { userId })
}

async function handleSearch() {
  if (searchQuery.value.length < 2) {
    socialStore.searchResults = []
    return
  }
  await socialStore.searchPlayers(searchQuery.value, {
    playerClass: filterClass.value || undefined,
    faction: filterFaction.value || undefined
  })
}

function animateCards() {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.trainer-card')
    if (cards.length > 0) {
      listRef.value.classList.add('tab-mounting')
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: -20,
        scale: 0.95,
        duration: 0.45,
        stagger: 0.06,
        ease: 'back.out(1.2)',
        clearProps: 'all',
        onComplete: () => {
          listRef.value?.classList.remove('tab-mounting')
        }
      })
    }
  })
}

const loaderTween = ref<gsap.core.Tween | null>(null)

watch(() => socialStore.searchLoading, (loading) => {
  nextTick(() => {
    if (loading) {
      if (!loaderTween.value) {
        loaderTween.value = gsap.to('.loader-mini', {
          rotation: 360,
          duration: 0.8,
          repeat: -1,
          ease: 'none'
        })
      }
    } else {
      if (loaderTween.value) {
        loaderTween.value.kill()
        loaderTween.value = null
      }
    }
  })
}, { immediate: true })

import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (loaderTween.value) {
    loaderTween.value.kill()
  }
})

onMounted(() => {
  animateCards()
})

watch([filterClass, filterFaction], () => {
  handleSearch()
})

watch(() => socialStore.searchResults.map((p) => p.id).join(','), () => {
  animateCards()
})
</script>

<template>
  <div class="social-tab-content">
    <div class="search-bar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Nombre del entrenador o usuario..." 
        @input="handleSearch"
      >
      <span
        v-if="socialStore.searchLoading"
        class="loader-mini"
      />
    </div>

    <div class="search-filters">
      <div class="filter-group">
        <label class="filter-label">FACCIÓN</label>
        <select
          v-model="filterFaction"
          class="filter-select"
        >
          <option value="">
            Todas
          </option>
          <option value="union">
            Team Unión
          </option>
          <option value="poder">
            Team Poder
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">CLASE</label>
        <select
          v-model="filterClass"
          class="filter-select"
        >
          <option value="">
            Todas
          </option>
          <option value="entrenador">
            Entrenador
          </option>
          <option value="rocket">
            Rocket
          </option>
          <option value="cazador">
            Cazador
          </option>
          <option value="profesor">
            Profesor
          </option>
        </select>
      </div>
    </div>

    <div
      v-if="socialStore.searchResults.length === 0 && searchQuery.length >= 2 && !socialStore.searchLoading"
      class="no-results"
    >
      No se encontraron entrenadores.
    </div>

    <div
      v-else
      ref="listRef"
      class="search-results"
    >
      <TrainerCard
        v-for="player in socialStore.searchResults"
        :key="player.id"
        :profile="player"
        :avatar-size="40"
        @click-profile="openTrainerProfile"
      >
        <template #actions>
          <div class="search-actions">
            <button 
              v-if="player.status === 'none'" 
              class="btn-vicio-secondary btn-vicio-sm" 
              @click.stop="socialStore.sendFriendRequest(player.id)"
            >
              ➕ ENVIAR
            </button>
            
            <button 
              v-else-if="player.status === 'pending' && !player.isRequester"
              class="btn-vicio-success btn-vicio-sm" 
              @click.stop="player.relId && socialStore.respondRequest(player.relId, 'accepted')"
            >
              ✓ ACEPTAR
            </button>

            <span
              v-else-if="player.status === 'pending' && player.isRequester"
              class="status-badge pending"
            >
              ⏳ ENVIADA
            </span>

            <span
              v-else-if="player.status === 'accepted'"
              class="status-badge friend"
            >
              ✅ AMIGO
            </span>
          </div>
        </template>
      </TrainerCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.search-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 0;
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(199, 125, 255, 0.1);
  border-radius: 12px;
  padding: 10px 14px;
}

.filter-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  @include pixelated;
  font-size: 7px;
  color: Rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.filter-select {
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(199, 125, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--white);
  font-size: 11px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba%28199, 125, 255, 0.6%29' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;

  &:focus, &:hover {
    border-color: var(--purple-light);
    box-shadow: 0 0 10px Rgba(157, 78, 221, 0.1);
  }

  option {
    background: #161a2e;
    color: white;
  }
}

.union-text-small { color: #60a5fa; font-weight: bold; }
.poder-text-small { color: #f87171; font-weight: bold; }

.search-bar {
  margin-bottom: 0;
  position: relative;

  input {
    width: 100%;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(199, 125, 255, 0.2);
    border-radius: 12px;
    padding: 12px 16px;
    color: var(--white);
    font-size: 14px;
    outline: none;

    &:focus { 
      border-color: var(--purple-light); 
      box-shadow: 0 0 15px Rgba(157, 78, 221, 0.15); 
    }
  }
  
  .loader-mini {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: Translatey(-50%);
    width: 16px;
    height: 16px;
    border: 2px solid Rgba(255, 255, 255, 0.1);
    border-top-color: var(--purple-light);
    border-radius: 50%;
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-card {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(199, 125, 255, 0.2);
    transform: Translatex(4px);
  }

  .player-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .name { 
      font-size: 14px;
      font-weight: 700; 
      color: var(--white); 
      line-height: 1.2;
    }
    
    .meta { 
      font-size: 11px; 
      color: Rgba(255, 255, 255, 0.5); 
      line-height: 1.2;
    }
  }
}

.clickable-avatar {
  cursor: pointer;

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: var(--font-pixel), "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  @include pixelated;
  gap: 6px;
  line-height: 1.5;
  
  &.pending {
    background: #475569;
    color: #facc15;
    border: 1px solid Rgba(250, 204, 21, 0.25);
    box-shadow: 0 3px 0 #334155;
  }
  
  &.friend {
    background: #1e293b;
    color: #4ade80;
    border: 1px solid Rgba(74, 222, 128, 0.25);
    box-shadow: 0 3px 0 #0f172a;
  }
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(148, 163, 184, 0.7);
  font-size: 14px;
}
</style>

