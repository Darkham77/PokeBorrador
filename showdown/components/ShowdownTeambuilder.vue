<script setup lang="ts">
import { computed } from 'vue';
import { useShowdownSandboxStore } from '../stores/useShowdownSandboxStore';
import type { ShowdownLocalDB } from '../sandbox_db/cloner/extract_logic';
import showdownDB from '../sandbox_db/data/showdown_db_es.json';
import moveTranslations from '../sandbox_db/data/move_translations.json';

const store = useShowdownSandboxStore();
const typedDB = showdownDB as unknown as ShowdownLocalDB;

const TYPE_TRANSLATIONS: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fuego',
  water: 'Agua',
  grass: 'Planta',
  electric: 'Eléctrico',
  ice: 'Hielo',
  fighting: 'Lucha',
  poison: 'Veneno',
  ground: 'Tierra',
  flying: 'Volador',
  psychic: 'Psíquico',
  bug: 'Bicho',
  rock: 'Roca',
  ghost: 'Fantasma',
  dragon: 'Dragón',
  dark: 'Siniestro',
  steel: 'Acero',
  fairy: 'Hada'
};

const translateType = (type: string) => {
  return TYPE_TRANSLATIONS[type.toLowerCase()] || type;
};

const pokemonList = computed(() => {
  return Object.values(typedDB.pokemon).sort((a, b) => a.name.localeCompare(b.name));
});

const moveList = computed(() => {
  return Object.values(typedDB.moves).map(move => {
    const cleanId = move.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nameEs = (moveTranslations as Record<string, string>)[cleanId] || move.name;
    return {
      ...move,
      nameEs
    };
  }).sort((a, b) => a.nameEs.localeCompare(b.nameEs));
});

// Cambios de selección reproducen grito automáticamente y actualizan movimientos compatibles
const handlePlayerPokeChange = () => {
  store.setPlayerLeader(store.playerPokemonId);
};

const handleEnemyPokeChange = () => {
  store.setEnemyLeader(store.enemyPokemonId);
};
</script>

<template>
  <div class="setup-overlay">
    <div class="setup-panel">
      <h2 class="setup-title">
        🔧 Sandbox Team Builder (6vs6 Gen 3)
      </h2>
      
      <div class="teams-container">
        <!-- Player Setup -->
        <div class="team-setup player-setup">
          <h3>Tú (Jugador Lider)</h3>
          <div class="form-group">
            <label>Líder Pokémon</label>
            <select
              v-model="store.playerPokemonId"
              class="pixel-select"
              @change="handlePlayerPokeChange"
            >
              <option
                v-for="poke in pokemonList"
                :key="poke.id"
                :value="poke.id"
              >
                {{ poke.name }}
              </option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label class="pixel-checkbox-label">
              <input
                v-model="store.playerShiny"
                type="checkbox"
                class="pixel-checkbox"
              >
              <span class="checkbox-text">Líder Variocolor (Shiny) ✨</span>
            </label>
          </div>
          
          <div
            v-for="i in 4"
            :key="`p-move-${i}`"
            class="form-group"
          >
            <label>Movimiento {{ i }}</label>
            <select
              v-model="store.playerMoves[i - 1]"
              class="pixel-select"
            >
              <option
                v-for="move in moveList"
                :key="move.id"
                :value="move.id"
              >
                {{ move.nameEs }} - {{ translateType(move.type) }} (Poder: {{ move.basePower }})
              </option>
            </select>
          </div>
          <p class="autocomplete-hint">
            Los otros 5 miembros se autocompletarán aleatoriamente.
          </p>
        </div>

        <!-- Enemy Setup -->
        <div class="team-setup enemy-setup">
          <h3>Rival (Bot Lider)</h3>
          <div class="form-group">
            <label>Líder Pokémon</label>
            <select
              v-model="store.enemyPokemonId"
              class="pixel-select"
              @change="handleEnemyPokeChange"
            >
              <option
                v-for="poke in pokemonList"
                :key="poke.id"
                :value="poke.id"
              >
                {{ poke.name }}
              </option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label class="pixel-checkbox-label">
              <input
                v-model="store.enemyShiny"
                type="checkbox"
                class="pixel-checkbox"
              >
              <span class="checkbox-text">Líder Variocolor (Shiny) ✨</span>
            </label>
          </div>
          
          <div
            v-for="i in 4"
            :key="`e-move-${i}`"
            class="form-group"
          >
            <label>Movimiento {{ i }}</label>
            <select
              v-model="store.enemyMoves[i - 1]"
              class="pixel-select"
            >
              <option
                v-for="move in moveList"
                :key="move.id"
                :value="move.id"
              >
                {{ move.nameEs }} - {{ translateType(move.type) }} (Poder: {{ move.basePower }})
              </option>
            </select>
          </div>
          <p class="autocomplete-hint">
            Los otros 5 miembros se autocompletarán aleatoriamente.
          </p>
        </div>
      </div>

      <div class="setup-actions">
        <button
          class="start-btn animate-pulse"
          @click="store.startMockBattle()"
        >
          ▶ INICIAR SIMULACIÓN 6VS6
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.setup-overlay {
  position: absolute;
  inset: 0;
  z-index: 1000;
  background: Rgba(5, 7, 12, 0.9);
  backdrop-filter: Blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 20px;
}

