<script setup>
import { computed } from 'vue'

const props = defineProps({
  pokemon: { type: Object, required: true }
})

const p = computed(() => props.pokemon)

const labels = { 
  hp: 'HP', 
  atk: 'Ataque', 
  def: 'Defensa', 
  spa: 'At.Esp', 
  spd: 'Def.Esp', 
  spe: 'Velocidad' 
}

const getIvColor = (val) => {
  if (val >= 28) return 'Rgba(107, 203, 119, 1)' // Green (Elite)
  if (val >= 15) return 'Rgba(255, 217, 61, 1)' // Yellow (Good)
  return 'Rgba(255, 59, 59, 1)' // Red (Poor)
}
</script>

<template>
  <div class="stats-container">
    <!-- Base Stats -->
    <section class="stats-section">
      <h3 class="vp-section-title">
        📊 ESTADÍSTICAS
      </h3>
      <div class="stats-grid">
        <div class="stat-box">
          <span>HP</span><strong>{{ p.maxHp }}</strong>
        </div>
        <div class="stat-box">
          <span>ATK</span><strong>{{ p.atk }}</strong>
        </div>
        <div class="stat-box">
          <span>DEF</span><strong>{{ p.def }}</strong>
        </div>
        <div class="stat-box">
          <span>SPA</span><strong>{{ p.spa || p.atk }}</strong>
        </div>
        <div class="stat-box">
          <span>SPD</span><strong>{{ p.spd || p.def }}</strong>
        </div>
        <div class="stat-box">
          <span>SPE</span><strong>{{ p.spe || 40 }}</strong>
        </div>
      </div>
    </section>

    <!-- IVs -->
    <section class="iv-section glass-inset-dark">
      <h3 class="vp-section-title">
        🧬 POTENCIAL GENÉTICO (IVs)
      </h3>
      <div class="iv-bars">
        <div
          v-for="(val, stat) in p.ivs"
          :key="stat"
          class="iv-row"
        >
          <span class="iv-label">{{ labels[stat] }}</span>
          <div class="iv-track">
            <div
              class="iv-fill"
              :style="{ width: (val/31*100)+'%', background: getIvColor(val) }"
            />
          </div>
          <span
            class="iv-val"
            :style="{ color: getIvColor(val) }"
          >{{ val }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
.stats-container { margin-bottom: 24px; }

.vp-section-title {
  @include pixelated;
  font-size: 8px;
  color: Var(--purple-light);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.stats-grid {
  display: grid;
  grid-template-columns: Repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.stat-box {
  background: Rgba(255,255,255,0.02);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  border: 1px solid Rgba(255,255,255,0.03);
}

.stat-box span { display: block; font-size: 8px; color: Rgba(136, 136, 136, 1); margin-bottom: 4px; @include pixelated; }
.stat-box strong { font-size: 16px; color: Rgba(238, 238, 238, 1); @include pixelated; }

.glass-inset-dark {
  background: Rgba(0,0,0,0.5);
  border-radius: 20px;
  padding: 20px;
}

.iv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.iv-label { width: 60px; font-size: 10px; color: Rgba(136, 136, 136, 1); }
.iv-track { flex: 1; height: 6px; background: Rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; }
.iv-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease-out; }
.iv-val { width: 24px; text-align: right; font-size: 11px; font-weight: bold; }
</style>
