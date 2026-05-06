<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'

const gameStore = useGameStore() as any
const uiStore = useUIStore() as any

const DEFAULT_RANKED_RULES = {
  seasonName: 'TEMPORADA ACTUAL',
  seasonStartDate: '',
  seasonEndDate: '',
  maxPokemon: 6,
  levelCap: 100,
  allowedTypes: [],
  bannedPokemonIds: []
}

const rankedRules = reactive({ ...DEFAULT_RANKED_RULES })

onMounted(async () => {
  await loadRankedRules()
})

const loadRankedRules = async () => {
  try {
    const { data } = await gameStore.db
      .from('ranked_rules_config')
      .select('*')
      .eq('id', 'current')
      .maybeSingle()
    
    if (data?.config) {
      Object.assign(rankedRules, data.config)
      if (data.season_name) rankedRules.seasonName = data.season_name
    }
  } catch (e) {
    console.warn('[Admin] Error loading ranked rules:', e)
  }
}

const saveRankedRules = async () => {
  try {
    await (window as any).__VITE_DEBUG__.saveRankedRules(rankedRules)
  } catch (e: any) {
    uiStore.notify('Error: ' + e.message, '❌')
  }
}

const closeRankedSeason = async () => {
  if (!confirm(`¿Estás seguro de cerrar la temporada "${rankedRules.seasonName}"?\nSe entregarán premios al Top 50 automáticamente.`)) return
  
  try {
    await (window as any).__VITE_DEBUG__.closeRankedSeason(rankedRules.seasonName)
  } catch (e: any) {
    uiStore.notify('Error RPC: ' + e.message, '❌')
  }
}
</script>

<template>
  <div class="ranked-rules-form">
    <div class="form-section">
      <label>NOMBRE DE TEMPORADA</label>
      <input v-model="rankedRules.seasonName">
    </div>

    <div class="form-row">
      <div class="form-section">
        <label>INICIO</label>
        <input
          v-model="rankedRules.seasonStartDate"
          type="date"
        >
      </div>
      <div class="form-section">
        <label>FIN</label>
        <input
          v-model="rankedRules.seasonEndDate"
          type="date"
        >
      </div>
    </div>

    <div class="form-row">
      <div class="form-section">
        <label>MAX POKEMON</label>
        <input
          v-model="rankedRules.maxPokemon"
          type="number"
          min="1"
          max="6"
        >
      </div>
      <div class="form-section">
        <label>NIVEL MAX</label>
        <input
          v-model="rankedRules.levelCap"
          type="number"
          min="1"
          max="100"
        >
      </div>
    </div>

    <div class="danger-zone">
      <h3 class="press-start">
        ZONA DE PELIGRO
      </h3>
      <p>Al cerrar la temporada, se procesarán los premios y se reseteará el podio.</p>
      <button
        class="danger-btn press-start"
        @click.stop="closeRankedSeason"
      >
        CERRAR TEMPORADA Y PREMIAR
      </button>
    </div>

    <button
      class="save-btn press-start"
      @click.stop="saveRankedRules"
    >
      GUARDAR REGLAS RANKED
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.press-start { @include pixelated; font-size: 10px; letter-spacing: 1px; }

.ranked-rules-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    label { font-size: 11px; color: var(--muted); font-weight: 700; }
    input {
      background: Rgba(0, 0, 0, 0.3);
      border: 1px solid Rgba(255, 255, 255, 0.1);
      padding: 12px;
      border-radius: 12px;
      color: $white;
      font-size: 13px;
    }
  }
  .form-row { display: flex; gap: 16px; .form-section { flex: 1; } }
}

.danger-zone {
  margin-top: 40px;
  padding: 24px;
  background: Rgba(239, 68, 68, 0.05);
  border: 1px solid Rgba(239, 68, 68, 0.2);
  border-radius: 20px;
  h3 { color: var(--red); margin-bottom: 10px; font-size: 10px; }
  p { font-size: 12px; color: var(--muted); margin-bottom: 20px; }
  .danger-btn { width: 100%; padding: 16px; background: var(--red); color: $white; border: none; border-radius: 12px; cursor: pointer; font-size: 9px; }
}

.save-btn {
  margin-top: 20px;
  padding: 16px;
  background: Linear-Gradient(135deg, var(--yellow), var(--orange));
  border: none;
  border-radius: 16px;
  color: $black;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 10px 20px Rgba(245, 158, 11, 0.2);
}
</style>
