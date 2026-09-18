import type { ArchaeologyWeights } from '@/logic/utils/archaeologyHelpers.ts'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export interface ArchaeologyRewardData {
  name: string
  type: string
  icon: string
  sprite: string
  basePercentage: number
  percentage: number
  statusClass: string
  description?: string
  baseWeight: number
  activeWeight: number
  addedWeight: number
  baseTotalWeight: number
  activeTotalWeight: number
}

const TOOL_BUDGET_GOOD = 500 as const
const TOOL_BUDGET_SUPER = 1000 as const

const BRUSH_NAMES: Readonly<Record<string, string>> = {
  standard: 'Pincel de excavación',
  good: 'Pincel Bueno',
  super: 'Superpincel'
}

const PICKAXE_NAMES: Readonly<Record<string, string>> = {
  standard: 'Pico de excavación',
  good: 'Pico Bueno',
  super: 'Superpico'
}

function getToolBudget(toolType: string | null): number {
  if (toolType === 'good') return TOOL_BUDGET_GOOD
  if (toolType === 'super') return TOOL_BUDGET_SUPER
  return 0
}

export function buildFossilReward(
  id: string,
  relativeRate: number,
  baseFossilWeight: number,
  activeFossilWeight: number,
  baseTotal: number,
  activeTotal: number
): ArchaeologyRewardData {
  let name = 'Ámbar Viejo'
  let icon = '💎'
  let sprite = getAssetUrl(ASSET_TYPES.ITEM, 'oldamber')

  if (id === 'kabuto') {
    name = 'Fósil Domo'
    icon = '🛡'
    sprite = getAssetUrl(ASSET_TYPES.ITEM, 'domefossil')
  } else if (id === 'omanyte') {
    name = 'Fósil Hélix'
    icon = '🐚'
    sprite = getAssetUrl(ASSET_TYPES.ITEM, 'helixfossil')
  }

  const baseW = relativeRate * baseFossilWeight
  const activeW = relativeRate * activeFossilWeight

  return {
    name,
    type: 'Fósil',
    icon,
    sprite,
    percentage: (activeW / activeTotal) * 100,
    basePercentage: (baseW / baseTotal) * 100,
    statusClass: 'common',
    baseWeight: baseW,
    activeWeight: activeW,
    addedWeight: activeW - baseW,
    baseTotalWeight: baseTotal,
    activeTotalWeight: activeTotal
  }
}

export function buildStaticCategoryRewards(
  baseWeights: ArchaeologyWeights,
  activeWeights: ArchaeologyWeights,
  baseTotal: number,
  activeTotal: number
): ArchaeologyRewardData[] {
  return [
    {
      name: 'Piedras Evolutivas',
      type: 'Evolución',
      icon: '⚡',
      sprite: getAssetUrl(ASSET_TYPES.ITEM, 'firestone'),
      percentage: (activeWeights.stone / activeTotal) * 100,
      basePercentage: (baseWeights.stone / baseTotal) * 100,
      statusClass: 'visitor',
      description: 'Piedra Fuego, Piedra Agua, Piedra Trueno, Piedra Hoja, Piedra Lunar, Piedra Solar',
      baseWeight: baseWeights.stone,
      activeWeight: activeWeights.stone,
      addedWeight: activeWeights.stone - baseWeights.stone,
      baseTotalWeight: baseTotal,
      activeTotalWeight: activeTotal
    },
    {
      name: 'Minerales Comunes',
      type: 'Mineral',
      icon: '🪨',
      sprite: getAssetUrl(ASSET_TYPES.ITEM, 'ironore'),
      percentage: (activeWeights.common / activeTotal) * 100,
      basePercentage: (baseWeights.common / baseTotal) * 100,
      statusClass: 'common',
      description: 'Perla, Polvo Estelar, Carbón, Cobre, Hierro',
      baseWeight: baseWeights.common,
      activeWeight: activeWeights.common,
      addedWeight: activeWeights.common - baseWeights.common,
      baseTotalWeight: baseTotal,
      activeTotalWeight: activeTotal
    },
    {
      name: 'Gemas y Metales Raros',
      type: 'Valioso',
      icon: '🟡',
      sprite: getAssetUrl(ASSET_TYPES.ITEM, 'diamondore'),
      percentage: (activeWeights.rare / activeTotal) * 100,
      basePercentage: (baseWeights.rare / baseTotal) * 100,
      statusClass: 'exclusive',
      description: 'Pepita, Perla Grande, Estrella, Plata, Oro, Wolframio, Uranio, Rubí, Zafiro, Esmeralda, Topacio, Diamante',
      baseWeight: baseWeights.rare,
      activeWeight: activeWeights.rare,
      addedWeight: activeWeights.rare - baseWeights.rare,
      baseTotalWeight: baseTotal,
      activeTotalWeight: activeTotal
    }
  ]
}

export function formatArchaeologyTooltip(
  reward: ArchaeologyRewardData,
  pickaxeType: string | null,
  brushType: string | null
): { title: string; description: string } {
  const lines: string[] = [ // no-domain: Non-domain utility collection or data structure
    'CÁLCULO DE PROBABILIDAD BASE:',
    `• Peso Base del Grupo: ${reward.baseWeight.toFixed(1)} pts`,
    `• Peso Total Base Zona: ${reward.baseTotalWeight.toFixed(1)} pts`,
    `• Fórmula Base: (${reward.baseWeight.toFixed(1)} / ${reward.baseTotalWeight.toFixed(1)}) x 100 = ${reward.basePercentage.toFixed(1)}%`,
    '',
    'CÁLCULO DE PROBABILIDAD REAL:',
    `• Peso Base: ${reward.baseWeight.toFixed(1)} pts`
  ]

  if (reward.addedWeight > 0) {
    lines.push(`• Peso Añadido (Herramienta): +${reward.addedWeight.toFixed(1)} pts`)
  }
  lines.push(`• Peso Total Actual del Grupo: ${reward.activeWeight.toFixed(1)} pts`)
  lines.push(`• Peso Total Acumulado Zona: ${reward.activeTotalWeight.toFixed(1)} pts`)
  lines.push(`• Fórmula Real: (${reward.activeWeight.toFixed(1)} / ${reward.activeTotalWeight.toFixed(1)}) x 100 = ${reward.percentage.toFixed(1)}%`)
  lines.push('')

  if (reward.type === 'Fósil') {
    if (brushType) {
      const toolName = BRUSH_NAMES[brushType] || 'Pincel de excavación'
      const budget = getToolBudget(brushType)
      if (budget > 0) {
        lines.push(`• ${toolName} activo: agrega +${budget} pts al peso total de Fósiles.`)
      } else {
        lines.push(`• ${toolName} activo.`)
      }
    }
  } else if (pickaxeType) {
    const toolName = PICKAXE_NAMES[pickaxeType] || 'Pico de excavación'
    const budget = getToolBudget(pickaxeType)
    if (budget > 0) {
      lines.push(`• ${toolName} activo: agrega +${budget} pts en total (+50% a Raros, +25% a Comunes, +25% a Piedras).`)
    } else {
      lines.push(`• ${toolName} activo.`)
    }
  }

  return {
    title: 'DETALLES DE ARQUEOLOGÍA',
    description: lines.join('\n')
  }
}