.setup-panel {
  background: Rgba(15, 18, 32, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 50px Rgba(0, 0, 0, 0.8), inset 0 1px 1px Rgba(255, 255, 255, 0.1);
  width: 90%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  .setup-title {
    font-family: var(--font-pixel);
    font-size: 16px;
    color: var(--yellow, #ffd60a);
    text-align: center;
    margin: 0;
    text-shadow: 2px 2px 0 Rgba(0, 0, 0, 0.8);
  }
}

.teams-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.team-setup {
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  h3 {
    font-family: var(--font-pixel);
    font-size: 12px;
    margin: 0;
    color: #f5f5f7;
    text-align: center;
    padding-bottom: 8px;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  }

  &.player-setup {
    border-top: 3px solid var(--blue, #0a84ff);
  }
  &.enemy-setup {
    border-top: 3px solid var(--red, #ff453a);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-family: var(--font-pixel);
    font-size: 8px;
    color: var(--gray, #86868b);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.pixel-select {
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: #fff;
  font-family: var(--font-ui, 'Nunito', sans-serif);
  font-size: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover, &:focus {
    background: Rgba(255, 255, 255, 0.1);
    border-color: var(--blue, #0a84ff);
    box-shadow: 0 0 10px Rgba(10, 132, 255, 0.2);
  }

  option {
    background: #0f1220;
    color: #fff;
  }
}

.checkbox-group {
  margin-top: 4px;
  margin-bottom: 8px;
}

.pixel-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-family: var(--font-pixel);
  font-size: 8px;
  color: var(--gray, #86868b);
  transition: color 0.3s ease;

  &:hover {
    color: #fff;

    .pixel-checkbox {
      border-color: var(--blue, #0a84ff);
      box-shadow: 0 0 8px Rgba(10, 132, 255, 0.4);
    }
  }

  .checkbox-text {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.pixel-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  display: grid;
  place-content: center;

  &:checked {
    &::before {
      content: "";
      width: 8px;
      height: 8px;
      background-color: white;
      clip-path: polygon(14% 0%, 0% 14%, 36% 50%, 0% 86%, 14% 100%, 50% 64%, 86% 100%, 100% 86%, 64% 50%, 100% 14%, 86% 0%, 50% 36%);
    }
  }

  &:focus {
    outline: none;
    border-color: var(--blue, #0a84ff);
  }
}

.player-setup {
  .pixel-checkbox:checked {
    background: var(--blue, #0a84ff);
    border-color: var(--blue, #0a84ff);
    box-shadow: 0 0 10px Rgba(10, 132, 255, 0.5);
  }
}

.enemy-setup {
  .pixel-checkbox:checked {
    background: var(--red, #ff453a);
    border-color: var(--red, #ff453a);
    box-shadow: 0 0 10px Rgba(255, 69, 58, 0.5);
  }

  .pixel-checkbox-label:hover {
    .pixel-checkbox {
      border-color: var(--red, #ff453a);
      box-shadow: 0 0 8px Rgba(255, 69, 58, 0.4);
    }
  }
}

.autocomplete-hint {
  font-family: var(--font-ui, 'Nunito', sans-serif);
  font-size: 11px;
  color: var(--gray, #86868b);
  margin: 0;
  text-align: center;
  font-style: italic;
}

.setup-actions {
  display: flex;
  justify-content: center;
  margin-top: 16px;

  .start-btn {
    background: linear-gradient(135deg, var(--green, #32d74b) 0%, #28a745 100%);
    border: none;
    color: white;
    font-family: var(--font-pixel);
    font-size: 14px;
    padding: 16px 32px;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 15px Rgba(50, 215, 75, 0.4);
    transition: all 0.3s ease;
    text-shadow: 1px 1px 2px Rgba(0,0,0,0.5);

    &:hover {
      transform: Translatey(-2px);
      box-shadow: 0 6px 20px Rgba(50, 215, 75, 0.6);
    }
  }
}

.animate-pulse {
  animation: pulse-border 2s infinite ease-in-out;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 4px 15px Rgba(10, 132, 255, 0.4); }
  50% { box-shadow: 0 0 25px Rgba(10, 132, 255, 0.7); }
}
</style>
