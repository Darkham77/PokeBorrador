<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';

const gameStore = useGameStore();
const uiStore = useUIStore();
const events = ref([]);
const isEditing = ref(false);

const DEFAULT_EVENT = {
  id: '',
  name: '',
  description: '',
  icon: '🎁',
  active: true,
  manual: false,
  start_at: null,
  end_at: null,
  config: {
    expMult: 1,
    moneyMult: 1,
    shinyMult: 1,
    species: '',
    speciesRateMult: 1,
    hasCompetition: false,
    sortBy: 'data.total_ivs'
  },
  schedule: {
    type: 'weekly',
    days: [1, 2, 3, 4, 5],
    startHour: 10,
    endHour: 18
  }
};

const currentEvent = reactive({ ...DEFAULT_EVENT });

onMounted(async () => {
  await loadEvents();
});

const loadEvents = async () => {
  const { data } = await gameStore.db.from('events_config').select('*');
  events.value = data || [];
};

const editEvent = (ev) => {
  Object.assign(currentEvent, JSON.parse(JSON.stringify(ev)));
  isEditing.value = true;
};

const saveEvent = async () => {
  try {
    const { error } = await gameStore.db.from('events_config').upsert(currentEvent);
    if (error) throw error;
    
    uiStore.notify('Evento guardado correctamente', '✅');
    isEditing.value = false;
    await loadEvents();
  } catch (e) {
    uiStore.notify('Error al guardar: ' + e.message, '❌');
  }
};
</script>

<template>
  <div class="admin-panel">
    <header class="admin-header">
      <h2 class="press-start">
        ADMINISTRADOR DE EVENTOS
      </h2>
      <button
        v-if="!isEditing"
        class="add-btn"
        @click="isEditing = true; Object.assign(currentEvent, DEFAULT_EVENT)"
      >
        + NUEVO EVENTO
      </button>
      <button
        v-else
        class="back-btn"
        @click="isEditing = false"
      >
        CANCELAR
      </button>
    </header>

    <!-- Event List -->
    <div
      v-if="!isEditing"
      class="event-grid"
    >
      <div
        v-for="ev in events"
        :key="ev.id"
        class="ev-admin-card"
        :class="{ inactive: !ev.active }"
      >
        <div class="card-info">
          <span class="icon">{{ ev.icon }}</span>
          <div>
            <span class="id-tag">{{ ev.id }}</span>
            <h4>{{ ev.name }}</h4>
          </div>
        </div>
        <div class="actions">
          <button @click="editEvent(ev)">
            EDITAR
          </button>
        </div>
      </div>
    </div>

    <!-- Edit/Create Form -->
    <div
      v-else
      class="event-form"
    >
      <div class="form-section">
        <label>ID DEL EVENTO (Unique)</label>
        <input
          v-model="currentEvent.id"
          placeholder="ej: mega_exp_weekend"
        >
      </div>

      <div class="form-row">
        <div class="form-section">
          <label>NOMBRE</label>
          <input v-model="currentEvent.name">
        </div>
        <div class="form-section icon-pick">
          <label>ICONO</label>
          <input v-model="currentEvent.icon">
        </div>
      </div>

      <div class="form-section">
        <label>DESCRIPCIÓN</label>
        <textarea
          v-model="currentEvent.description"
          rows="2"
        />
      </div>

      <h3 class="press-start sub-title">
        BONIFICACIONES (x1 = Desactivado)
      </h3>
      <div class="bonus-form-grid">
        <div class="bonus-input">
          <label>EXP x</label>
          <input
            v-model="currentEvent.config.expMult"
            type="number"
            step="0.1"
          >
        </div>
        <div class="bonus-input">
          <label>SHINY x</label>
          <input
            v-model="currentEvent.config.shinyMult"
            type="number"
            step="0.1"
          >
        </div>
        <div class="bonus-input">
          <label>DINERO x</label>
          <input
            v-model="currentEvent.config.moneyMult"
            type="number"
            step="0.1"
          >
        </div>
      </div>

      <h3 class="press-start sub-title">
        COMPETENCIA
      </h3>
      <div class="form-row">
        <div class="check-box">
          <input
            v-model="currentEvent.config.hasCompetition"
            type="checkbox"
          >
          <label>Habilitar Concurso</label>
        </div>
        <div
          v-if="currentEvent.config.hasCompetition"
          class="form-section"
        >
          <label>Métrica de Victoria</label>
          <select v-model="currentEvent.config.sortBy">
            <option value="data.total_ivs">
              Máximos IVs Totales
            </option>
            <option value="data.level">
              Máximo Nivel
            </option>
            <option value="data.isShiny">
              Shiny Garantizado
            </option>
          </select>
        </div>
      </div>

      <button
        class="save-btn press-start"
        @click="saveEvent"
      >
        GUARDAR CAMBIOS
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-panel {
  padding: 30px;
  background: #0f172a;
  color: #fff;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.press-start {
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  letter-spacing: 1px;
}

.sub-title {
  margin: 30px 0 15px;
  color: #fbbf24;
  font-size: 8px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 20px;
}

.add-btn {
  background: #22c55e;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.ev-admin-card {
  background: rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .card-info {
    display: flex;
    gap: 12px;
    align-items: center;
    .icon { font-size: 24px; }
    .id-tag { font-size: 9px; color: #64748b; font-weight: 800; display: block; }
    h4 { margin: 4px 0 0; font-size: 13px; }
  }

  button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11px;
    cursor: pointer;
    &:hover { background: rgba(255, 255, 255, 0.05); border-color: #fbbf24; }
  }

  &.inactive { opacity: 0.6; grayscale: 1; }
}

.event-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;

  .form-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    label { font-size: 11px; color: #94a3b8; font-weight: 700; }
    input, textarea, select {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px;
      border-radius: 12px;
      color: #fff;
      font-size: 13px;
    }
  }

  .form-row { display: flex; gap: 16px; .form-section { flex: 1; } }
  .icon-pick { width: 80px; }

  .bonus-form-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    .bonus-input {
      display: flex;
      flex-direction: column;
      gap: 6px;
      label { font-size: 10px; color: #64748b; }
      input { padding: 10px; text-align: center; }
    }
  }

  .save-btn {
    margin-top: 20px;
    padding: 16px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border: none;
    border-radius: 16px;
    color: #000;
    cursor: pointer;
    font-size: 11px;
    font-weight: 800;
    box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2);
  }
}

.check-box {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
  font-size: 13px;
  input { accent-color: #fbbf24; }
}

.back-btn {
  background: transparent;
  border: 1px solid #ef4444;
  color: #ef4444;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
}
</style>
