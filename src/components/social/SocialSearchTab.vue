<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSocialStore } from '@/stores/social/social'
import { useUIStore } from '@/stores/ui'
import TrainerCard from './TrainerCard.vue'
import SocialSearchResultActions from './SocialSearchResultActions.vue'
import { gsap } from 'gsap'

const socialStore = useSocialStore()
const uiStore = useUIStore()
const searchQuery = ref('')
const filterClass = ref('')
const filterFaction = ref('')
const listRef = ref<HTMLElement | null>(null)

const MIN_SEARCH_QUERY_LENGTH = 2
const SEARCH_CARD_AVATAR_SIZE_PX = 40
const LOADER_SPINNER_ROTATION_DEG = 360
const CARD_ANIM_X_OFFSET = -20
const CARD_ANIM_SCALE_MIN = 0.95
const CARD_ANIM_DURATION_SEC = 0.45
const CARD_ANIM_STAGGER_SEC = 0.06

function openTrainerProfile(userId: string) {
  uiStore.open('TrainerProfile', { userId })
}

async function handleSearch() {
  if (searchQuery.value.length < MIN_SEARCH_QUERY_LENGTH) {
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
        x: CARD_ANIM_X_OFFSET,
        scale: CARD_ANIM_SCALE_MIN,
        duration: CARD_ANIM_DURATION_SEC,
        stagger: CARD_ANIM_STAGGER_SEC,
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
const loaderMiniRef = ref<HTMLElement | null>(null)

watch(() => socialStore.searchLoading, (loading) => {
  nextTick(() => {
    if (loading) {
      if (!loaderTween.value && loaderMiniRef.value) {
        loaderTween.value = gsap.to(loaderMiniRef.value, {
          rotation: LOADER_SPINNER_ROTATION_DEG,
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
        id="social-search-input"
        v-model="searchQuery" 
        type="text" 
        placeholder="Nombre del entrenador o usuario..." 
        @input="handleSearch"
      >
      <span
        v-if="socialStore.searchLoading"
        ref="loaderMiniRef"
        class="loader-mini"
      />
    </div>

    <div class="search-filters">
      <div class="filter-group">
        <label class="filter-label">FACCIÓN</label>
        <select
          id="social-search-faction-select"
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
          id="social-search-class-select"
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
      v-if="socialStore.searchResults.length === 0 && searchQuery.length >= MIN_SEARCH_QUERY_LENGTH && !socialStore.searchLoading"
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
        :avatar-size="SEARCH_CARD_AVATAR_SIZE_PX"
        @click-profile="openTrainerProfile"
      >
        <template #actions>
          <SocialSearchResultActions
            :player="player"
            @send-request="socialStore.sendFriendRequest"
            @respond-request="(relId) => socialStore.respondRequest(relId, 'accepted')"
          />
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
  padding: 10px 14px;
  border: 1px solid Rgb(199 125 255 / 10%);
  border-radius: 12px;
  background: Rgb(0 0 0 / 20%);
  margin-bottom: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.filter-label {
  @include pixelated;

  color: Rgb(255 255 255 / 40%);
  font-size: 7px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid Rgb(199 125 255 / 15%);
  border-radius: 8px;
  background: Rgb(0 0 0 / 30%);
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
    box-shadow: 0 0 10px Rgb(157 78 221 / 10%);
  }

  option {
    background: #161a2e;
    color: white;
  }
}

.search-bar {
  position: relative;
  margin-bottom: 0;

  input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid Rgb(199 125 255 / 20%);
    border-radius: 12px;
    background: Rgb(0 0 0 / 30%);
    color: var(--white);
    font-size: 14px;
    outline: none;

    &:focus { 
      border-color: var(--purple-light); 
      box-shadow: 0 0 15px Rgb(157 78 221 / 15%); 
    }
  }
  
  .loader-mini {
    position: absolute;
    top: 50%;
    right: 12px;
    width: 16px;
    height: 16px;
    border: 2px solid Rgb(255 255 255 / 10%);
    border-radius: 50%;
    transform: Translatey(-50%);
    border-top-color: var(--purple-light);
  }
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
    opacity: 0.85;
    text-decoration: underline;
  }
}

.no-results {
  padding: 40px 20px;
  color: Rgb(148 163 184 / 70%);
  font-size: 14px;
  text-align: center;
}
</style>

