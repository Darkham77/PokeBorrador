<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { PLAYER_CLASSES } from '@/data/playerClasses'
import { formatCurrency } from '@/logic/utils/formatters'
import { useAuthStore } from '@/stores/auth'
import { useModalStore } from '@/stores/modals'
import { useChatStore } from '@/stores/chat'
import { useSocialStore } from '@/stores/social'
import BaseModal from '@/components/common/BaseModal.vue'
import TrainerAvatar from '@/components/TrainerAvatar.vue'

interface Props {
  show?: boolean
  userId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  userId: null
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

interface ProfileRow {
  id: string
  username?: string | null
  email?: string | null
  faction?: string | null
  player_class?: string | null
  trainer_level?: number | null
  avatar_style?: string | null
  nick_style?: string | null
  pvp_wins?: number | null
  pvp_losses?: number | null
  elo_rating?: number | null
  created_at?: string | null
}

interface SaveStateData {
  trainer?: string
  faction?: string | null
  playerClass?: string | null
  trainerLevel?: number
  avatar_style?: string
  nick_style?: string
  badges?: number
  defeatedGyms?: string[]
  pokedex?: unknown[]
  seenPokedex?: string[]
  stats?: {
    trainersDefeated?: number
    wins?: number
    losses?: number
  }
  pvpStats?: {
    wins?: number
    losses?: number
  }
  eloRating?: number
  warCoins?: number
  classData?: {
    criminality?: number
    reputation?: number
    longestStreak?: number
  }
  warMyPtsLocal?: Record<string, number>
}

const gameStore = useGameStore()
const authStore = useAuthStore()

const loading = ref(true)
const profile = ref<ProfileRow | null>(null)
const saveState = ref<SaveStateData | null>(null)
const error = ref<string | null>(null)

const isOwnProfile = computed(() => {
  return authStore.user?.id === props.userId
})

const modalStore = useModalStore()
const chatStore = useChatStore()
const socialStore = useSocialStore()

const openRename = () => {
  modalStore.open('Rename')
}

// Fetch player profile and save data from database
const fetchData = async () => {
  if (!props.userId) {
    error.value = 'ID de usuario no proporcionado'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  profile.value = null
  saveState.value = null

  try {
    const db = gameStore.db
    if (!db) {
      error.value = 'Base de datos no disponible'
      return
    }

    // 1. Fetch profile
    const { data: prof, error: pErr } = await db
      .from('profiles')
      .select('*')
      .eq('id', props.userId)
      .maybeSingle()

    if (pErr) throw pErr
    profile.value = (prof as ProfileRow) || null

    // 2. Fetch game save
    const { data: saveRow, error: sErr } = (await db
      .from('game_saves')
      .select('save_data')
      .eq('user_id', props.userId)
      .maybeSingle()) as { data: { save_data: unknown } | null, error: Error | null }

    if (sErr) throw sErr

    // Si no se encuentra ni perfil ni partida guardada, mostramos error
    if (!profile.value && !saveRow?.save_data) {
      error.value = 'Perfil de entrenador no encontrado'
      return
    }

    if (saveRow?.save_data) {
      let rawSave: unknown = saveRow.save_data
      if (typeof rawSave === 'string') {
        try {
          rawSave = JSON.parse(rawSave)
        } catch (_) {
          rawSave = null
        }
      }
      saveState.value = rawSave as SaveStateData
    }
  } catch (e: unknown) {
    const err = e as Error
    error.value = `Error: ${err.message || 'No se pudieron recuperar los datos'}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

watch(() => props.userId, () => {
  fetchData()
})

// Computeds for safe fallback mappings
const trainerName = computed(() => {
  const cached = props.userId ? chatStore.profileCosmetics[props.userId] : null
  if (cached?.username) return cached.username
  const friend = props.userId ? socialStore.friends.find(f => f.id === props.userId) : null
  if (friend?.username) return friend.username
  return saveState.value?.trainer || profile.value?.username || 'Entrenador'
})

const faction = computed(() => {
  return profile.value?.faction || saveState.value?.faction || null
})

const playerClass = computed(() => {
  const cached = props.userId ? chatStore.profileCosmetics[props.userId] : null
  if (cached?.player_class !== undefined) return cached.player_class
  const friend = props.userId ? socialStore.friends.find(f => f.id === props.userId) : null
  if (friend?.playerClass !== undefined) return friend.playerClass
  return profile.value?.player_class || saveState.value?.playerClass || null
})

const classDef = computed(() => {
  if (!playerClass.value) return null
  return (PLAYER_CLASSES as Record<string, { id: string; name: string; color: string; description: string }>)[playerClass.value] || null
})

const trainerLevel = computed(() => {
  const cached = props.userId ? chatStore.profileCosmetics[props.userId] : null
  if (cached?.trainer_level !== undefined) return cached.trainer_level
  const friend = props.userId ? socialStore.friends.find(f => f.id === props.userId) : null
  if (friend?.level !== undefined) return friend.level
  return profile.value?.trainer_level ?? saveState.value?.trainerLevel ?? 1
})

const avatarStyle = computed(() => {
  const cached = props.userId ? chatStore.profileCosmetics[props.userId] : null
  if (cached?.avatar_style !== undefined) return cached.avatar_style
  const friend = props.userId ? socialStore.friends.find(f => f.id === props.userId) : null
  if (friend?.avatar_style !== undefined) return friend.avatar_style
  return profile.value?.avatar_style ?? saveState.value?.avatar_style ?? ''
})

const nickStyle = computed(() => {
  const cached = props.userId ? chatStore.profileCosmetics[props.userId] : null
  if (cached?.nick_style !== undefined) return cached.nick_style
  const friend = props.userId ? socialStore.friends.find(f => f.id === props.userId) : null
  if (friend?.nick_style !== undefined) return friend.nick_style
  return profile.value?.nick_style ?? saveState.value?.nick_style ?? ''
})

const badgesCount = computed(() => {
  return saveState.value?.badges ?? saveState.value?.defeatedGyms?.length ?? 0
})

const pokedexCaught = computed(() => {
  return saveState.value?.pokedex?.length ?? 0
})

const pokedexSeen = computed(() => {
  return saveState.value?.seenPokedex?.length ?? 0
})

const trainersDefeated = computed(() => {
  return saveState.value?.stats?.trainersDefeated ?? 0
})

const wildWins = computed(() => {
  return saveState.value?.stats?.wins ?? 0
})

const pvpWins = computed(() => {
  return profile.value?.pvp_wins ?? saveState.value?.pvpStats?.wins ?? 0
})

const pvpLosses = computed(() => {
  return profile.value?.pvp_losses ?? saveState.value?.pvpStats?.losses ?? 0
})



const eloRating = computed(() => {
  return profile.value?.elo_rating ?? saveState.value?.eloRating ?? 1000
})

const warCoins = computed(() => {
  return saveState.value?.warCoins ?? 0
})

const criminality = computed(() => {
  return saveState.value?.classData?.criminality ?? 0
})

const reputation = computed(() => {
  return saveState.value?.classData?.reputation ?? 0
})

const captureStreak = computed(() => {
  return saveState.value?.classData?.longestStreak ?? 0
})

const totalWarPoints = computed<number>(() => {
  if (!saveState.value?.warMyPtsLocal) return 0
  const points = Object.values(saveState.value.warMyPtsLocal) as number[]
  return points.reduce((a: number, b: number) => Number(a) + Number(b), 0)
})

// Badges
const GYM_BADGES = [
  { id: 'pewter', name: 'Roca' },
  { id: 'cerulean', name: 'Cascada' },
  { id: 'vermilion', name: 'Trueno' },
  { id: 'celadon', name: 'Arcoíris' },
  { id: 'fuchsia', name: 'Alma' },
  { id: 'saffron', name: 'Marsh' },
  { id: 'cinnabar', name: 'Volcán' },
  { id: 'viridian', name: 'Tierra' }
]

const isGymDefeated = (gymId: string) => {
  const list = saveState.value?.defeatedGyms || []
  return list.includes(gymId)
}

const factionLabel = computed(() => {
  const f = faction.value
  if (!f || f === 'null' || f === 'undefined' || f.trim() === '') return 'Sin Bando'
  if (f === 'union') return 'Equipo Unión'
  if (f === 'poder') return 'Equipo Poder'
  if (f === 'rocket') return 'Equipo Rocket'
  return f.toUpperCase()
})

const factionColor = computed(() => {
  const f = faction.value
  if (!f || f === 'null' || f === 'undefined' || f.trim() === '') return 'rgba(148, 163, 184, 0.5)'
  if (f === 'union') return 'rgba(59, 130, 246, 1)'
  if (f === 'poder') return 'rgba(239, 68, 68, 1)'
  if (f === 'rocket') return 'rgba(148, 163, 184, 1)'
  return 'rgba(148, 163, 184, 1)'
})

const formatNum = (num: number | string | unknown) => formatCurrency(Number(num || 0))

const close = () => {
  emit('close')
}

// Asset loaders
const getAssetUrlLocal = getAssetUrl
const ASSET_TYPES_LOCAL = ASSET_TYPES
</script>

<template>
  <BaseModal
    :show="show"
    title="PERFIL DE ENTRENADOR"
    title-color="var(--yellow)"
    :header-background="playerClass === 'rocket' ? 'rgba(239, 68, 68, 0.15)' : (playerClass === 'cazabichos' ? 'rgba(34, 197, 94, 0.15)' : (playerClass === 'entrenador' ? 'rgba(59, 130, 246, 0.15)' : (playerClass === 'criador' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(15, 23, 42, 0.8)')))"
    type="side-right"
    max-width="420px"
    :show-close-button="true"
    padding="raw"
    :custom-class="'trainer-profile-modal ' + (playerClass || 'default')"
    :lock-scroll="false"
    overlay="dark"
    @close="close"
  >
    <section class="profile-panel-content custom-scrollbar">
      <!-- Loading State -->
      <div
        v-if="loading"
        class="loading-state"
      >
        <div class="loader-spinner" />
        <span class="loading-text">CARGANDO ENTRENADOR...</span>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="error-state"
      >
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ error }}</span>
        <button
          class="retry-btn"
          @click="fetchData"
        >
          REINTENTAR
        </button>
      </div>

      <!-- Main Profile Body -->
      <div
        v-else
        class="profile-body-premium"
      >
        <!-- Identity Section -->
        <div class="profile-identity-card">
          <div class="avatar-wrap">
            <TrainerAvatar
              :player-class="playerClass"
              :level="trainerLevel"
              :avatar-style="avatarStyle"
              :size="120"
            />
          </div>
          <div
            class="profile-username"
            :class="nickStyle || 'normal'"
          >
            <span>{{ trainerName }}</span>
            <a
              v-if="isOwnProfile"
              href="#"
              class="change-link"
              title="Cambiar Nombre"
              @click.prevent.stop="openRename"
            >
              ✏️ CAMBIAR
            </a>
          </div>
          <div
            v-if="classDef"
            class="profile-profession"
            :style="{ color: classDef.color }"
          >
            {{ classDef.name }} • LV. {{ trainerLevel }}
          </div>
        </div>

        <!-- Faction Section -->
        <div class="profile-section-card faction-card">
          <div class="section-label">
            BANDO
          </div>
          <div class="faction-row">
            <div
              class="faction-badge"
              :style="{ color: factionColor }"
            >
              <img
                v-if="faction && faction !== 'null' && faction !== 'undefined' && faction.trim() !== ''"
                :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.FACTION, faction)"
                class="faction-img"
                @error="(e: Event) => { if (e.target) (e.target as HTMLImageElement).style.display = 'none' }"
              >
              {{ factionLabel }}
            </div>
          </div>
        </div>

        <!-- Badges Showcase -->
        <div class="profile-section-card badges-card">
          <div class="section-label">
            MEDALLAS DE KANTO ({{ badgesCount }}/8)
          </div>
          <div class="badges-shelf">
            <div 
              v-for="badge in GYM_BADGES" 
              :key="badge.id"
              class="badge-item"
              :title="badge.name"
            >
              <img 
                :src="getAssetUrlLocal(ASSET_TYPES_LOCAL.BADGE, badge.id)" 
                class="badge-img"
                :class="{ 'locked-badge': !isGymDefeated(badge.id) }"
              >
              <span class="badge-title">{{ badge.name }}</span>
            </div>
          </div>
        </div>

        <!-- Pokedex Progress -->
        <div class="profile-section-card pokedex-card">
          <div class="section-label">
            PROGRESO DE POKÉDEX
          </div>
          <div class="pokedex-stats">
            <div class="pokedex-stat">
              <span class="pokedex-val">{{ pokedexCaught }}</span>
              <span class="pokedex-lbl">Capturados</span>
            </div>
            <div class="pokedex-stat">
              <span class="pokedex-val">{{ pokedexSeen }}</span>
              <span class="pokedex-lbl">Vistos</span>
            </div>
          </div>
          <div class="pokedex-bar-container">
            <div 
              class="pokedex-bar-progress" 
              :style="{ width: Math.min(100, (pokedexCaught / 151) * 100) + '%' }" 
            />
          </div>
          <div class="pokedex-footer">
            <span>Gen I Total: 151</span>
            <span>{{ Math.round((pokedexCaught / 151) * 100) }}% Completado</span>
          </div>
        </div>

        <!-- Combat & Arena Stats -->
        <div class="profile-section-card stats-card">
          <div class="section-label">
            ESTADÍSTICAS DE COMBATE
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-val">{{ trainersDefeated }}</span>
              <span class="stat-lbl">Entr. Derrotados</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">{{ wildWins }}</span>
              <span class="stat-lbl">Vics. Salvaje</span>
            </div>
            <div class="stat-item pvp">
              <span class="stat-val ELO">{{ eloRating }}</span>
              <span class="stat-lbl">Puntos ELO</span>
            </div>
            <div class="stat-item pvp">
              <span class="stat-val">{{ pvpWins }} - {{ pvpLosses }}</span>
              <span class="stat-lbl">Récord PvP (V-D)</span>
            </div>
          </div>
        </div>

        <!-- Faction War Contribution -->
        <div
          v-if="faction"
          class="profile-section-card war-card"
        >
          <div class="section-label">
            GUERRA DE BANDOS
          </div>
          <div class="stats-grid">
            <div class="stat-item highlight-war-points">
              <span class="stat-val">
                <i class="fas fa-shield-alt icon-war" />
                {{ formatNum(totalWarPoints) }}
              </span>
              <span class="stat-lbl">Puntos de Guerra</span>
            </div>
            <div class="stat-item highlight-war-coins">
              <span class="stat-val">
                <i class="fas fa-coins icon-war-coin" />
                {{ formatNum(warCoins) }}
              </span>
              <span class="stat-lbl">Monedas de Guerra</span>
            </div>
          </div>
        </div>

        <!-- Class Custom Details -->
        <div
          v-if="playerClass"
          class="profile-section-card class-details-card"
        >
          <div class="section-label">
            ESPECIALIZACIÓN DE CLASE
          </div>
          <div class="stats-grid">
            <div
              v-if="playerClass === 'rocket'"
              class="stat-item"
            >
              <span class="stat-val danger-text">{{ criminality }}%</span>
              <span class="stat-lbl">Criminalidad</span>
            </div>
            <div
              v-else
              class="stat-item"
            >
              <span class="stat-val primary-text">{{ reputation }}</span>
              <span class="stat-lbl">Reputación</span>
            </div>
            <div class="stat-item">
              <span class="stat-val yellow-text">{{ captureStreak }}</span>
              <span class="stat-lbl">Mayor Racha</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;
@use "@/styles/components/cosmetics" as *;

.profile-panel-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  will-change: transform, filter, opacity, backdrop-filter;
  backdrop-filter: Blur(12px);
  @include gpu-layer;
  
  .rocket & { background: linear-gradient(180deg, Rgba(239, 68, 68, 0.15) 0%, transparent 60%); }
  .cazabichos & { background: linear-gradient(180deg, Rgba(34, 197, 94, 0.15) 0%, transparent 60%); }
  .entrenador & { background: linear-gradient(180deg, Rgba(59, 130, 246, 0.15) 0%, transparent 60%); }
  .criador & { background: linear-gradient(180deg, Rgba(168, 85, 247, 0.15) 0%, transparent 60%); }
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 16px;
  flex: 1;

  .loading-text, .error-message {
    @include pixelated;
    font-size: 10px;
    color: Rgba(255, 255, 255, 0.6);
  }

  .loader-spinner {
    width: 32px;
    height: 32px;
    border: 3px dashed var(--yellow);
    border-radius: 50%;
    animation: spin 2s linear infinite;
  }

  .error-icon {
    font-size: 32px;
  }

  .retry-btn {
    @include btn-vicio('primary', 'sm', true);
    margin-top: 12px;
    padding: 8px 16px;
    font-size: 8px;
  }
}

@keyframes spin {
  0% { transform: Rotate(0deg); }
  100% { transform: Rotate(360deg); }
}

.profile-body-premium {
  padding: 0 24px 40px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  @include smooth-scroll;
}

.profile-identity-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 20px;
  background: transparent;
  border: none;

  .avatar-wrap {
    margin-bottom: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    border-radius: 50%;
  }

  .profile-username {
    @include pixelated;
    font-size: 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;

    .change-link {
      @include pixelated;
      font-size: 8px;
      color: var(--yellow);
      text-decoration: none;
      font-weight: normal;
      text-shadow: none;
      
      &:hover { text-decoration: underline; }
    }
  }

  .profile-profession {
    font-size: 10px;
    @include pixelated;
    text-transform: uppercase;
  }
}

.profile-section-card {
  padding: 20px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 20px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  .section-label {
    @include pixelated;
    font-size: 8px;
    color: Rgba(255, 255, 255, 0.3);
    margin-bottom: 16px;
    letter-spacing: 1px;
  }
}

.faction-row {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .faction-badge {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 700;
    font-size: 14px;
    @include pixelated;

    .faction-img {
      width: 24px;
      height: 24px;
    }
  }
}

/* Badges Shelf Retro Styling */
.badges-shelf {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: linear-gradient(180deg, Rgba(82, 53, 31, 0.8) 0%, Rgba(56, 36, 21, 0.9) 100%);
  border: 2px solid #3d2412;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 
    inset 0 4px 8px Rgba(0, 0, 0, 0.6),
    0 4px 10px Rgba(0, 0, 0, 0.4);
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.badge-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  transition: all 0.3s ease;
  @include pixelated;
  filter: Drop-Shadow(0 2px 4px Rgba(0, 0, 0, 0.4));

  &.locked-badge {
    filter: Grayscale(100%) Brightness(0.5);
    opacity: 0.25;
  }
}

.badge-title {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

/* Pokédex Section */
.pokedex-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.pokedex-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pokedex-val {
  @include pixelated;
  font-size: 16px;
  color: var(--white);
}

.pokedex-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
}

.pokedex-bar-container {
  width: 100%;
  height: 8px;
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.pokedex-bar-progress {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #eab308, #22c55e);
  border-radius: 4px;
  box-shadow: 0 0 8px Rgba(34, 197, 94, 0.4);
}

.pokedex-footer {
  display: flex;
  justify-content: space-between;
  @include pixelated;
  font-size: 7px;
  color: Rgba(255, 255, 255, 0.25);
}

/* Stats grids */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-item {
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s ease;
  @include gpu-layer;

  &:hover {
    background: Rgba(30, 41, 59, 0.5);
    border-color: Rgba(255, 214, 10, 0.2);
    box-shadow: 0 0 0 1px Rgba(255, 214, 10, 0.2);
    transform: Translatey(-2px);
  }

  &.pvp {
    background: linear-gradient(135deg, Rgba(236, 72, 153, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(236, 72, 153, 0.2);

    .stat-val.ELO {
      color: #f472b6;
      text-shadow: 0 0 10px Rgba(236, 72, 153, 0.4);
    }
  }

  &.highlight-war-points {
    background: linear-gradient(135deg, Rgba(59, 130, 246, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(59, 130, 246, 0.2);

    .stat-val, .icon-war {
      color: #60a5fa;
      text-shadow: 0 0 10px Rgba(59, 130, 246, 0.4);
    }
  }

  &.highlight-war-coins {
    background: linear-gradient(135deg, Rgba(251, 191, 36, 0.05) 0%, Rgba(15, 23, 42, 0.4) 100%);
    border-color: Rgba(251, 191, 36, 0.2);

    .stat-val, .icon-war-coin {
      color: #fbbf24;
      text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4);
    }
  }
}

.stat-val {
  @include pixelated;
  font-size: 14px;
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stat-lbl {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Colors & Helpers */
.danger-text { color: #f87171 !important; text-shadow: 0 0 10px Rgba(239, 68, 68, 0.4); }
.primary-text { color: #60a5fa !important; text-shadow: 0 0 10px Rgba(59, 130, 246, 0.4); }
.yellow-text { color: #fbbf24 !important; text-shadow: 0 0 10px Rgba(251, 191, 36, 0.4); }

.trainer-profile-modal {
  border-left: 2px solid Rgba(255, 255, 255, 0.05) !important;
  
  :deep(.modal-scrollable-content) {
    background: transparent !important;
  }
}
</style>
