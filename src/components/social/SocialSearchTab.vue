<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSocialStore } from '@/stores/social'
import { useUIStore } from '@/stores/ui'
import TrainerAvatar from '@/components/TrainerAvatar.vue'
import { gsap } from 'gsap'

const socialStore = useSocialStore()
const uiStore = useUIStore()
const searchQuery = ref('')
const listRef = ref<HTMLElement | null>(null)

function openTrainerProfile(userId: string) {
  uiStore.open('TrainerProfile', { userId })
}

async function handleSearch() {
  if (searchQuery.value.length < 2) return
  await socialStore.searchPlayers(searchQuery.value)
}

function animateCards() {
  nextTick(() => {
    if (!listRef.value) return
    const cards = listRef.value.querySelectorAll('.search-card')
    if (cards.length > 0) {
      gsap.killTweensOf(cards)
      gsap.from(cards, {
        opacity: 0,
        x: -20,
        scale: 0.95,
        duration: 0.45,
        stagger: 0.06,
        ease: 'back.out(1.2)',
        clearProps: 'all'
      })
    }
  })
}

onMounted(() => {
  animateCards()
})

watch(() => socialStore.searchResults, () => {
  animateCards()
}, { deep: true })
</script>

<template>
  <div class="social-tab-content">
    <div class="search-bar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Nombre del entrenador..." 
        @input="handleSearch"
      >
      <span
        v-if="socialStore.searchLoading"
        class="loader-mini"
      />
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
      <div
        v-for="player in socialStore.searchResults"
        :key="player.id"
        class="search-card"
      >
        <TrainerAvatar 
          :player-class="player.playerClass" 
          :level="player.level" 
          :avatar-style="player.avatar_style"
          :size="40"
          class="clickable-avatar"
          @click.stop="openTrainerProfile(player.id)"
        />
        <div class="player-info">
          <div 
            class="name clickable-username"
            :class="player.nick_style"
            @click.stop="openTrainerProfile(player.id)"
          >
            {{ player.username }}
          </div>
          <div class="meta">
            Nv.{{ player.level }} • {{ player.playerClass || 'Entrenador' }}
          </div>
        </div>
        
        <div class="search-actions">
          <button 
            v-if="player.status === 'none'" 
            class="btn-vicio-secondary btn-vicio-sm" 
            @click.stop="socialStore.sendFriendRequest(player.id)"
          >
            ➕ AGREGAR
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
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-bar {
  margin-bottom: 20px;
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
    transition: all 0.2s;

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
    animation: spin 0.8s linear infinite;
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
  transition: all 0.2s;

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
  transition: transform 0.2s, filter 0.2s;

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}



.status-badge {
  @include pixelated;
  font-size: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  display: inline-block;
  text-align: center;
  
  &.pending { background: Rgba(255, 193, 7, 0.1); color: Rgba(255, 193, 7, 1); }
  &.friend { background: Rgba(34, 197, 94, 0.1); color: Rgba(74, 222, 128, 1); }
}

.no-results {
  text-align: center;
  padding: 20px;
  color: Rgba(148, 163, 184, 1);
  font-size: 12px;
}

@keyframes spin { to { transform: Translatey(-50%) Rotate(360deg); } }
</style>

