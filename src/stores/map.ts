
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { logger } from '@/logic/utils/logger'
import { FIRE_RED_MAPS } from '@/data/maps'
import { generateEncounter } from '@/logic/encounters'
import { getDayCycle, getSeason, syncServerTime, getServerTime } from '@/logic/timeUtils'
import { getRouteWeather } from '@/logic/weatherUtils'
import { useGameStore } from './game.ts'
import { useBattleStore } from './battle.ts'
import { useUIStore } from './ui.ts'
import { useEventStore } from './events.ts'
import type { Pokemon } from '@/types/pokemon'
import type { Event } from '@/logic/events/eventEngine'
import type { DayPhase, Season } from '@/logic/timeUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { MapLocation } from '@/types/encounters'

export interface PendingAward {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export const useMapStore = defineStore('map', () => {
  const gs = useGameStore()
  const currentMap = computed({
    get: () => gs.state.map?.currentMap || 'route1',
    set: (val: string) => { if (gs.state.map) gs.state.map.currentMap = val }
  })
  const region = computed(() => gs.state.map?.region || 'kanto')
  const currentMapData = computed(() => maps.value.find((m: (typeof FIRE_RED_MAPS)[number]) => m.id === currentMap.value))

  const globalWeather = ref<string | null>(null) // Si está forzado anula el determinístico
  const forcedCycle = ref<DayPhase | null>(null)
  const forcedSeason = ref<Season | null>(null)
  const currentEpochHour = ref(Math.floor(Temporal.Now.instant().epochMilliseconds / 3600000))

  // Sync epoch hour every second for real-time feeling
  if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    const updateEpoch = () => {
      currentEpochHour.value = Math.floor(getServerTime() / 3600000)
      gsap.delayedCall(1, updateEpoch)
    }
    gsap.delayedCall(1, updateEpoch)
  }

  const currentCycle = computed(() => {
    if (forcedCycle.value) return forcedCycle.value
    return getDayCycle(currentEpochHour.value * 3600000)
  })
  
  const currentSeason = computed(() => {
    if (forcedSeason.value) return forcedSeason.value
    return getSeason(currentEpochHour.value * 3600000)
  })
  
  const currentWeather = computed(() => {
    if (globalWeather.value) return globalWeather.value
    return getRouteWeather(currentMap.value, currentSeason.value.id, currentEpochHour.value, currentCycle.value)
  })
  
  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      logger.info('MapStore', 'Time sync detected');
      currentEpochHour.value = Math.floor(getServerTime() / 3600000);
    });
  }

  // Sync time on store init (safer than onMounted in a store)
  // syncServerTime() -- DEFERRED to game initialization
  const maps = ref(FIRE_RED_MAPS)
  const activeEvents = ref<Event[]>([])
  const lastNavigateTime = ref(0)
  const lastTrainerChanceIncrementAt = ref(Temporal.Now.instant().epochMilliseconds)
  const dailyGuardianCaptures = ref<string[]>([])
  const mapWinners = ref<Record<string, import('@/types/stores').DominanceInfo>>({}) // locId -> winner
  const pendingAwards = ref<PendingAward[]>([])
  
  const setGlobalSeason = (s: string | null) => {
    if (!s) {
      forcedSeason.value = null
      return
    }
    const seasons: Season[] = [
      { id: 'spring', label: 'Primavera', icon: '🌸' },
      { id: 'summer', label: 'Verano', icon: '🌻' },
      { id: 'autumn', label: 'Otoño', icon: '🍂' },
      { id: 'winter', label: 'Invierno', icon: '⛄' }
    ]
    forcedSeason.value = seasons.find(sea => sea.id === s) || null
  }
  
  const setGlobalWeather = (w: string | null) => { globalWeather.value = w }
  const setGlobalCycle = (c: DayPhase | null) => { forcedCycle.value = c }

  const navigate = async (locId: string) => {
    const now = Temporal.Now.instant().epochMilliseconds
    if (now - lastNavigateTime.value < 400) {
      logger.warn('MapStore', 'Navigate throttled');
      return
    }
    lastNavigateTime.value = now
    logger.info('MapStore', `Navigating to ${locId}...`);

    const gs = useGameStore()
    const battleStore = useBattleStore()
    const uiStore = useUIStore()

    // Pity timer logic: cada 2 minutos aumenta tChance en 5% (max 20%)
    const elapsedPity = now - lastTrainerChanceIncrementAt.value
    if (elapsedPity >= 120000) {
      const increments = Math.floor(elapsedPity / 120000)
      gs.state.trainerChance = Math.min(20, (gs.state.trainerChance || 5) + increments * 5)
      lastTrainerChanceIncrementAt.value = now
      logger.info('MapStore', `PITY: Trainer chance increased to ${gs.state.trainerChance}%`)
    }

    // 1. Verificar salud del equipo
    const healthy = (gs.state.team as Pokemon[]).find(p => p.hp > 0 && !p.onMission && !p.onDefense)
    if (!healthy) {
      uiStore.notify('Todos tus Pokémon están debilitados. ¡Ve al Centro Pokémon!', '🏥')
      return
    }

    // Actualizar ubicación actual y sincronizar tiempo ambiental
    await syncServerTime()
    currentEpochHour.value = Math.floor(getServerTime() / 3600000)
    currentMap.value = locId

    // 2. Progreso de eclosión
    gs.hatchEggs()

    // 3. Generar Encuentro
    const eventStore = useEventStore()
    
    // MODO DEBUG: Si hay un bucle infinito activo, lo usamos
    const encounter = battleStore.debugLoopPokemon 
      ? (() => {
          const nextPoke = JSON.parse(JSON.stringify(battleStore.debugLoopPokemon)) as Pokemon
          nextPoke.hp = nextPoke.maxHp
          nextPoke.status = null
          nextPoke.confused = 0
          nextPoke.flinched = false
          logger.debug('DEBUG', `Navegación: Usando bucle infinito de ${nextPoke.name}`)
          return { type: 'wild', pokemon: nextPoke }
        })()
      : await generateEncounter(locId, gs.state, {
          activeEvents: activeEvents.value,
          dominanceData: mapWinners.value,
          shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
          weather: currentWeather.value,
          eventFishingBonus: eventStore.globalMultipliers?.fishing || 1
        })


    if (!encounter) {
      logger.info('MapStore', `No encounter generated for ${locId}`);
      return
    }
    logger.success('MapStore', `Encounter generated: ${encounter.type}`);

    // 4. Procesar Tipo de Encuentro
    const wildEnc = encounter as { type: string; pokemon: Pokemon; pts?: number; faction?: string; rarity?: number };
    if (wildEnc.type === 'wild' || wildEnc.type === 'fishing' || wildEnc.type === 'archaeology') {
      battleStore._startBattle(wildEnc.pokemon, { 
        locationId: locId,
        wasSearching: true,
        isFishing: wildEnc.type === 'fishing',
        isArchaeology: wildEnc.type === 'archaeology'
      })
    } else if (wildEnc.type === 'guardian') {
      // El componente MapView debe manejar la notificación visual o podemos dispararla aquí si es modal
      // Por ahora, iniciamos la batalla marcando que es un Guardián;
      wildEnc.pokemon.isGuardian = true
      battleStore._startBattle(wildEnc.pokemon, { 
        locationId: locId,
        wasSearching: true,
        isGuardian: true,
        pts: wildEnc.pts
      })
    } else if (wildEnc.type === 'defender') {
      // TODO: Implementar búsqueda de defensores reales desde Supabase
      // Por ahora notificamos
      uiStore.notify(`¡Defensor del Team ${wildEnc.faction?.toUpperCase()} detectado!`, '⚔️')
    } else if (wildEnc.type === 'trainer') {
      // Reset base trainer chance to 5%
      gs.state.trainerChance = 5
      lastTrainerChanceIncrementAt.value = now

      const { getEvolvedForm } = await import('@/logic/evolutionLogic')
      const { makePokemon } = await import('@/logic/pokemonFactory')

      const isMaxCriminality = (gs.state.playerClass === 'rocket' && (gs.state.classData?.criminality ?? 0) >= 100)
      const baseLv = currentMapData.value?.lv?.[0] || 5

      let tName = 'Entrenador'
      let tSprite = 'youngster'
      const enemyTeam: Pokemon[] = []

      if (isMaxCriminality) {
        tName = 'Oficial de Policía'
        tSprite = 'tamer'
        const criminality = gs.state.classData?.criminality || 100
        const excess = Math.max(0, criminality - 100)
        const bonusLv = Math.floor(excess / 50)
        const trainerLv = baseLv + 5 + bonusLv
        const teamSize = Math.floor(Math.random() * 2) + 3 // 3-4 pokemon
        const policePool = ['growlithe', 'arcanine', 'machoke', 'magneton', 'pidgeot']

        for (let i = 0; i < teamSize; i++) {
          const pIdBase = policePool[Math.floor(Math.random() * policePool.length)] || 'growlithe'
          const pId = getEvolvedForm(pIdBase, trainerLv)
          const p = makePokemon(pId, trainerLv) as Pokemon
          if (p) {
            (p as Pokemon & { _revealed?: boolean })._revealed = true
            enemyTeam.push(p)
          }
        }
      } else {
        const TRAINER_TYPES = {
          'caza_bichos': { name: 'Caza Bichos', sprite: 'cazabichos', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
          'ornitologo': { name: 'Ornitólogo', sprite: 'birdkeeper', pool: ['pidgey', 'spearow', 'doduo'] },
          'cientifico': { name: 'Científico', sprite: 'scientist', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
          'luchador': { name: 'Luchador', sprite: 'blackbelt', pool: ['mankey', 'machop'] },
          'pescador': { name: 'Pescador', sprite: 'swimmer', pool: ['magikarp', 'goldeen', 'poliwag'] },
          'nadador': { name: 'Nadador', sprite: 'swimmer', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
          'domador': { name: 'Domador', sprite: 'tamer', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
          'medium': { name: 'Médium', sprite: 'psychic', pool: ['abra', 'drowzee'] },
          'motorista': { name: 'Motorista', sprite: 'biker', pool: ['koffing', 'grimer', 'rattata'] },
          'montanero': { name: 'Montañero', sprite: 'hiker', pool: ['geodude', 'sandshrew', 'rhyhorn'] }
        } as const
        const keys = Object.keys(TRAINER_TYPES) as Array<keyof typeof TRAINER_TYPES>
        const typeKey = keys[Math.floor(Math.random() * keys.length)] || 'caza_bichos'
        const t = TRAINER_TYPES[typeKey]
        
        tName = t.name
        tSprite = t.sprite
        const trainerLv = baseLv + 2
        const teamSize = Math.floor(Math.random() * 3) + 1 // 1-3 pokemon

        for (let i = 0; i < teamSize; i++) {
          const pIdBase = t.pool[Math.floor(Math.random() * t.pool.length)] || 'rattata'
          const pId = getEvolvedForm(pIdBase, trainerLv)
          const p = makePokemon(pId, trainerLv) as Pokemon
          if (p) {
            (p as Pokemon & { _revealed?: boolean })._revealed = true
            enemyTeam.push(p)
          }
        }
      }

      if (enemyTeam.length > 0 && enemyTeam[0]) {
        battleStore._startBattle(enemyTeam[0], {
          locationId: locId,
          wasSearching: true,
          isTrainer: true,
          enemyTeam,
          trainerName: tName,
          trainerSprite: tSprite
        })
      }
    } else if (wildEnc.type === 'rival') {
      const { getEvolvedForm } = await import('@/logic/evolutionLogic')
      const { makePokemon } = await import('@/logic/pokemonFactory')

      const trainerNameVal = 'Rival Azul'
      const trainerSpriteVal = 'blue'
      
      const teamSize = Math.max(3, gs.state.team.length || 1)
      const avgLevel = gs.state.team.reduce((sum, p) => sum + p.level, 0) / (gs.state.team.length || 1)
      const rivalLevel = Math.floor(avgLevel) + 2

      const rivalPoolBase = ['pidgeot', 'alakazam', 'gyarados', 'arcanine', 'exeggutor', 'charizard']
      const shuffledPool = [...rivalPoolBase].sort(() => Math.random() - 0.5).slice(0, teamSize)

      const enemyTeam: Pokemon[] = shuffledPool.map(id => {
        const species = getEvolvedForm(id, rivalLevel)
        const p = makePokemon(species, rivalLevel) as Pokemon
        if (p) (p as Pokemon & { _revealed?: boolean })._revealed = true
        return p
      }).filter((p): p is Pokemon => !!p)

      if (enemyTeam.length > 0 && enemyTeam[0]) {
        battleStore._startBattle(enemyTeam[0], {
          locationId: locId,
          wasSearching: true,
          isTrainer: true,
          enemyTeam,
          trainerName: trainerNameVal,
          trainerSprite: trainerSpriteVal,
          isRival: true
        })
      }
    }
  }

  const triggerArchaeologyRewards = async (locId: string, difficulty?: string) => {
    const mapsList = pokemonDataProvider.getMaps() as unknown as MapLocation[]
    const loc = mapsList.find(m => m.id === locId)
    const { useInventoryStore } = await import('./inventory.ts')
    const inventoryStore = useInventoryStore()
    const uiStore = useUIStore()
    const battleStore = useBattleStore()
    const { SHOP_ITEMS } = await import('@/data/items.ts')
    const { getAssetUrl, ASSET_TYPES } = await import('@/logic/services/assetService.ts')

    let maxRolls = 1
    if (difficulty === 'medium') maxRolls = 2
    else if (difficulty === 'hard') maxRolls = 3
    else if (difficulty === 'expert') maxRolls = 4

    const categoryWeights = {
      fossil: 45,
      stone: 25,
      common: 20,
      rare: 10
    }

    const pickaxeType = gs.state.pickaxeSecs > 0 ? (gs.state.pickaxeType || 'standard') : null
    const brushType = gs.state.brushSecs > 0 ? (gs.state.brushType || 'standard') : null

    if (pickaxeType === 'good' || pickaxeType === 'super') {
      const budget = pickaxeType === 'good' ? 500 : 1000
      const affected = [
        { key: 'rare', base: 10 },
        { key: 'common', base: 20 },
        { key: 'stone', base: 25 }
      ]
      let remaining = budget
      for (let i = 0; i < affected.length; i++) {
        const item = affected[i]!
        let added = 0
        if (i === affected.length - 1) {
          added = remaining
        } else {
          added = Math.round(remaining * 0.5)
        }
        categoryWeights[item.key as 'rare' | 'common' | 'stone'] += added
        remaining -= added
      }
    }

    if (brushType === 'good' || brushType === 'super') {
      const budget = brushType === 'good' ? 500 : 1000
      categoryWeights.fossil += budget
    }

    const totalWeight = categoryWeights.fossil + categoryWeights.stone + categoryWeights.common + categoryWeights.rare

    for (let r = 0; r < maxRolls; r++) {
      if (r > 0 && Math.random() >= 0.5) {
        continue // 50% chance for subsequent rolls
      }

      const rand = Math.random() * totalWeight
      let selectedCategory: 'fossil' | 'stone' | 'common' | 'rare' = 'common'
      
      if (rand < categoryWeights.fossil) {
        selectedCategory = 'fossil'
      } else if (rand < categoryWeights.fossil + categoryWeights.stone) {
        selectedCategory = 'stone'
      } else if (rand < categoryWeights.fossil + categoryWeights.stone + categoryWeights.common) {
        selectedCategory = 'common'
      } else {
        selectedCategory = 'rare'
      }

      let rewardName = ''
      let rewardIcon = '💎'

      if (selectedCategory === 'fossil') {
        const pool = loc?.archaeology?.pool || ['kabuto', 'omanyte']
        const selectedPoke = pool[Math.floor(Math.random() * pool.length)]
        if (selectedPoke === 'kabuto') {
          rewardName = 'Fósil Domo'
          rewardIcon = '🛡'
        } else if (selectedPoke === 'omanyte') {
          rewardName = 'Fósil Hélix'
          rewardIcon = '🐚'
        } else {
          rewardName = 'Ámbar Viejo'
          rewardIcon = '💎'
        }
      } else if (selectedCategory === 'stone') {
        const stones = [
          { name: 'Piedra Fuego', icon: '🔥' },
          { name: 'Piedra Agua', icon: '💧' },
          { name: 'Piedra Trueno', icon: '⚡' },
          { name: 'Piedra Hoja', icon: '🌿' },
          { name: 'Piedra Lunar', icon: '🌙' },
          { name: 'Piedra Solar', icon: '☀️' }
        ]
        const stone = stones[Math.floor(Math.random() * stones.length)]!
        rewardName = stone.name
        rewardIcon = stone.icon
      } else if (selectedCategory === 'common') {
        const commons = [
          { name: 'Perla', icon: '⚪' },
          { name: 'Polvo Estelar', icon: '✨' },
          { name: 'Mineral de Carbón', icon: '🪨' },
          { name: 'Mineral de Cobre', icon: '🟫' },
          { name: 'Mineral de Hierro', icon: '🧱' }
        ]
        const item = commons[Math.floor(Math.random() * commons.length)]!
        rewardName = item.name
        rewardIcon = item.icon
      } else {
        const rares = [
          { name: 'Pepita', icon: '🟡' },
          { name: 'Perla Grande', icon: '🔘' },
          { name: 'Trozo Estrella', icon: '⭐' },
          { name: 'Mineral de Plata', icon: '⬜' },
          { name: 'Mineral de Oro', icon: '🟨' },
          { name: 'Mineral de Wolframio', icon: '🌑' },
          { name: 'Mineral de Uranio', icon: '🟢' },
          { name: 'Mineral de Rubí', icon: '🔺' },
          { name: 'Mineral de Zafiro', icon: '🔹' },
          { name: 'Mineral de Esmeralda', icon: '💚' },
          { name: 'Mineral de Topacio', icon: '🟡' },
          { name: 'Mineral de Diamante', icon: '💎' }
        ]
        const item = rares[Math.floor(Math.random() * rares.length)]!
        rewardName = item.name
        rewardIcon = item.icon
      }

      const itemData = SHOP_ITEMS.find(i => i.name.toLowerCase() === rewardName.toLowerCase())
      const itemSprite = itemData ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : rewardIcon

      inventoryStore.addItem(rewardName, 1)
      uiStore.notify(`¡Desenterraste un ${rewardName}!`, itemSprite)
      battleStore.addLog(`¡Desenterraste un <strong style="color:var(--yellow);">${rewardName}</strong>!`, 'log-info', rewardName)
    }
  }

  return {
    currentMap,
    currentMapData,
    region,
    currentEpochHour,
    currentCycle,
    currentSeason,
    currentWeather,
    globalWeather,
    forcedCycle,
    forcedSeason,
    maps,
    activeEvents,
    pendingAwards,
    dailyGuardianCaptures,
    mapWinners,
    setGlobalWeather,
    setGlobalCycle,
    setGlobalSeason,
    navigate,
    triggerArchaeologyRewards
  }
})
