<script setup lang="ts">

interface Stats {
  hp?: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

interface Boosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

const props = defineProps<{
  statusId: string;
  baseStoredStats: Stats;
  storedStats: Stats;
  boosts?: Boosts | null;
}>();

// Calcula las estadísticas con stages y penalizaciones de estado
const getStatValue = (statName: 'atk' | 'def' | 'spa' | 'spd' | 'spe') => {
  const baseVal = props.storedStats[statName];
  const stage = props.boosts ? props.boosts[statName] : 0;
  
  let val = baseVal;
  
  // 1. Aplicar multiplicadores de stages (-6 a +6)
  if (stage >= 0) {
    val = Math.floor(val * (2 + stage) / 2);
  } else {
    val = Math.floor(val * 2 / (2 - stage));
  }
  
  // 2. Aplicar penalizaciones de estado alterado
  if (props.statusId === 'par' && statName === 'spe') {
    val = Math.floor(val * 0.25); // Velocidad reducida al 25% por parálisis en Gen 3
  }
  if (props.statusId === 'brn' && statName === 'atk') {
    val = Math.floor(val * 0.5); // Ataque reducido al 50% por quemadura
  }
  
  return val;
};

// Formatea el stage para mostrarlo en la UI (ej: +2 o -1)
const getBoostText = (statName: 'atk' | 'def' | 'spa' | 'spd' | 'spe') => {
  if (!props.boosts) return '';
  const stage = props.boosts[statName];
  if (stage === 0) return '';
  return stage > 0 ? `+${stage}` : `${stage}`;
};
</script>

<template>
  <div class="stats-section">
    <div class="section-title">
      ESTADÍSTICAS EN TIEMPO REAL:
    </div>
    
    <div class="stats-grid">
      <div class="grid-header">
        <span>STAT</span>
        <span>BASE</span>
        <span>BOOST</span>
        <span class="text-right">REAL</span>
      </div>

      <!-- PS (Solo base) -->
      <div class="grid-row">
        <span class="stat-label uppercase">HP</span>
        <span>{{ baseStoredStats.hp }}</span>
        <span>-</span>
        <span class="stat-real text-right">{{ baseStoredStats.hp }}</span>
      </div>

      <!-- Ataque -->
      <div
        class="grid-row"
        :class="{ 'stat-modified': statusId === 'brn' || (boosts && boosts.atk !== 0) }"
      >
        <span class="stat-label uppercase">ATK</span>
        <span>{{ storedStats.atk }}</span>
        <span
          class="stat-boost"
          :class="{ 'boost-up': boosts && boosts.atk > 0, 'boost-down': boosts && boosts.atk < 0 }"
        >
          {{ getBoostText('atk') || '0' }}
        </span>
        <span
          class="stat-real text-right"
          :class="{ 'penalized': statusId === 'brn' }"
        >
          {{ getStatValue('atk') }}
        </span>
      </div>

      <!-- Defensa -->
      <div
        class="grid-row"
        :class="{ 'stat-modified': boosts && boosts.def !== 0 }"
      >
        <span class="stat-label uppercase">DEF</span>
        <span>{{ storedStats.def }}</span>
        <span
          class="stat-boost"
          :class="{ 'boost-up': boosts && boosts.def > 0, 'boost-down': boosts && boosts.def < 0 }"
        >
          {{ getBoostText('def') || '0' }}
        </span>
        <span class="stat-real text-right">{{ getStatValue('def') }}</span>
      </div>

      <!-- Ataque Especial -->
      <div
        class="grid-row"
        :class="{ 'stat-modified': boosts && boosts.spa !== 0 }"
      >
        <span class="stat-label uppercase">SPA</span>
        <span>{{ storedStats.spa }}</span>
        <span
          class="stat-boost"
          :class="{ 'boost-up': boosts && boosts.spa > 0, 'boost-down': boosts && boosts.spa < 0 }"
        >
          {{ getBoostText('spa') || '0' }}
        </span>
        <span class="stat-real text-right">{{ getStatValue('spa') }}</span>
      </div>

      <!-- Defensa Especial -->
      <div
        class="grid-row"
        :class="{ 'stat-modified': boosts && boosts.spd !== 0 }"
      >
        <span class="stat-label uppercase">SPD</span>
        <span>{{ storedStats.spd }}</span>
        <span
          class="stat-boost"
          :class="{ 'boost-up': boosts && boosts.spd > 0, 'boost-down': boosts && boosts.spd < 0 }"
        >
          {{ getBoostText('spd') || '0' }}
        </span>
        <span class="stat-real text-right">{{ getStatValue('spd') }}</span>
      </div>

      <!-- Velocidad -->
      <div
        class="grid-row"
        :class="{ 'stat-modified': statusId === 'par' || (boosts && boosts.spe !== 0) }"
      >
        <span class="stat-label uppercase">SPE</span>
        <span>{{ storedStats.spe }}</span>
        <span
          class="stat-boost"
          :class="{ 'boost-up': boosts && boosts.spe > 0, 'boost-down': boosts && boosts.spe < 0 }"
        >
          {{ getBoostText('spe') || '0' }}
        </span>
        <span
          class="stat-real text-right"
          :class="{ 'penalized': statusId === 'par' }"
        >
          {{ getStatValue('spe') }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.stats-section {
  display: flex;
  flex-direction: column;
  margin-top: 4px;

  .section-title {
    font-size: 7px;
    color: #86868b;
    letter-spacing: 0.5px;
    font-weight: bold;
    margin-bottom: 6px;
  }
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  padding: 6px;

  .grid-header {
    display: grid;
    grid-template-columns: 2.2fr 1.5fr 1.5fr 1.8fr;
    font-size: 7px;
    color: #86868b;
    font-weight: bold;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 4px;
    margin-bottom: 2px;
  }

  .grid-row {
    display: grid;
    grid-template-columns: 2.2fr 1.5fr 1.5fr 1.8fr;
    font-size: 8px;
    color: #aeaebe;
    align-items: center;
    padding: 1px 0;

    .stat-label {
      font-weight: bold;
      color: #e5e5ea;
    }

    .stat-boost {
      color: #86868b;
      font-weight: bold;

      &.boost-up {
        color: #30d158;
      }
      &.boost-down {
        color: #ff453a;
      }
    }

    .stat-real {
      font-weight: bold;
      color: white;

      &.penalized {
        color: #ff9f0a;
      }
    }

    &.stat-modified {
      background: rgba(255, 214, 10, 0.03);
      border-radius: 2px;
    }
  }

  .text-right {
    text-align: right;
  }
}

.uppercase {
  text-transform: uppercase;
}
</style>
