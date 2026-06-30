import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { MapLocation } from '@/types/pokemon/encounters'

interface ArchaeologyRewardData {
  name: string
  type: string
  basePercentage: number
  percentage: number
  baseWeight: number
  activeWeight: number
  addedWeight: number
  baseTotalWeight: number
  activeTotalWeight: number
}

export function useRouteSpawnsArchaeology(
  props: { map: MapLocation; weather: string; cycle: string }
) {
  const gameStore = useGameStore()

  const archaeologyRewards = computed(() => {
    if (!props.map.archaeology?.pool) return []

    const pool = props.map.archaeology.pool
    const rates = props.map.archaeology.rates || []
    const totalRates = rates.reduce((sum, r) => sum + r, 0) || 1

    const baseCategoryWeights = {
      fossil: 45,
      stone: 25,
      common: 20,
      rare: 10
    }

    const activeCategoryWeights = { ...baseCategoryWeights }

    const pickaxeType = (gameStore.state.pickaxeSecs || 0) > 0 ? (gameStore.state.pickaxeType || 'standard') : null
    const brushType = (gameStore.state.brushSecs || 0) > 0 ? (gameStore.state.brushType || 'standard') : null

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
        activeCategoryWeights[item.key as 'rare' | 'common' | 'stone'] += added
        remaining -= added
      }
    }

    if (brushType === 'good' || brushType === 'super') {
      const budget = brushType === 'good' ? 500 : 1000
      activeCategoryWeights.fossil += budget
    }

    const baseTotal = baseCategoryWeights.fossil + baseCategoryWeights.stone + baseCategoryWeights.common + baseCategoryWeights.rare
    const activeTotal = activeCategoryWeights.fossil + activeCategoryWeights.stone + activeCategoryWeights.common + activeCategoryWeights.rare

    const list: Array<{
      name: string
      type: string
      icon: string
      sprite: string
      percentage: number
      basePercentage: number
      statusClass: string
      description?: string
      baseWeight: number
      activeWeight: number
      addedWeight: number
      baseTotalWeight: number
      activeTotalWeight: number
    }> = []

    pool.forEach((id, index) => {
      const rate = rates[index] !== undefined ? rates[index]! : 10
      const relativeRate = rate / totalRates

      const baseFossilPct = relativeRate * baseCategoryWeights.fossil
      const activeFossilPct = relativeRate * activeCategoryWeights.fossil

      let name = 'Ámbar Viejo'
      let icon = '💎'
      let sprite = getAssetUrl(ASSET_TYPES.ITEM, 'old_amber')

      if (id === 'kabuto') {
        name = 'Fósil Domo'
        icon = '🛡'
        sprite = getAssetUrl(ASSET_TYPES.ITEM, 'dome_fossil')
      } else if (id === 'omanyte') {
        name = 'Fósil Hélix'
        icon = '🐚'
        sprite = getAssetUrl(ASSET_TYPES.ITEM, 'helix_fossil')
      }

      const baseW = relativeRate * baseCategoryWeights.fossil
      const activeW = relativeRate * activeCategoryWeights.fossil

      list.push({
        name,
        type: 'Fósil',
        icon,
        sprite,
        percentage: (activeFossilPct / activeTotal) * 100,
        basePercentage: (baseFossilPct / baseTotal) * 100,
        statusClass: 'common',
        baseWeight: baseW,
        activeWeight: activeW,
        addedWeight: activeW - baseW,
        baseTotalWeight: baseTotal,
        activeTotalWeight: activeTotal
      })
    })

    list.push({
      name: 'Piedras Evolutivas',
      type: 'Evolución',
      icon: '⚡',
      sprite: getAssetUrl(ASSET_TYPES.ITEM, 'firestone'),
      percentage: (activeCategoryWeights.stone / activeTotal) * 100,
      basePercentage: (baseCategoryWeights.stone / baseTotal) * 100,
      statusClass: 'visitor',
      description: 'Piedra Fuego, Piedra Agua, Piedra Trueno, Piedra Hoja, Piedra Lunar, Piedra Solar',
      baseWeight: baseCategoryWeights.stone,
      activeWeight: activeCategoryWeights.stone,
      addedWeight: activeCategoryWeights.stone - baseCategoryWeights.stone,
      baseTotalWeight: baseTotal,
      activeTotalWeight: activeTotal
    })

    list.push({
      name: 'Minerales Comunes',
      type: 'Mineral',
      icon: '🪨',
      sprite: getAssetUrl(ASSET_TYPES.ITEM, 'iron_ore'),
      percentage: (activeCategoryWeights.common / activeTotal) * 100,
      basePercentage: (baseCategoryWeights.common / baseTotal) * 100,
      statusClass: 'common',
      description: 'Perla, Polvo Estelar, Carbón, Cobre, Hierro',
      baseWeight: baseCategoryWeights.common,
      activeWeight: activeCategoryWeights.common,
      addedWeight: activeCategoryWeights.common - baseCategoryWeights.common,
      baseTotalWeight: baseTotal,
      activeTotalWeight: activeTotal
    })

    list.push({
      name: 'Gemas y Metales Raros',
      type: 'Valioso',
      icon: '🟡',
      sprite: getAssetUrl(ASSET_TYPES.ITEM, 'diamond_ore'),
      percentage: (activeCategoryWeights.rare / activeTotal) * 100,
      basePercentage: (baseCategoryWeights.rare / baseTotal) * 100,
      statusClass: 'exclusive',
      description: 'Pepita, Perla Grande, Estrella, Plata, Oro, Wolframio, Uranio, Rubí, Zafiro, Esmeralda, Topacio, Diamante',
      baseWeight: baseCategoryWeights.rare,
      activeWeight: activeCategoryWeights.rare,
      addedWeight: activeCategoryWeights.rare - baseCategoryWeights.rare,
      baseTotalWeight: baseTotal,
      activeTotalWeight: activeTotal
    })

    return list
  })

  function getArchaeologySpawnTooltip(reward: ArchaeologyRewardData) {
    const lines: string[] = []

    lines.push(`CÁLCULO DE PROBABILIDAD BASE:`)
    lines.push(`• Peso Base del Grupo: ${reward.baseWeight.toFixed(1)} pts`)
    lines.push(`• Peso Total Base Zona: ${reward.baseTotalWeight.toFixed(1)} pts`)
    lines.push(`• Fórmula Base: (${reward.baseWeight.toFixed(1)} / ${reward.baseTotalWeight.toFixed(1)}) x 100 = ${reward.basePercentage.toFixed(1)}%`)
    lines.push(``)

    lines.push(`CÁLCULO DE PROBABILIDAD REAL:`)
    lines.push(`• Peso Base: ${reward.baseWeight.toFixed(1)} pts`)
    if (reward.addedWeight > 0) {
      lines.push(`• Peso Añadido (Herramienta): +${reward.addedWeight.toFixed(1)} pts`)
    }
    lines.push(`• Peso Total Actual del Grupo: ${reward.activeWeight.toFixed(1)} pts`)
    lines.push(`• Peso Total Acumulado Zona: ${reward.activeTotalWeight.toFixed(1)} pts`)
    lines.push(`• Fórmula Real: (${reward.activeWeight.toFixed(1)} / ${reward.activeTotalWeight.toFixed(1)}) x 100 = ${reward.percentage.toFixed(1)}%`)
    lines.push(``)

    const pickaxeType = gameStore.state.pickaxeSecs > 0 ? gameStore.state.pickaxeType : null
    const brushType = gameStore.state.brushSecs > 0 ? gameStore.state.brushType : null
    if (reward.type === 'Fósil') {
      if (brushType) {
        const names: Record<string, string> = { standard: 'Pincel de excavación', good: 'Pincel Bueno', super: 'Superpincel' }
        const toolName = names[brushType] || 'Pincel de excavación'
        const budget = brushType === 'good' ? 500 : (brushType === 'super' ? 1000 : 0)
        if (budget > 0) {
          lines.push(`• ${toolName} activo: agrega +${budget} pts al peso total de Fósiles.`)
        } else {
          lines.push(`• ${toolName} activo.`)
        }
      }
    } else {
      if (pickaxeType) {
        const names: Record<string, string> = { standard: 'Pico de excavación', good: 'Pico Bueno', super: 'Superpico' }
        const toolName = names[pickaxeType] || 'Pico de excavación'
        const budget = pickaxeType === 'good' ? 500 : (pickaxeType === 'super' ? 1000 : 0)
        if (budget > 0) {
          lines.push(`• ${toolName} activo: agrega +${budget} pts en total (+50% a Raros, +25% a Comunes, +25% a Piedras).`)
        } else {
          lines.push(`• ${toolName} activo.`)
        }
      }
    }
    return {
      title: `DETALLES DE ARQUEOLOGÍA`,
      description: lines.join('\n')
    }
  }

  return {
    archaeologyRewards,
    getArchaeologySpawnTooltip
  }
}
