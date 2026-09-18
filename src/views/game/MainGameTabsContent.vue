<script setup lang="ts">
// style-inherited: styles imported in parent MainGameView.vue (_main-game-view.scss)
import { defineResilientAsyncComponent } from '@/logic/utils/resilientComponent'
import HomeView from '@/views/game/HomeView.vue'

const PokedexView = defineResilientAsyncComponent(() => import('@/views/pokemon/PokedexView.vue'))
const MapView = defineResilientAsyncComponent(() => import('@/views/game/MapView.vue'))
const GymsView = defineResilientAsyncComponent(() => import('@/views/game/GymsView.vue'))
const BagView = defineResilientAsyncComponent(() => import('@/views/inventory/BagView.vue'))
const BoxView = defineResilientAsyncComponent(() => import('@/components/box/BoxView.vue'))

defineProps<{
  activeTab: string
}>()
</script>

<template>
  <div class="main-game-tabs-content">
    <!-- CORE VIEWS (KEPT ALIVE) -->
    <KeepAlive :include="['HomeView', 'MapView', 'PokedexView', 'BagView', 'BoxView']">
      <div
        v-if="activeTab === 'home'"
        key="home"
        class="tab-content"
      >
        <HomeView />
        <div class="hud-spacer-bottom" />
      </div>

      <div
        v-else-if="activeTab === 'map'"
        key="map"
        class="tab-content"
      >
        <MapView />
        <div class="hud-spacer-bottom" />
      </div>

      <div
        v-else-if="activeTab === 'pokedex'"
        key="pokedex"
        class="tab-content"
      >
        <PokedexView />
        <div class="hud-spacer-bottom" />
      </div>

      <div
        v-else-if="activeTab === 'bag'"
        key="bag"
        class="tab-content"
      >
        <BagView />
        <div class="hud-spacer-bottom" />
      </div>

      <div
        v-else-if="activeTab === 'box'"
        key="box"
        class="tab-content"
      >
        <BoxView />
        <div class="hud-spacer-bottom" />
      </div>
    </KeepAlive>

    <!-- SECONDARY VIEWS -->
    <div
      v-if="activeTab === 'gyms'"
      key="gyms"
      class="tab-content"
    >
      <GymsView />
      <div class="hud-spacer-bottom" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.main-game-tabs-content {
  display: contents;
}
</style>
