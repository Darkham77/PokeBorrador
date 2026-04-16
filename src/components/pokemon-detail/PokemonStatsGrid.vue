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
  if (val >= 28) return '#6BCB77' // Green (Elite)
  if (val >= 15) return '#FFD93D' // Yellow (Good)
  return '#FF3B3B' // Red (Poor)
}
</script>

<template>
  <div class="stats-container">
    <!-- Base Stats -->
    <section class="stats-section">
      <h3 class="section-title">
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
      <h3 class="section-title">
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

<style scoped>
.stats-container { margin-bottom: 24px; }

.section-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--purple-light);
  margin-bottom: 16px;
  letter-spacing: 1px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.stat-box {
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.03);
}

.stat-box span { display: block; font-size: 8px; color: #777; margin-bottom: 4px; }
.stat-box strong { font-size: 15px; color: #efefef; }

.glass-inset-dark {
  background: rgba(0,0,0,0.5);
  border-radius: 20px;
  padding: 20px;
}

.iv-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.iv-label { width: 60px; font-size: 10px; color: #888; }
.iv-track { flex: 1; height: 6px; background: rgba(0,0,0,0.4); border-radius: 3px; overflow: hidden; }
.iv-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease-out; }
.iv-val { width: 24px; text-align: right; font-size: 11px; font-weight: bold; }
</style>
