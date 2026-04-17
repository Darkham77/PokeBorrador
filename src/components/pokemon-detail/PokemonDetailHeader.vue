<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true }
})

const emit = defineEmits(['close', 'toggle-tag'])

const p = computed(() => props.pokemon)

const getSprite = (id, isShiny) => {
  if (typeof window.getSpriteUrl === 'function') return window.getSpriteUrl(id, isShiny)
  const num = window.POKEMON_SPRITE_IDS?.[id.toLowerCase()] || id
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'
  return `${base}${isShiny ? 'shiny/' : ''}${num}.webp`
}
</script>

<template>
  <header class="modal-header">
    <div class="poke-identity">
      <div
        class="sprite-box"
        :class="p.aura ? 'aura-' + p.aura : ''"
      >
        <img
          :src="getSprite(p.id, p.isShiny)"
          :alt="p.name"
          class="main-sprite"
        >
        <span
          v-if="p.isShiny"
          class="shiny-star"
        >✨</span>
      </div>
      <div class="name-info">
        <h2 class="poke-name">
          {{ p.name }} 
          <span :class="'gender-' + (p.gender || 'none').toLowerCase()">
            {{ (p.gender === 'M' ? '♂' : p.gender === 'F' ? '♀' : '') }}
          </span>
        </h2>
        <div class="type-row">
          <span
            class="type-badge"
            :class="'type-' + p.type.toLowerCase()"
          >{{ p.type }}</span>
          <span class="level-badge">Nv. {{ p.level }}</span>
          <span class="id-badge">#{{ String(p.id).padStart(3, '0') }}</span>
        </div>
        <div class="tags-row">
          <button 
            class="tag-btn" 
            :class="{ active: p.tags?.includes('fav') }"
            title="Favorito"
            @click="emit('toggle-tag', 'fav')"
          >
            ⭐
          </button>
          <button 
            class="tag-btn" 
            :class="{ active: p.tags?.includes('breed') }"
            title="Crianza"
            @click="emit('toggle-tag', 'breed')"
          >
            ❤️
          </button>
          <button 
            class="tag-btn" 
            :class="{ active: p.tags?.includes('iv31') }"
            title="IV 31"
            @click="emit('toggle-tag', 'iv31')"
          >
            31
          </button>
        </div>
      </div>
    </div>
    <button
      class="close-btn"
      @click="emit('close')"
    >
      ✕
    </button>
  </header>
</template>

<style scoped lang="scss">
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.poke-identity {
  display: flex;
  gap: 20px;
}

.sprite-box {
  width: 90px;
  height: 90px;
  background: rgba(255,255,255,0.05);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 1px solid rgba(255,255,255,0.1);
}

.main-sprite {
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
}

.shiny-star {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 20px;
  filter: drop-shadow(0 0 5px gold);
}

.poke-name {
  font-family: 'Press Start 2P', monospace;
  font-size: 13px;
  color: var(--yellow);
  margin-bottom: 10px;
}

.type-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.level-badge { font-weight: bold; color: #fff; font-size: 12px; }
.id-badge { color: rgba(255,255,255,0.3); font-size: 11px; font-weight: bold; }

.tags-row {
  display: flex;
  gap: 10px;
}

.tag-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-btn.active {
  background: rgba(255, 215, 0, 0.2);
  border-color: gold;
  color: #fff;
  filter: grayscale(#{0});
}

.close-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s;
}

.close-btn:hover { background: var(--red); }

/* Gender Colors */
.gender-m { color: #3b8bff; }
.gender-f { color: #ff6eff; }
</style>
